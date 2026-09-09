/**
 * The client side of the API: helpers the frontend uses to call the endpoints.
 *
 * Don't confuse this with `app/api/`, which is the other side of the same
 * boundary - the route handlers that *implement* those endpoints. This file
 * only ever talks to them over HTTP.
 *
 * The shapes these helpers return live in `lib/types.ts`, shared with the
 * handlers that produce them.
 */
import type { Restaurant, Visit } from './types';

export type User = { id: number; email: string; displayName: string };

// We read a base URL from the environment because Server Components fetch on
// the server, where relative URLs don't resolve - so we need an absolute origin.
// It's the same app on the same port, so this is normally just localhost:3000.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Fetch every restaurant from the API.
 *
 * NOTE: this is a bare fetch with no error handling. It does not check the
 * response status and it does not catch network failures - callers get whatever
 * `res.json()` produces, including on a 500.
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  const res = await fetch(`${API_URL}/api/restaurants`, { cache: 'no-store' });
  return res.json();
}

/**
 * Fetch a single restaurant by id.
 */
export async function getRestaurant(id: number | string): Promise<Restaurant> {
  const res = await fetch(`${API_URL}/api/restaurants/${id}`, { cache: 'no-store' });
  return res.json();
}

export async function createVisit(input: {
  restaurantId: number;
  date: string;
  amountSpent: number | null;
  notes: string | null;
}): Promise<Visit> {
  const res = await fetch(`${API_URL}/api/visits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Unable to record visit');
  return body;
}

export async function createRestaurant(input: {
  name: string;
  cuisine: string | null;
  address: string | null;
  rating: number | null;
}): Promise<Restaurant> {
  const res = await fetch(`${API_URL}/api/restaurants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Unable to add restaurant');
  return body;
}

export async function authenticate(path: 'login' | 'register', input: Record<string, string>): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Unable to authenticate');
}
