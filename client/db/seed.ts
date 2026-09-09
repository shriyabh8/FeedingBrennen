import { pool } from './pool';

/**
 * Seed the database with sample data: 5 restaurants and 3 visits.
 *
 * Run with: npm run seed
 *
 * Clears existing rows first so re-seeding gives you a clean, predictable set.
 */

const restaurants = [
  { name: 'The Rusty Spoon', cuisine: 'American', address: '12 Main St', rating: 4.5 },
  { name: 'Sakura House', cuisine: 'Japanese', address: '88 Cherry Ln', rating: 4.8 },
  { name: 'Bella Napoli', cuisine: 'Italian', address: '301 Olive Ave', rating: 4.2 },
  { name: 'El Fuego', cuisine: 'Mexican', address: '47 Sol Blvd', rating: 4.6 },
  { name: 'Green Bowl', cuisine: 'Vegetarian', address: '5 Garden Way', rating: 3.9 },
];

const visits = [
  { restaurantIndex: 0, date: '2026-01-12', amountSpent: 42.5, notes: 'Burger night with the crew.' },
  { restaurantIndex: 1, date: '2026-02-03', amountSpent: 88.0, notes: 'Omakase. Worth every penny.' },
  { restaurantIndex: 3, date: '2026-03-21', amountSpent: 31.75, notes: 'Tacos to go.' },
];

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: users } = await client.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      ['demo@example.com', 'Demo diner', '7f30edd8dcff6abf743eab1332920482:2e0d5f9fbca2d5cfee0a02fd1fda70c34b12b18c7f4c62899e4b621c526206af7a58a4e7cdadcb9907d27e465883634accf05760e262d005d5ed63de781cf249']
    );
    const userId = users[0].id;

    // Wipe and reset identity so ids are stable between seeds.
    await client.query('TRUNCATE visits, restaurants RESTART IDENTITY CASCADE');

    const restaurantIds: number[] = [];
    for (const r of restaurants) {
      const { rows } = await client.query(
        `INSERT INTO restaurants (name, cuisine, address, rating)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [r.name, r.cuisine, r.address, r.rating]
      );
      restaurantIds.push(rows[0].id);
      await client.query('UPDATE restaurants SET "ownerId" = $1 WHERE id = $2', [userId, rows[0].id]);
    }

    for (const v of visits) {
      await client.query(
        `INSERT INTO visits ("restaurantId", date, "amountSpent", notes)
         VALUES ($1, $2, $3, $4)`,
        [restaurantIds[v.restaurantIndex], v.date, v.amountSpent, v.notes]
      );
      await client.query('UPDATE visits SET "ownerId" = $1 WHERE id = (SELECT max(id) FROM visits)', [userId]);
    }

    await client.query('COMMIT');
    console.log(`Seeded ${restaurants.length} restaurants and ${visits.length} visits.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    pool.end().finally(() => process.exit(1));
  });
