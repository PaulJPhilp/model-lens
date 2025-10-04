import { drizzle } from "drizzle-orm/node-postgres";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import pkg from "pg";
import { fileURLToPath } from "url";
import * as schema from "./schema";
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * PostgreSQL connection pool
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Add connection event logging
pool.on("connect", (client) => {
  console.log("🔌 [DB] New client connected to database");
});

pool.on("error", (err) => {
  console.error("❌ [DB] Unexpected error on idle client:", err);
});

pool.on("acquire", (client) => {
  console.log("📥 [DB] Client acquired from pool");
});

pool.on("remove", (client) => {
  console.log("📤 [DB] Client removed from pool");
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
  console.log(`🔄 [DB] Starting migration: ${migrationPath}`);
  const startTime = Date.now();

  const fullPath = join(process.cwd(), migrationPath);
  const sql = readFileSync(fullPath, "utf-8");

  const client = await pool.connect();
  try {
    await client.query(sql);
    const duration = Date.now() - startTime;
    console.log(
      `✅ [DB] Migration applied successfully: ${migrationPath} (${duration}ms)`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `❌ [DB] Migration failed: ${migrationPath} (${duration}ms)`,
      error
    );
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
  console.log("🔍 [DB] Testing database connection...");
  const startTime = Date.now();

  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    const duration = Date.now() - startTime;
    console.log(`✅ [DB] Database connection successful (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [DB] Database connection failed (${duration}ms):`, error);
    return false;
  } finally {
    client.release();
  }
}
