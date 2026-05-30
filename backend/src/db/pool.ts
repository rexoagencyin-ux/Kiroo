import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const pool = new Pool({
  connectionString: env.db.connectionString,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err);
});

/** Run a parameterised query. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params as never[]);
  const duration = Date.now() - start;
  if (duration > 500) {
    logger.warn(`Slow query (${duration}ms): ${text.slice(0, 120)}`);
  }
  return result;
}

/** Convenience: return the first row or null. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] ?? null;
}

/** Run a set of statements inside a single transaction. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
