import crypto from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { pool } from '@/db/pool';
import { ApiError } from '@/lib/errors';

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'feeding_brennen_session';

export type CurrentUser = { id: number; email: string; displayName: string };

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey);
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (token, "userId", expires_at)
     VALUES ($1, $2, now() + interval '30 days')`,
    [token, userId]
  );
  return token;
}

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.display_name AS "displayName"
     FROM sessions s JOIN users u ON u.id = s."userId"
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  return rows[0] || null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) throw new ApiError(401, 'Please sign in to continue');
  return user;
}

export function validateCredentials(body: unknown): { email: string; password: string; displayName?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }
  const input = body as Record<string, unknown>;
  if (typeof input.email !== 'string' || !/^\S+@\S+\.\S+$/.test(input.email)) {
    throw new ApiError(400, 'A valid email is required');
  }
  if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 200) {
    throw new ApiError(400, 'Password must be between 8 and 200 characters');
  }
  if (input.displayName !== undefined && (typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.length > 80)) {
    throw new ApiError(400, 'displayName must be between 1 and 80 characters');
  }
  return { email: input.email.trim().toLowerCase(), password: input.password, displayName: input.displayName?.toString().trim() };
}