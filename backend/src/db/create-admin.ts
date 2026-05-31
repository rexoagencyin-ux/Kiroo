/**
 * Create or reset the admin account WITHOUT touching products/banners/etc.
 *
 * Usage:
 *   npm run db:admin
 *   ADMIN_EMAIL=you@mail.com ADMIN_PASSWORD='Secret@123' ADMIN_NAME='Owner' npm run db:admin
 *
 * Requires DATABASE_URL to be set and migrations to have been run (npm run db:migrate).
 */
import { pool, query, queryOne } from './pool';
import { env } from '../config/env';
import { hashPassword } from '../utils/password';
import { logger } from '../config/logger';

async function createAdmin() {
  const { email, password, name } = env.admin;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  }

  const hash = await hashPassword(password);
  const row = await queryOne<{ id: string; email: string }>(
    `INSERT INTO users (name, email, password_hash, role, is_verified, provider, is_active)
     VALUES ($1, $2, $3, 'admin', TRUE, 'email', TRUE)
     ON CONFLICT (email) DO UPDATE
       SET role = 'admin',
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           is_verified = TRUE,
           is_active = TRUE
     RETURNING id, email`,
    [name, email, hash]
  );

  logger.info(`✔ Admin account ready: ${row?.email}`);
  logger.info(`  Login at /admin with this email and the password you configured.`);
}

createAdmin()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Failed to create admin', err);
    pool.end().finally(() => process.exit(1));
  });
