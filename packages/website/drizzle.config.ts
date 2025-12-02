import { defineConfig } from "drizzle-kit"

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./db/migrations",
	dialect: "postgresql",
	dbCredentials: {
		// Use NON_POOLING for migrations (migrations need direct connections)
		url: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL!,
	},
})
