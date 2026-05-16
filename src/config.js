import 'dotenv/config';
import pg from 'pg';

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || 'https://api.octobere.com',
    issuer: process.env.AUTH0_ISSUER || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },
  twilio: {
    sid: process.env.TWILIO_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    toNumber: process.env.TWILIO_TO_NUMBER || 'whatsapp:+447405992122',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },
};

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});
