import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import { logger } from '../config/logger';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  logger.info('Running database migration…');
  await pool.query(sql);
  logger.info('Migration complete. All tables and indexes are in place.');
}

migrate()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Migration failed', err);
    pool.end().finally(() => process.exit(1));
  });
