import 'server-only';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool: Pool | undefined;

function getPool() {
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
    });
    pool.on('error', (error) => console.error('PostgreSQL pool error', error.message));
  }
  return pool;
}

export function databaseConfigured() {
  return Boolean(connectionString);
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
