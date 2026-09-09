# Write-up

## 1. What did you build for Part B, and why that?

For Part B, I built a way to track spending from restaurant visits. The home page shows total spending, recent visits, and forms for adding a new restaurant or recording a visit. I chose this because the existing database already had a visits table, but there was no way to use it from the application. Adding user accounts also makes the feature useful for more than one person. Each user can keep track of their own restaurants and visits, log out, and log back in later without losing their progress.

## 2. What did you decide, and what did you rule out?

I used HTTP endpoints for authentication, restaurants, and visits so the
frontend does not access the database directly. User sessions are stored in the database and represented in the browser by an HTTP-only cookie. Restaurant and visit queries are filtered based off of whether a user is signed in or not,which keeps one person's records separate from another person's records.

The visit form validates the restaurant, date, amount, and note fields before writing to the database. Passwords are currently stored as scrypt hashes rather than plaintext. I would keep that decision with more time; the next security work would be password reset/secure password suggestions, email verification, and session cleanup. 

## 3. Where did you cut corners?

The page loads the restaurant and visit collections in the browser, however does not allow the user to upload any pictures, or rate the restaurant. The UI supports adding and viewing records, but not editing or deleting visits. Sessions also do not have a password-reset or email-verification. With another day, I would add automated route tests, session cleanup, and controls for editing or deleting a visit. As well as a nicer way to sort through records (by time, by month, meal type, etc.)

## Part B: routes

- `GET /api/visits`: Lists the signed-in user's visits newest first. Returns `200` with a visit array, or `401` if signed out.
- `POST /api/visits`: Records a visit for the signed-in user. Returns `201` with the created visit, or `400` for an invalid body, `401` if signed out, or `404` if the restaurant is unknown.
- `GET /api/restaurants`: Lists the signed-in user's restaurants. Returns `200` with a restaurant array, or `401` if signed out.
- `POST /api/restaurants`: Adds a restaurant to the signed-in user's list. Returns `201` with the created restaurant, or `400` for an invalid body or `401` if signed out.
- `POST /api/auth/register`: Creates an account and starts a session. Returns `201` with `{ "ok": true }`, or `400` for invalid fields or `409` for a duplicate email.
- `POST /api/auth/login`: Starts a session. Returns `200` with `{ "ok": true }`, or `400` for invalid fields or `401` for incorrect credentials.
- `GET /api/auth/me`: Returns the current user with `200`, or `401` if signed out.
- `POST /api/auth/logout`: Ends the current session and returns `200` with `{ "ok": true }`.

**`POST /api/visits`**

```json
{
  "restaurantId": 1,
  "date": "2026-09-08",
  "amountSpent": 42.5,
  "notes": "Dinner"
}
```

The response is the created visit with `id`, `restaurantId`, `date`,
`amountSpent`, `notes`, and ISO `createdAt`.

## Schema changes

Added `client/db/migrations/002_users_and_ownership.sql`. It creates `users` and `sessions`, adds `ownerId` to `restaurants` and `visits`, adds ownership indexes, and assigns the seeded records to `demo@example.com`. Run `npm run migrate`; `./setup.sh` runs migrations automatically.

## How I verified this
I checked the health endpoint, the restaurant contract, invalid IDs, invalid ratings, authentication, account isolation, adding a restaurant,and adding a visit. The main commands were:

```bash
curl -i http://localhost:3000/api/health

# Log in and save the session cookie
curl -i -c /tmp/feeding-brennen.cookies -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"demo1234"}'

curl -i -b /tmp/feeding-brennen.cookies http://localhost:3000/api/restaurants
curl -i -b /tmp/feeding-brennen.cookies http://localhost:3000/api/visits
curl -i -b /tmp/feeding-brennen.cookies http://localhost:3000/api/restaurants/99999
curl -i -b /tmp/feeding-brennen.cookies http://localhost:3000/api/restaurants/abc

# Invalid restaurant input returns 400
curl -i -b /tmp/feeding-brennen.cookies -X POST http://localhost:3000/api/restaurants \
  -H 'Content-Type: application/json' \
  -d '{"name":"Out Of Range","rating":6}'

# Add a restaurant; it appears in the visit dropdown for this account
curl -i -b /tmp/feeding-brennen.cookies -X POST http://localhost:3000/api/restaurants \
  -H 'Content-Type: application/json' \
  -d '{"name":"New Place","cuisine":"Test","rating":4.2}'

# Invalid visit input returns 400
curl -i -b /tmp/feeding-brennen.cookies -X POST http://localhost:3000/api/visits \
  -H 'Content-Type: application/json' \
  -d '{"restaurantId":1,"date":"not-a-date","amountSpent":-2}'
```

`npm run build` passes with TypeScript checking and Next.js production
compilation. I also created a second account and confirmed it started with no restaurants or visits from the demo account.

## Known issues / what I'd do next

The local development database is shared, so repeated verification POSTs add rows. Run `npm run seed` when a clean demo dataset is needed. The demo account is `demo@example.com` with password `demo1234`. The next improvements I would make are automated API tests, password reset, email verification, and visit editing/deletion. I would also add a way to sort through a user's existing visits. 
