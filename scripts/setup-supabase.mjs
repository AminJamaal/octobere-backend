import pg from 'pg';
import fs from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });

try {
  const schema = fs.readFileSync('src/db/schema.sql', 'utf8');
  console.log('Applying schema...');
  await pool.query(schema);
  console.log('Schema applied');

  const seed = fs.readFileSync('src/db/seed.sql', 'utf8');
  console.log('Applying seed...');
  await pool.query(seed);
  console.log('Seed applied');

  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  console.log('pgcrypto extension added');

  await pool.query("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT ''");
  console.log('password_hash column added');

  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
