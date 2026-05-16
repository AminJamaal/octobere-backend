import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 15000,
});

const tables = [
    'profiles', 'requests', 'messages', 'assets',
    'live_page_content', 'live_page_versions', 'audit_logs',
    'website_sections', 'website_text_contents', 'website_cards',
    'website_simple_items', 'directory', 'client_documents',
    'communications', 'system_logs', 'website_content', 'website_configs',
    'detailed_requests'
];

for (const t of tables) {
    try {
        const r = await pool.query(
            `SELECT column_name, data_type, is_nullable 
             FROM information_schema.columns 
             WHERE table_schema='public' AND table_name=$1 
             ORDER BY ordinal_position`, [t]);
        console.log(`\n${t}:`);
        r.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`));
    } catch(e) {
        console.log(`\n${t}: ERROR - ${e.message}`);
    }
}

await pool.end();
