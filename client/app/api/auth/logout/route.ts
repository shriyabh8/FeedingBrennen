import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { pool } from '@/db/pool';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const token = cookies().get('feeding_brennen_session')?.value;
  if (token) await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}