import fs from 'fs';
import path from 'path';
import { pool } from '../db';
import { logger } from '../utils/logger';

type MigrationFile = {
  filename: string;
  filepath: string;
};

function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.join(__dirname, '../../migrations');

  return fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({
      filename,
      filepath: path.join(migrationsDir, filename),
    }));
}

async function hasExternalBootstrap(client: any): Promise<boolean> {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('knowledge_nodes', 'users', 'ponds', 'market_prices')
    ) AS has_bootstrap
  `);

  return Boolean(result.rows[0]?.has_bootstrap);
}

async function ensureMigrationsTable(client: any): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function repairLocationHierarchySchema(client: any): Promise<void> {
  logger.info('Reconciling location hierarchy schema drift before migrations');

  await client.query(`
    DO $$
    BEGIN
      -- Some deployed databases ended up with both the new canonical columns
      -- and the old non-null legacy name columns. Later seeds write to name,
      -- so we relax the legacy columns only in that dual-column drift state.
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loc_districts' AND column_name = 'district_name'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loc_districts' AND column_name = 'name'
      ) THEN
        UPDATE loc_districts
        SET name = COALESCE(NULLIF(name, ''), district_name)
        WHERE district_name IS NOT NULL;

        ALTER TABLE loc_districts
        ALTER COLUMN district_name DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loc_blocks' AND column_name = 'block_name'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loc_blocks' AND column_name = 'name'
      ) THEN
        UPDATE loc_blocks
        SET name = COALESCE(NULLIF(name, ''), block_name)
        WHERE block_name IS NOT NULL;

        ALTER TABLE loc_blocks
        ALTER COLUMN block_name DROP NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loc_panchayats' AND column_name = 'panchayat_name'
      ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'loc_panchayats' AND column_name = 'name'
      ) THEN
        UPDATE loc_panchayats
        SET name = COALESCE(NULLIF(name, ''), panchayat_name)
        WHERE panchayat_name IS NOT NULL;

        ALTER TABLE loc_panchayats
        ALTER COLUMN panchayat_name DROP NOT NULL;
      END IF;
    END $$;
  `);
}

async function baselineExistingBootstrap(client: any, migrationFiles: MigrationFile[]): Promise<void> {
  const result = await client.query('SELECT COUNT(*)::int AS count FROM schema_migrations');
  const appliedCount = result.rows[0]?.count ?? 0;

  if (appliedCount > 0) {
    return;
  }

  if (!(await hasExternalBootstrap(client))) {
    return;
  }

  logger.info('Detected existing SQL bootstrap; baselining migration history');

  for (const migration of migrationFiles) {
    await client.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
      [migration.filename]
    );
  }
}

async function enforceRuntimeSchema(client: any): Promise<void> {
  logger.info('Ensuring runtime schema alignment for auth and mobile features');

  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
  `);

  await client.query(`
    ALTER TABLE users
    ALTER COLUMN district_code DROP NOT NULL
  `);

  await client.query(`
    ALTER TABLE users
    ALTER COLUMN state_code TYPE VARCHAR(100)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS water_quality_readings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      device_id VARCHAR(100) NOT NULL DEFAULT 'mobile-app',
      temperature NUMERIC(5, 2),
      dissolved_oxygen NUMERIC(5, 2),
      ph NUMERIC(4, 2),
      salinity NUMERIC(8, 2),
      ammonia NUMERIC(6, 3),
      notes TEXT,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_wq_device_time
    ON water_quality_readings(device_id, recorded_at DESC)
  `);
}

async function runMigration() {
  const client = await pool.connect();

  try {
    logger.info('Starting database migration...');

    const migrationFiles = getMigrationFiles();

    await client.query('BEGIN');
    await ensureMigrationsTable(client);
    await baselineExistingBootstrap(client, migrationFiles);
    await repairLocationHierarchySchema(client);
    await client.query('COMMIT');

    const appliedResult = await client.query<{ filename: string }>('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedResult.rows.map((row) => row.filename));

    for (const migration of migrationFiles) {
      if (applied.has(migration.filename)) {
        continue;
      }

      const sql = fs.readFileSync(migration.filepath, 'utf-8');

      logger.info(`Applying migration ${migration.filename}`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migration.filename]);
      await client.query('COMMIT');
    }

    // Apply runtime schema alignment AFTER base tables are confirmed created
    await client.query('BEGIN');
    await enforceRuntimeSchema(client);
    await client.query('COMMIT');

    logger.info('Database migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to run migration:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch((error) => {
    logger.error('Migration runner crashed:', error);
    process.exit(1);
  });
}
