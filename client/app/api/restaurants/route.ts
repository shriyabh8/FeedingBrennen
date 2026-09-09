import { NextResponse } from 'next/server';
import { pool } from '@/db/pool';
import { handleError } from '@/lib/errors';
import { toRestaurant } from '@/lib/types';
import { parseJson, restaurantInput } from '@/lib/validation';
import { requireUser } from '@/lib/auth';

/**
 * GET /api/restaurants
 * Returns all restaurants.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const { rows } = await pool.query(
      'SELECT id, name, cuisine, address, rating, created_at AS "createdAt" FROM restaurants WHERE "ownerId" = $1 ORDER BY created_at DESC',
      [user.id]
    );
    // Map every row - raw rows don't match the contract (NUMERIC comes back
    // as a string, timestamps as Date objects). See lib/types.ts.
    return NextResponse.json(rows.map(toRestaurant));
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/restaurants
 * Create a new restaurant.
 *
 * TODO (A2): implement. Read the restaurant fields from the request body,
 * insert a row, and return the created restaurant with a 201 status.
 *
 * TODO (A3): validate before you insert. Nothing validates anything today, so
 * `rating` happily accepts 6. Decide what valid means for each field and reject
 * bad bodies with a 400 rather than letting them reach the database.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const input = restaurantInput(await parseJson(req));
    const { rows } = await pool.query(
      `INSERT INTO restaurants (name, cuisine, address, rating, "ownerId")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, cuisine, address, rating, created_at AS "createdAt"`,
      [input.name, input.cuisine, input.address, input.rating, user.id]
    );

    return NextResponse.json(toRestaurant(rows[0]), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
