import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { ServerConfig } from '../src/config.js';
import { RoundService } from '../src/RoundService.js';
import { MemoryStore } from '../src/store/MemoryStore.js';

function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 0,
    clientOrigins: ['http://localhost:5173'],
    instructorUser: 'instructor',
    instructorPassword: 'ClaveDePrueba123*',
    databaseUrl: null,
    dbSsl: false,
    maxPlayers: 45,
    roundSeconds: 900,
    disconnectGraceSeconds: 10,
    isProduction: false,
    sessionTtlSeconds: 3600,
    ...overrides,
  };
}

async function makeService(overrides: Partial<ServerConfig> = {}): Promise<{
  service: RoundService;
  config: ServerConfig;
}> {
  const config = makeConfig(overrides);
  const service = new RoundService(new MemoryStore(), config);
  await service.seedInstructor();
  return { service, config };
}

const services: RoundService[] = [];
afterEach(() => {
  for (const service of services.splice(0)) service.close();
});

describe('RoundService', () => {
  it('autentica al instructor y rechaza credenciales inválidas', async () => {
    const { service } = await makeService();
    services.push(service);

    await assert.rejects(() => service.login('instructor', 'incorrecta'), /Usuario o contraseña/);
    const login = await service.login('INSTRUCTOR', 'ClaveDePrueba123*');
    assert.ok(login.token.length >= 32);
    const auth = await service.authenticate(login.token);
    assert.equal(auth.instructor.username, 'instructor');

    await service.logout(login.token);
    await assert.rejects(() => service.authenticate(login.token), /sesión expiró/i);
  });

  it('aplica cupo, nombres únicos y cierre de ingresos al iniciar', async () => {
    const { service } = await makeService({ maxPlayers: 2 });
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');

    await assert.rejects(() => service.join('Ana'), /ronda abierta/i);

    const round = await service.createRound(login.instructor.id);
    const ana = await service.join('  Ana   María ');
    assert.equal(ana.player.name, 'Ana María');
    await assert.rejects(() => service.join('ana maria'), /ya está en uso/i);
    await service.join('Luis');

    await assert.rejects(() => service.join('Carlos'), /cupo máximo/i);

    await service.startRound(round.id, login.instructor.id);
    await assert.rejects(() => service.join('Carlos'), /ya inició/i);

    const dashboard = await service.dashboard(login.instructor.id);
    assert.equal(dashboard.players.length, 2);
    assert.ok(dashboard.players.every((player) => player.status === 'JUGANDO'));
  });

  it('expulsa y permite el mismo nombre solo en una ronda nueva', async () => {
    const { service } = await makeService();
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');
    const round = await service.createRound(login.instructor.id);
    const joined = await service.join('Laura');

    await service.kickPlayer(joined.player.id, login.instructor.id);
    await assert.rejects(() => service.markConnected(joined.token), /retiró tu acceso/i);
    await assert.rejects(() => service.join('Laura'), /ya está en uso/i);

    await service.finishRound(round.id, login.instructor.id);
    await service.createRound(login.instructor.id);
    const rejoined = await service.join('Laura');
    assert.notEqual(rejoined.player.id, joined.player.id);
  });

  it('bloquea al aprendiz tras la ventana de reconexión', async () => {
    const { service } = await makeService({ disconnectGraceSeconds: 1 });
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');
    const round = await service.createRound(login.instructor.id);
    const joined = await service.join('Mateo');
    await service.startRound(round.id, login.instructor.id);

    await service.markDisconnected(joined.player.id);
    const state = await service.playerState(joined.token);
    assert.equal(state.player.status, 'DESCONECTADO');

    await new Promise((resolve) => setTimeout(resolve, 1_150));
    await service.tick();
    const blocked = await service.playerState(joined.token);
    assert.equal(blocked.player.status, 'BLOQUEADO');
    await assert.rejects(() => service.markConnected(joined.token), /bloqueado/i);
  });

  it('permite reconectar dentro de la ventana de gracia', async () => {
    const { service } = await makeService({ disconnectGraceSeconds: 5 });
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');
    const round = await service.createRound(login.instructor.id);
    const joined = await service.join('Sofía');
    await service.startRound(round.id, login.instructor.id);

    await service.markDisconnected(joined.player.id);
    const resumed = await service.markConnected(joined.token);
    assert.equal(resumed.player.status, 'JUGANDO');
    assert.equal(resumed.player.connected, true);
  });

  it('congela y reanuda extendiendo el plazo autoritativo', async () => {
    const { service } = await makeService();
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');
    const round = await service.createRound(login.instructor.id);
    await service.join('Nicolás');
    const started = await service.startRound(round.id, login.instructor.id);
    const originalDeadline = started.deadlineAt;
    assert.ok(originalDeadline);

    await service.setFrozen(round.id, login.instructor.id, true);
    const frozen = await service.getPublicRound(round.id);
    assert.equal(frozen?.status, 'CONGELADA');
    assert.equal(frozen?.deadlineAt, originalDeadline);

    await new Promise((resolve) => setTimeout(resolve, 40));
    const resumed = await service.setFrozen(round.id, login.instructor.id, false);
    assert.equal(resumed.status, 'EN_JUEGO');
    assert.ok((resumed.deadlineAt ?? 0) > originalDeadline);
  });

  it('finaliza por tiempo agotado y bloquea a quienes no calibraron', async () => {
    const { service } = await makeService({ roundSeconds: 60 });
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');
    const round = await service.createRound(login.instructor.id);
    await service.join('Valentina');
    const started = await service.startRound(round.id, login.instructor.id);

    await service.tick((started.deadlineAt ?? 0) + 1);
    const finished = await service.getPublicRound(round.id);
    assert.equal(finished?.status, 'FINALIZADA');
    const dashboard = await service.dashboard(login.instructor.id);
    assert.equal(dashboard.players[0]?.status, 'BLOQUEADO');
    assert.equal(dashboard.players[0]?.timeLeft, 0);
  });

  it('sanea la telemetría y registra la calibración', async () => {
    const { service } = await makeService();
    services.push(service);
    const login = await service.login('instructor', 'ClaveDePrueba123*');
    const round = await service.createRound(login.instructor.id);
    const joined = await service.join('Diego');
    await service.startRound(round.id, login.instructor.id);

    await service.telemetry(joined.token, {
      moves: -10,
      fails: 2,
      matched: 99,
      timeLeft: 1,
      state: 'JUGANDO',
    });
    await service.telemetry(joined.token, {
      moves: 7,
      fails: 1,
      matched: 4,
      timeLeft: 1,
      state: 'RESUELTO',
    });

    const state = await service.playerState(joined.token);
    assert.equal(state.player.moves, 7);
    assert.equal(state.player.fails, 2);
    assert.equal(state.player.matched, 16);
    assert.equal(state.player.status, 'CALIBRADO');
  });
});
