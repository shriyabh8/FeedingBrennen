-- Add account ownership without rewriting the original starter migration.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  "userId"   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS "ownerId" INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS "ownerId" INTEGER REFERENCES users(id) ON DELETE CASCADE;

INSERT INTO users (email, display_name, password_hash)
VALUES (
  'demo@example.com',
  'Demo diner',
  '7f30edd8dcff6abf743eab1332920482:2e0d5f9fbca2d5cfee0a02fd1fda70c34b12b18c7f4c62899e4b621c526206af7a58a4e7cdadcb9907d27e465883634accf05760e262d005d5ed63de781cf249'
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

UPDATE restaurants
SET "ownerId" = (SELECT id FROM users WHERE email = 'demo@example.com')
WHERE "ownerId" IS NULL;

UPDATE visits
SET "ownerId" = (SELECT id FROM users WHERE email = 'demo@example.com')
WHERE "ownerId" IS NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants ("ownerId");
CREATE INDEX IF NOT EXISTS idx_visits_owner_id ON visits ("ownerId");