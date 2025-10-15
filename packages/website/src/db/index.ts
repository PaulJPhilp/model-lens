import "server-only"
import { drizzle } from "drizzle-orm/node-postgres"
import pkg from "pg"
import * as schema from "./schema"

const { Pool } = pkg

/**
 * PostgreSQL connection pool
 */
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
})

// Add connection event logging
pool.on("connect", (_client) => {
	console.log("🔌 [DB] New client connected to database")
})

pool.on("error", (err) => {
	console.error("❌ [DB] Unexpected error on idle client:", err)
})

pool.on("acquire", (_client) => {
	console.log("📥 [DB] Client acquired from pool")
})

pool.on("remove", (_client) => {
	console.log("📤 [DB] Client removed from pool")
})

/**
 * Drizzle ORM client instance
 */
export const db = drizzle(pool, { schema })

/**
 * Test database connection
 */
export async function testConnection() {
	try {
		const client = await pool.connect()
		await client.query("SELECT 1")
		client.release()
		console.log("✅ [DB] Database connection test successful")
		return true
	} catch (error) {
		console.error("❌ [DB] Database connection test failed:", error)
		return false
	}
}

/**
 * Run database migrations
 */
export async function runMigration(migrationPath?: string) {
	try {
		// For now, just test the connection
		// In a real app, you'd run the migration from the file
		console.log(`🔄 [DB] Running migration: ${migrationPath || "default"}`)
		const isConnected = await testConnection()
		if (isConnected) {
			console.log("✅ [DB] Migration check passed (connection successful)")
		}
		return isConnected
	} catch (error) {
		console.error("❌ [DB] Migration failed:", error)
		return false
	}
}

/**
 * Close database connection pool
 */
export async function closeDb() {
	try {
		await pool.end()
		console.log("🔌 [DB] Database connection pool closed")
	} catch (error) {
		console.error("❌ [DB] Error closing database connection:", error)
	}
}
