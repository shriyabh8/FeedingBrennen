import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Central error -> HTTP response mapper for the API route handlers. Call it
 * from a route's `catch` block so error handling lives in one place:
 *
 *   try {
 *     ...
 *   } catch (err) {
 *     return handleError(err);
 *   }
 *
 * This is a STUB. Right now it always returns a generic 500. A real
 * implementation would inspect the error (validation vs. not-found vs.
 * conflict vs. unexpected) and choose an appropriate status code and shape.
 *
 * This is task A3. The write endpoints from A2 can't return sensible 400s and
 * 404s while every failure funnels into a 500.
 *
 * TODO (A3): map known error types to proper status codes (400, 404, 409, ...)
 * TODO (A3): avoid leaking internal error details in responses
 */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  if (isDatabaseError(err, '23505')) {
    return NextResponse.json({ error: 'Resource already exists' }, { status: 409 });
  }

  if (isDatabaseError(err, '23503')) {
    return NextResponse.json({ error: 'Referenced resource does not exist' }, { status: 400 });
  }

  if (isDatabaseError(err, '22P02')) {
    return NextResponse.json({ error: 'Invalid request value' }, { status: 400 });
  }

  console.error('Unhandled API error:', err);

  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}

function isDatabaseError(err: unknown, code: string): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code;
}
