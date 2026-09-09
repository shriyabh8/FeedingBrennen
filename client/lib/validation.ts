import { ApiError } from './errors';

type RestaurantInput = {
  name: string;
  cuisine: string | null;
  address: string | null;
  rating: number | null;
};

export function positiveInteger(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new ApiError(404, 'Restaurant not found');
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ApiError(404, 'Restaurant not found');
  }

  return id;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 500) {
    throw new ApiError(400, `${field} must be a string with at most 500 characters`);
  }
  return value.trim() || null;
}

export function restaurantInput(body: unknown): RestaurantInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 200) {
    throw new ApiError(400, 'name is required and must be at most 200 characters');
  }

  let rating: number | null = null;
  if (input.rating !== undefined && input.rating !== null) {
    if (typeof input.rating !== 'number' || !Number.isFinite(input.rating) || input.rating < 0 || input.rating > 5) {
      throw new ApiError(400, 'rating must be a number between 0 and 5');
    }
    rating = input.rating;
  }

  return {
    name: input.name.trim(),
    cuisine: optionalText(input.cuisine, 'cuisine'),
    address: optionalText(input.address, 'address'),
    rating,
  };
}

export function visitInput(body: unknown): {
  restaurantId: number;
  date: string;
  amountSpent: number | null;
  notes: string | null;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'Request body must be a JSON object');
  }

  const input = body as Record<string, unknown>;
  if (typeof input.restaurantId !== 'number' || !Number.isSafeInteger(input.restaurantId) || input.restaurantId < 1) {
    throw new ApiError(400, 'restaurantId must be a positive integer');
  }
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new ApiError(400, 'date must use YYYY-MM-DD format');
  }

  const parsedDate = new Date(`${input.date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.date) {
    throw new ApiError(400, 'date must be a real calendar date');
  }

  let amountSpent: number | null = null;
  if (input.amountSpent !== undefined && input.amountSpent !== null) {
    if (typeof input.amountSpent !== 'number' || !Number.isFinite(input.amountSpent) || input.amountSpent < 0 || input.amountSpent > 99999999.99) {
      throw new ApiError(400, 'amountSpent must be a non-negative number');
    }
    amountSpent = input.amountSpent;
  }

  const notes = optionalText(input.notes, 'notes');
  return { restaurantId: input.restaurantId, date: input.date, amountSpent, notes };
}

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON');
  }
}