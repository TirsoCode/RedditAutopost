import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, assertEnv } from './config/env.js';
import { pool } from './config/db.js';
import { logger } from './utils/logger.js';
import { requireAuth, setSessionCookie, clearSessionCookie, signSession } from './middleware/auth.js';
import { findOrCreateUser } from './models/User.js';
import { startJobs } from './jobs/index.js';

import postsRouter from './routes/posts.js';
import subredditsRouter from './routes/subreddits.js';
import statsRouter from './routes/stats.js';
import settingsRouter from './routes/settings.js';
import publishRouter from './routes/publish.js';
import authRouter from './routes/auth.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Lightweight health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Minimal single-user session: /api/auth/login signs a cookie for the MVP user.
app.post('/api/auth/login', async (_req, res) => {
  const user = await findOrCreateUser();
  setSessionCookie(res, signSession(user.id));
  res.json({ ok: true, userId: user.id });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// OAuth callback is public (Reddit redirects to it)
app.use('/api/auth', authRouter);

// Everything below requires a session
app.use('/api/posts', requireAuth, postsRouter);
app.use('/api/subreddits', requireAuth, subredditsRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/publish', requireAuth, publishRouter);

// Not-found + error handlers
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  assertEnv();
  // Verify DB connectivity early
  await pool.query('SELECT 1');
  logger.info('✅ PostgreSQL connected');

  app.listen(env.port, () => logger.info(`🚀 API listening on ${env.appUrl}`));
  startJobs();
}

main().catch((err) => {
  logger.error('Failed to start', { message: err.message, stack: err.stack });
  process.exit(1);
});

export default app;