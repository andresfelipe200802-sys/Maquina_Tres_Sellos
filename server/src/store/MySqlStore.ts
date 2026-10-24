import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import type {
  GameEvent,
  GameEventType,
  Instructor,
  InstructorSession,
  Player,
  Round,
} from '../types.js';
import type { CreatePlayerInput, CreateRoundInput, Store } from './Store.js';
import { StoreConflict } from './Store.js';

type InstructorRow = RowDataPacket & {
  id: number;
  usuario: string;
  password_hash: string;
  nombre_completo: string;
  estado: Instructor['status'];
};

type SessionRow = RowDataPacket & {
  id: number;
  instructor_id: number;
  token_hash: string;
  expira_en: Date;
  revocada: number;
};

type RoundRow = RowDataPacket & {
  id: number;
  codigo_sala: string;
  instructor_id: number;
  estado: Round['status'];
  max_aprendices: number;
  duracion_segundos: number;
  creada_en: Date;
  inicia_en: Date | null;
  termina_en: Date | null;
  congelada_en: Date | null;
  finalizada_en: Date | null;
};

type PlayerRow = RowDataPacket & {
  id: number;
  ronda_id: number;
  nombre: string;
  nombre_clave: string;
  token_hash: string;
  estado: Player['status'];
  movimientos: number;
  fallos: number;
  coincidencias: number;
  tiempo_restante: number;
  conectado_en: Date | null;
  ultimo_latido: Date | null;
  desconectado_en: Date | null;
  expulsado_en: Date | null;
  creado_en: Date;
};

type EventRow = RowDataPacket & {
  id: number;
  ronda_id: number;
  jugador_id: number | null;
  tipo: GameEventType;
  detalle_json: unknown;
  creado_en: Date;
};

function ms(value: Date | null): number | null {
  return value ? value.getTime() : null;
}

function toDate(value: number | null): Date | null {
  return value === null ? null : new Date(value);
}

function mapRound(row: RoundRow): Round {
  return {
    id: row.id,
    code: row.codigo_sala,
    instructorId: row.instructor_id,
    status: row.estado,
    maxPlayers: row.max_aprendices,
    durationSeconds: row.duracion_segundos,
    createdAt: row.creada_en.getTime(),
    startedAt: ms(row.inicia_en),
    deadlineAt: ms(row.termina_en),
    frozenAt: ms(row.congelada_en),
    finishedAt: ms(row.finalizada_en),
  };
}

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    roundId: row.ronda_id,
    name: row.nombre,
    nameKey: row.nombre_clave,
    tokenHash: row.token_hash,
    status: row.estado,
    moves: row.movimientos,
    fails: row.fallos,
    matched: row.coincidencias,
    timeLeft: row.tiempo_restante,
    connectedAt: ms(row.conectado_en),
    lastSeen: ms(row.ultimo_latido),
    disconnectedAt: ms(row.desconectado_en),
    kickedAt: ms(row.expulsado_en),
    createdAt: row.creado_en.getTime(),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}

/**
 * Persistencia MySQL 8. Usa consultas preparadas y transacción con bloqueo
 * de fila para impedir que dos aprendices simultáneos superen el cupo.
 */
export class MySqlStore implements Store {
  private readonly pool: Pool;

