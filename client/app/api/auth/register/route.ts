import { NextResponse } from 'next/server';
import { handleError } from '@/lib/errors';
import { createSession, hashPassword, setSessionCookie, validateCredentials } from '@/lib/auth';
import { pool } from '@/db/pool';
import { parseJson } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const input = validateCredentials(await parseJson(req));
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3) RETURNING id`,
      [input.email, input.displayName || input.email.split('@')[0], await hashPassword(input.password)]
    );
    setSessionCookie(await createSession(rows[0].id));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}