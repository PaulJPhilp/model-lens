import { beforeAll, afterAll } from 'vitest';
import { db, testConnection, runMigration } from '@/src/db';

/**
 * Setup for API route tests
 *
 * This file configures the test database and runs migrations before tests.
 *
 * Requirements:
 * 1. PostgreSQL must be running
 * 2. DATABASE_URL environment variable must be set
 * 3. Test database should exist or be created
 */

beforeAll(async () => {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.warn(
      '\n⚠️  DATABASE_URL not set. API tests require a PostgreSQL database.\n' +
      '   Set DATABASE_URL in .env file or skip these tests.\n'
    );
    throw new Error('DATABASE_URL required for API tests');
  }

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    throw new Error('Failed to connect to database');
  }

  // Run migrations
  try {
    await runMigration('db/migrations/0001_create_saved_filters.sql');
  } catch (error) {
    // Migration may already be applied, which is fine
    if (error instanceof Error && !error.message.includes('already exists')) {
      console.warn('Migration warning:', error.message);
    }
  }
});

afterAll(async () => {
  // Close database connection after all tests
  await db.$client.end();
});
