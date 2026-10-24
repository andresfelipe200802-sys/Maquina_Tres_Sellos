import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';

const TOKEN_BYTES = 32;

export function createOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19 * 1024,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Normaliza el nombre visible sin perder acentos ni mayúsculas para mostrar.
 * La clave de unicidad elimina acentos, colapsa espacios y pasa a minúsculas.
 */
export function normalizeName(raw: string): { name: string; nameKey: string } | null {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 40) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M}0-9 .'-]*$/u.test(name)) return null;

  const nameKey = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (nameKey.length < 2) return null;
  return { name, nameKey };
}

export function createRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}
