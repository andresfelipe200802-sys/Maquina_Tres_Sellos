import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';
import type { ServerConfig } from '../src/config.js';
import { Hub } from '../src/Hub.js';
import { RoundService } from '../src/RoundService.js';
import { MemoryStore } from '../src/store/MemoryStore.js';

const ORIGIN = 'http://localhost:5173';

interface Message {
  type: string;
  [key: string]: unknown;
}

async function waitForMessage(
  socket: WebSocket,
  predicate: (message: Message) => boolean,
  timeoutMs = 4_000,
): Promise<Message> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', handler);
      reject(new Error('Tiempo de espera agotado esperando mensaje WS.'));
    }, timeoutMs);
    const handler = (raw: WebSocket.RawData): void => {
      const message = JSON.parse(raw.toString()) as Message;
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', handler);
      resolve(message);
    };
    socket.on('message', handler);
  });
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('No se pudo abrir WebSocket.')), 3_000);
    socket.once('open', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

describe('E2E HTTP + WebSocket', () => {
  let baseUrl = '';
  let wsUrl = '';
  let service: RoundService;
  let hub: Hub;
  let server: ReturnType<typeof createApp>['server'];
  let store: MemoryStore;

  before(async () => {
    const config: ServerConfig = {
      port: 0,
      clientOrigins: [ORIGIN],
      instructorUser: 'instructor',
      instructorPassword: 'ClaveE2E123*',
      databaseUrl: null,
      dbSsl: false,
      maxPlayers: 45,
      roundSeconds: 900,
      disconnectGraceSeconds: 10,
      isProduction: false,
      sessionTtlSeconds: 3600,
    };
    store = new MemoryStore();
    await store.init();
    service = new RoundService(store, config);
    await service.seedInstructor();
    const bundle = createApp(service, config);
    server = bundle.server;
    hub = new Hub(server, service, config);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    wsUrl = `ws://127.0.0.1:${address.port}/ws`;
  });

  after(async () => {
    hub.close();
    service.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store.close?.();
  });

  it('completa el ciclo de 45 aprendices, congelamiento y expulsión', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/instructor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ username: 'instructor', password: 'ClaveE2E123*' }),
    });
    assert.equal(loginResponse.status, 200);
    const login = (await loginResponse.json()) as { token: string; instructor: { id: number } };
    const authHeaders = {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Authorization: `Bearer ${login.token}`,
    };

    const roundResponse = await fetch(`${baseUrl}/api/instructor/rounds`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(roundResponse.status, 201);
    const { round } = (await roundResponse.json()) as {
      round: { id: number; code: string; maxPlayers: number };
    };
    assert.equal(round.maxPlayers, 45);

    const joined: { token: string; player: { id: number; name: string } }[] = [];
    for (let index = 0; index < 45; index += 1) {
      const response = await fetch(`${baseUrl}/api/players/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        body: JSON.stringify({ name: `Aprendiz ${String(index + 1).padStart(2, '0')}` }),
      });
      assert.equal(response.status, 201, `ingreso ${index + 1}`);
      joined.push((await response.json()) as (typeof joined)[number]);
    }

    const overflow = await fetch(`${baseUrl}/api/players/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ name: 'Aprendiz 46' }),
    });
    assert.equal(overflow.status, 409);

    const playerSocket = await openSocket(wsUrl);
    const authMessage = waitForMessage(playerSocket, (message) => message.type === 'auth.ok');
    playerSocket.send(JSON.stringify({ type: 'auth', role: 'player', token: joined[0]?.token }));
    const auth = await authMessage;
    assert.equal((auth['player'] as { name: string }).name, 'Aprendiz 01');

    const roundState = waitForMessage(
      playerSocket,
      (message) => message.type === 'round.state',
    );
    const startResponse = await fetch(
      `${baseUrl}/api/instructor/rounds/${round.id}/start`,
      { method: 'POST', headers: authHeaders },
    );
    assert.equal(startResponse.status, 200);
    const started = await roundState;
    assert.equal((started['round'] as { status: string }).status, 'EN_JUEGO');

    const lateJoin = await fetch(`${baseUrl}/api/players/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ name: 'Aprendiz Tardío' }),
    });
    assert.equal(lateJoin.status, 409);

    const frozenState = waitForMessage(
      playerSocket,
      (message) =>
        message.type === 'round.state' &&
        (message['round'] as { status: string }).status === 'CONGELADA',
    );
    const freezeResponse = await fetch(
      `${baseUrl}/api/instructor/rounds/${round.id}/freeze`,
      { method: 'POST', headers: authHeaders, body: JSON.stringify({ frozen: true }) },
    );
    assert.equal(freezeResponse.status, 200);
    await frozenState;

    const instructorSocket = await openSocket(wsUrl);
    const snapshotPromise = waitForMessage(
      instructorSocket,
      (message) => message.type === 'snapshot' && message['round'] !== null,
    );
    instructorSocket.send(
      JSON.stringify({ type: 'auth', role: 'instructor', token: login.token }),
    );
    const snapshot = await snapshotPromise;
    assert.equal((snapshot['players'] as unknown[]).length, 45);

    const kicked = waitForMessage(
      playerSocket,
      (message) => message.type === 'player.kicked',
    );
    const kickResponse = await fetch(
      `${baseUrl}/api/instructor/players/${joined[0]?.player.id}/kick`,
      { method: 'POST', headers: authHeaders },
    );
    assert.equal(kickResponse.status, 200);
    await kicked;

    playerSocket.close();
    instructorSocket.close();
  });

  it('bloquea y explica la recarga del aprendiz durante la partida', async () => {
    const loginResponse = await fetch(`${baseUrl}/api/instructor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ username: 'instructor', password: 'ClaveE2E123*' }),
    });
    const login = (await loginResponse.json()) as { token: string };
    const authHeaders = {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Authorization: `Bearer ${login.token}`,
    };

    const activeResponse = await fetch(`${baseUrl}/api/instructor/me`, {
      headers: authHeaders,
    });
    const active = (await activeResponse.json()) as {
      round: { id: number } | null;
    };
    if (active.round) {
      await fetch(`${baseUrl}/api/instructor/rounds/${active.round.id}/finish`, {
        method: 'POST',
        headers: authHeaders,
      });
    }

    const roundResponse = await fetch(`${baseUrl}/api/instructor/rounds`, {
      method: 'POST',
      headers: authHeaders,
    });
    const { round } = (await roundResponse.json()) as { round: { id: number } };
    const joinResponse = await fetch(`${baseUrl}/api/players/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      body: JSON.stringify({ name: 'Aprendiz Recarga' }),
    });
    const joined = (await joinResponse.json()) as { token: string };

    const firstSocket = await openSocket(wsUrl);
    const authPromise = waitForMessage(firstSocket, (message) => message.type === 'auth.ok');
    firstSocket.send(
      JSON.stringify({ type: 'auth', role: 'player', token: joined.token }),
    );
    await authPromise;

    const liveState = waitForMessage(
      firstSocket,
      (message) => message.type === 'round.state',
    );
    await fetch(`${baseUrl}/api/instructor/rounds/${round.id}/start`, {
      method: 'POST',
      headers: authHeaders,
    });
    await liveState;

    // Simula la recarga: el WebSocket anterior se cierra y el aprendiz
    // intenta autenticarse de nuevo con el mismo token.
    firstSocket.close();
    let status = '';
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const playerResponse = await fetch(`${baseUrl}/api/players/me`, {
        headers: { Origin: ORIGIN, Authorization: `Bearer ${joined.token}` },
      });
      const player = (await playerResponse.json()) as { player: { status: string } };
      status = player.player.status;
      if (status === 'BLOQUEADO') break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(status, 'BLOQUEADO');

    const secondSocket = await openSocket(wsUrl);
    const errorPromise = waitForMessage(secondSocket, (message) => message.type === 'error');
    secondSocket.send(
      JSON.stringify({ type: 'auth', role: 'player', token: joined.token }),
    );
    const error = await errorPromise;
    assert.equal(error['code'], 'PLAYER_BLOCKED');
    assert.match(String(error['message']), /saliste de la pantalla/i);
    secondSocket.close();
  });
});
