import { NextResponse } from 'next/server';
import { handleError } from '@/lib/errors';
import { createSession, setSessionCookie, validateCredentials, verifyPassword } from '@/lib/auth';
import { pool } from '@/db/pool';
import { parseJson } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const { email, password } = validateCredentials(await parseJson(req));
    const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
      return NextResponse.json({ error: 'Email or password is incorrect' }, { status: 401 });
    }
    setSessionCookie(await createSession(rows[0].id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}