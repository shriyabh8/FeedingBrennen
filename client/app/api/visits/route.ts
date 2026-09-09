import { NextResponse } from 'next/server';
import { pool } from '@/db/pool';
import { handleError } from '@/lib/errors';
import { toVisit } from '@/lib/types';
import { parseJson, visitInput } from '@/lib/validation';
import { requireUser } from '@/lib/auth';

const visitColumns = `
  id, "restaurantId", date, "amountSpent", notes, created_at AS "createdAt"
`;

export async function GET() {
  try {
    const user = await requireUser();
    const { rows } = await pool.query(
      `SELECT ${visitColumns} FROM visits WHERE "ownerId" = $1 ORDER BY date DESC, id DESC`,
      [user.id]
    );
    return NextResponse.json(rows.map(toVisit));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = visitInput(await parseJson(req));
    const restaurant = await pool.query('SELECT id FROM restaurants WHERE id = $1 AND "ownerId" = $2', [input.restaurantId, user.id]);
    if (restaurant.rowCount === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    const { rows } = await pool.query(
      `INSERT INTO visits ("restaurantId", date, "amountSpent", notes, "ownerId")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${visitColumns}`,
      [input.restaurantId, input.date, input.amountSpent, input.notes, user.id]
    );
    return NextResponse.json(toVisit(rows[0]), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}