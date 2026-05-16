import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, pool } from './config.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import historyRoutes from './routes/history.js';
import vaultRoutes from './routes/vault.js';
import assetRoutes from './routes/assets.js';
import adminRoutes from './routes/admin.js';
import liveContentRoutes from './routes/live-content.js';
import cmsRoutes from './routes/cms.js';
import contactRoutes from './routes/contact.js';
import aiConciergeRoutes from './routes/ai-concierge.js';
import notifyRoutes from './routes/notify.js';
import uploadRoutes from './routes/upload.js';
import sseRoutes from './realtime/sse.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api', messageRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/live-content', liveContentRoutes);
app.use('/api/website-sections', cmsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/ai-concierge', aiConciergeRoutes);
app.use('/api/notify-admin', notifyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/events', sseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  // Try database connection (non-blocking - API still starts even if DB is down)
  try {
    const r = await pool.query('SELECT NOW()');
    console.log('Database connected:', r.rows[0].now);
  } catch (err) {
    console.error('WARNING: Database connection failed:', err.message);
    console.error('The API will start but database-dependent routes will return errors.');
    console.error('Set DATABASE_URL in .env and restart.');
  }

  app.listen(config.port, () => {
    console.log(`Octobere API running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`CORS origin: ${config.frontendUrl}`);
    console.log(`Auth0 domain: ${config.auth0.domain || 'NOT CONFIGURED'}`);
  });
}

startServer();
