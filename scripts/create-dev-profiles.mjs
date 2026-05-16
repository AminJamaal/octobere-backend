import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
});

await pool.query(`
    INSERT INTO profiles (id, email, full_name, role, membership_tier)
    VALUES ('00000000-0000-0000-0000-000000000001', 'admin@octobere.com', 'Admin User', 'superadmin', 'Platinum')
    ON CONFLICT (id) DO UPDATE SET role = 'superadmin', email = 'admin@octobere.com'
`);
console.log('Dev profile created');

await pool.query(`
    INSERT INTO profiles (id, email, full_name, role, membership_tier)
    VALUES ('00000000-0000-0000-0000-000000000002', 'client@octobere.com', 'Test Client', 'client', 'Gold')
    ON CONFLICT (id) DO NOTHING
`);
console.log('Test client profile created');

await pool.end();
