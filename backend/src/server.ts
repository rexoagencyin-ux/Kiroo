import './config/env';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { pool } from './db/pool';

async function start() {
  // Verify DB connectivity before accepting traffic.
  try {
    await pool.query('SELECT 1');
    logger.info('Connected to PostgreSQL');
  } catch (err) {
    logger.error('Could not connect to PostgreSQL. Check DATABASE_URL.', err);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`Modern Shop API running on ${env.apiUrl} (port ${env.port}, ${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down…`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
