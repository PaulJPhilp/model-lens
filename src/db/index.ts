import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * PostgreSQL connection pool
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Drizzle ORM client instance
 */
export const db = drizzle(pool, { schema });

/**
 * Helper to run SQL migration files
 * @param migrationPath - Path to .sql file relative to project root
 */
export async function runMigration(migrationPath: string): Promise<void> {
  const fullPath = join(process.cwd(), migrationPath);
  const sql = readFileSync(fullPath, 'utf-8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log(`✓ Migration applied: ${migrationPath}`);
  } catch (error) {
    console.error(`✗ Migration failed: ${migrationPath}`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
export async function closeDb(): Promise<void> {
  await pool.end();
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    client.release();
  }
}
