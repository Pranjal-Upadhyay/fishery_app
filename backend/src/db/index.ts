/**
 * Database Connection Pool and Query Builder
 * PostgreSQL with JSONB support for hierarchical knowledge graph
 */

import pg, { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';
import { logger } from '../utils/logger';

function describeError(error: unknown) {
  if (error instanceof AggregateError) {
    return {
      name: error.name,
      message: error.message || 'Multiple connection attempts failed',
      errors: error.errors?.map((entry: any) => ({
        name: entry?.name,
        message: entry?.message,
        code: entry?.code,
        errno: entry?.errno,
        address: entry?.address,
        port: entry?.port,
      })),
    };
  }

  const err = error as any;
  return {
    name: err?.name || 'Error',
    message: err?.message || 'Unknown database error',
    code: err?.code,
    errno: err?.errno,
    address: err?.address,
    port: err?.port,
  };
}

// Database configuration — fail fast if credentials are missing in production.
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error(
      'FATAL: Database credentials must be set via environment variables in production. ' +
      'Required: DATABASE_URL or (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)'
    );
  }
}

const poolConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      application_name: 'fishing_god_backend',
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || (process.env.NODE_ENV === 'production' ? undefined : 'fishinggod'),
      password: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'aquaculture2024'),
      database: process.env.DB_NAME || (process.env.NODE_ENV === 'production' ? undefined : 'fishing_god'),
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection not established
      application_name: 'fishing_god_backend',
      ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

// Create the connection pool
export const pool = new Pool(poolConfig);

// Pool event handlers for monitoring
pool.on('connect', (client) => {
  logger.debug('New client connected to PostgreSQL');
});

pool.on('acquire', (client) => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', (client) => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

/**
 * Execute a SQL query with parameter binding
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', {
      duration: `${duration}ms`,
      rows: result.rowCount,
      query: text.slice(0, 100)
    });
    return result;
  } catch (error) {
    logger.error('Query execution failed', {
      error: describeError(error),
      query: text.slice(0, 100)
    });
    throw error;
  }
}

/**
 * Execute a transaction with multiple queries
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all pool connections gracefully
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('PostgreSQL pool closed');
}

/**
 * JSONB query helper for hierarchical tree traversal
 * Uses GIN index for efficient JSONB queries
 */
export function buildJsonbQuery(
  column: string,
  path: string[],
  operator: string,
  value: unknown
): { clause: string; params: unknown[] } {
  const jsonbPath = path.map((p, i) => i === 0 ? p : `'${p}'`).join('->');
  const clause = `${column} ${operator === '@>' ? '@>' : `->${path.length > 1 ? '>' : ''}`} $1`;

  if (operator === '@>') {
    const searchObject = path.reduceRight<Record<string, unknown>>(
      (acc, key) => ({ [key]: acc }),
      value as Record<string, unknown>
    );
    return { clause: `${column} @> $1::jsonb`, params: [JSON.stringify(searchObject)] };
  }

  return { clause: `(${column}${'->'.repeat(path.length - 1)}->>'${path[path.length - 1]}')::numeric ${operator} $1`, params: [value] };
}

/**
 * Recursive CTE query for tree traversal
 * Retrieves all descendants of a given node
 */
export function buildTreeQuery(nodeId: string): { sql: string; params: unknown[] } {
  return {
    sql: `
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, node_type, data, 0 as depth, ARRAY[id] as path
        FROM knowledge_nodes
        WHERE id = $1
        UNION ALL
        SELECT kn.id, kn.parent_id, kn.node_type, kn.data, t.depth + 1, t.path || kn.id
        FROM knowledge_nodes kn
        INNER JOIN tree t ON kn.parent_id = t.id
        WHERE NOT kn.id = ANY(t.path)
      )
      SELECT * FROM tree ORDER BY path;
    `,
    params: [nodeId]
  };
}

/**
 * Check database connectivity
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query<{ current_time: Date }>('SELECT NOW() as current_time');
    logger.info('Database connection verified', {
      currentTime: result.rows[0]?.current_time
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', {
      error: describeError(error),
      host: poolConfig.host,
      port: poolConfig.port,
      database: poolConfig.database,
      user: poolConfig.user,
    });
    return false;
  }
}