  public constructor(databaseUrl: string, useSsl: boolean) {
    this.pool = mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60_000,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: 'Z',
      ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
    });
  }

  public async init(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async seedInstructor(
    username: string,
    passwordHash: string,
    displayName: string,
  ): Promise<Instructor> {
    const existing = await this.findInstructorByUsername(username);
    if (existing) {
      await this.pool.execute(
        'UPDATE instructores SET password_hash = ?, nombre_completo = ? WHERE id = ?',
        [passwordHash, displayName, existing.id],
      );
      return { ...existing, passwordHash, displayName };
    }
    const [result] = await this.pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO instructores (usuario, password_hash, nombre_completo) VALUES (?, ?, ?)',
      [username, passwordHash, displayName],
    );
    return {
      id: result.insertId,
      username,
      passwordHash,
      displayName,
      status: 'ACTIVO',
    };
  }

  public async findInstructorByUsername(username: string): Promise<Instructor | null> {
    const [rows] = await this.pool.execute<InstructorRow[]>(
      'SELECT id, usuario, password_hash, nombre_completo, estado FROM instructores WHERE usuario = ? LIMIT 1',
      [username],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.usuario,
      passwordHash: row.password_hash,
      displayName: row.nombre_completo,
      status: row.estado,
    };
  }

  public async findInstructorById(id: number): Promise<Instructor | null> {
    const [rows] = await this.pool.execute<InstructorRow[]>(
      'SELECT id, usuario, password_hash, nombre_completo, estado FROM instructores WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      username: row.usuario,
      passwordHash: row.password_hash,
      displayName: row.nombre_completo,
      status: row.estado,
    };
  }

  public async updateInstructorLastAccess(id: number, at: number): Promise<void> {
    await this.pool.execute('UPDATE instructores SET ultimo_acceso = ? WHERE id = ?', [
      new Date(at),
      id,
    ]);
  }

  public async createInstructorSession(
    instructorId: number,
    tokenHash: string,
    expiresAt: number,
  ): Promise<InstructorSession> {
    const [result] = await this.pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO sesiones_instructor (instructor_id, token_hash, expira_en) VALUES (?, ?, ?)',
      [instructorId, tokenHash, new Date(expiresAt)],
    );
    return { id: result.insertId, instructorId, tokenHash, expiresAt, revoked: false };
  }

  public async findInstructorSessionByHash(tokenHash: string): Promise<InstructorSession | null> {
    const [rows] = await this.pool.execute<SessionRow[]>(
      'SELECT id, instructor_id, token_hash, expira_en, revocada FROM sesiones_instructor WHERE token_hash = ? LIMIT 1',
      [tokenHash],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      instructorId: row.instructor_id,
      tokenHash: row.token_hash,
      expiresAt: row.expira_en.getTime(),
      revoked: row.revocada === 1,
    };
  }

  public async revokeInstructorSession(id: number): Promise<void> {
    await this.pool.execute('UPDATE sesiones_instructor SET revocada = 1 WHERE id = ?', [id]);
  }

  public async createRound(input: CreateRoundInput): Promise<Round> {
    try {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(
        `INSERT INTO rondas
          (codigo_sala, instructor_id, max_aprendices, duracion_segundos, creada_en)
         VALUES (?, ?, ?, ?, ?)`,
        [input.code, input.instructorId, input.maxPlayers, input.durationSeconds, new Date(input.now)],
      );
      return {
        id: result.insertId,
        code: input.code,
        instructorId: input.instructorId,
        status: 'ABIERTA',
        maxPlayers: input.maxPlayers,
        durationSeconds: input.durationSeconds,
        createdAt: input.now,
        startedAt: null,
        deadlineAt: null,
        frozenAt: null,
        finishedAt: null,
      };
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new StoreConflict('ROOM_CODE_TAKEN', 'El código de sala ya existe.');
      }
      throw error;
    }
  }

  public async getActiveRound(): Promise<Round | null> {
    const [rows] = await this.pool.query<RoundRow[]>(
      "SELECT * FROM rondas WHERE estado <> 'FINALIZADA' ORDER BY id DESC LIMIT 1",
    );
    const row = rows[0];
    return row ? mapRound(row) : null;
  }

  public async getLatestRound(): Promise<Round | null> {
    const [rows] = await this.pool.query<RoundRow[]>(
      'SELECT * FROM rondas ORDER BY id DESC LIMIT 1',
    );
    const row = rows[0];
    return row ? mapRound(row) : null;
  }

  public async getRoundById(id: number): Promise<Round | null> {
    const [rows] = await this.pool.execute<RoundRow[]>(
      'SELECT * FROM rondas WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows[0];
    return row ? mapRound(row) : null;
  }

  public async updateRound(round: Round): Promise<void> {
    await this.pool.execute(
      `UPDATE rondas
       SET estado = ?, inicia_en = ?, termina_en = ?, congelada_en = ?, finalizada_en = ?
       WHERE id = ?`,
      [
        round.status,
        toDate(round.startedAt),
        toDate(round.deadlineAt),
        toDate(round.frozenAt),
        toDate(round.finishedAt),
        round.id,
      ],
    );
  }

  public async createPlayer(input: CreatePlayerInput): Promise<Player> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [roundRows] = await connection.execute<RoundRow[]>(
        'SELECT * FROM rondas WHERE id = ? FOR UPDATE',
        [input.roundId],
      );
      const round = roundRows[0];
      if (!round) {
        throw new StoreConflict('ROUND_NOT_FOUND', 'La ronda no existe.');
      }
      if (round.estado !== 'ABIERTA') {
        throw new StoreConflict('ROUND_STARTED', 'La ronda ya no admite ingresos.');
      }
      const [countRows] = await connection.execute<(RowDataPacket & { total: number })[]>(
        'SELECT COUNT(*) AS total FROM jugadores WHERE ronda_id = ?',
        [input.roundId],
      );
      const total = Number(countRows[0]?.total ?? 0);
      if (total >= round.max_aprendices) {
        throw new StoreConflict('ROOM_FULL', 'La sala alcanzó el cupo máximo.');
      }

      const [result] = await connection.execute<mysql.ResultSetHeader>(
        `INSERT INTO jugadores
          (ronda_id, nombre, nombre_clave, token_hash, estado, tiempo_restante,
           conectado_en, ultimo_latido, creado_en)
         VALUES (?, ?, ?, ?, 'EN_ESPERA', ?, ?, ?, ?)`,
        [
          input.roundId,
          input.name,
          input.nameKey,
          input.tokenHash,
          round.duracion_segundos,
          new Date(input.now),
          new Date(input.now),
          new Date(input.now),
        ],
      );
      await connection.commit();
      return {
        id: result.insertId,
        roundId: input.roundId,
        name: input.name,
        nameKey: input.nameKey,
        tokenHash: input.tokenHash,
        status: 'EN_ESPERA',
        moves: 0,
        fails: 0,
        matched: 0,
        timeLeft: round.duracion_segundos,
        connectedAt: input.now,
        lastSeen: input.now,
        disconnectedAt: null,
        kickedAt: null,
        createdAt: input.now,
      };
    } catch (error) {
      await connection.rollback();
      if (isDuplicateKey(error)) {
        throw new StoreConflict('NAME_TAKEN', 'Ese nombre ya está en uso en esta ronda.');
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  public async findPlayerById(id: number): Promise<Player | null> {
    const [rows] = await this.pool.execute<PlayerRow[]>(
      'SELECT * FROM jugadores WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows[0];
    return row ? mapPlayer(row) : null;
  }

  public async findPlayerByTokenHash(tokenHash: string): Promise<Player | null> {
    const [rows] = await this.pool.execute<PlayerRow[]>(
      'SELECT * FROM jugadores WHERE token_hash = ? LIMIT 1',
      [tokenHash],
    );
    const row = rows[0];
    return row ? mapPlayer(row) : null;
  }

  public async listPlayers(roundId: number): Promise<Player[]> {
    const [rows] = await this.pool.execute<PlayerRow[]>(
      'SELECT * FROM jugadores WHERE ronda_id = ? ORDER BY id ASC',
      [roundId],
    );
    return rows.map(mapPlayer);
  }

  public async updatePlayer(player: Player): Promise<void> {
    await this.pool.execute(
      `UPDATE jugadores
       SET estado = ?, movimientos = ?, fallos = ?, coincidencias = ?, tiempo_restante = ?,
           conectado_en = ?, ultimo_latido = ?, desconectado_en = ?, expulsado_en = ?
       WHERE id = ?`,
      [
        player.status,
        player.moves,
        player.fails,
        player.matched,
        Math.max(0, Math.round(player.timeLeft)),
        toDate(player.connectedAt),
        toDate(player.lastSeen),
        toDate(player.disconnectedAt),
        toDate(player.kickedAt),
        player.id,
      ],
    );
  }

  public async appendEvent(
    roundId: number,
    playerId: number | null,
    type: GameEventType,
    detail: Record<string, unknown> | null,
    now: number,
  ): Promise<GameEvent> {
    const [result] = await this.pool.execute<mysql.ResultSetHeader>(
      'INSERT INTO eventos_juego (ronda_id, jugador_id, tipo, detalle_json, creado_en) VALUES (?, ?, ?, ?, ?)',
      [roundId, playerId, type, detail ? JSON.stringify(detail) : null, new Date(now)],
    );
    return { id: result.insertId, roundId, playerId, type, detail, createdAt: now };
  }

  /** Cierra una conexión usada por una transacción auxiliar. */
  public async withConnection<T>(task: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      return await task(connection);
    } finally {
      connection.release();
    }
  }
}

export function mapEvent(row: EventRow): GameEvent {
  return {
    id: row.id,
    roundId: row.ronda_id,
    playerId: row.jugador_id,
    type: row.tipo,
    detail:
      row.detalle_json && typeof row.detalle_json === 'object'
        ? (row.detalle_json as Record<string, unknown>)
        : null,
    createdAt: row.creado_en.getTime(),
  };
}
