#!/usr/bin/env node
import { db, testConnection, closeDb } from '../db/index.js';
import { savedFilters, type RuleClause } from '../db/schema.js';
import {
  evaluateFilterAgainstModel,
  formatEvaluationResult,
  type ModelMetadata,
} from '../lib/filters.js';
import { eq } from 'drizzle-orm';

/**
 * Database verification script
 * Tests connection, inserts sample filter, and evaluates against mock model
 */
async function main() {
  console.log('🔍 Verifying database setup...\n');

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('   Example: postgres://user:pass@localhost:5432/db');
    process.exit(1);
  }

  // Test connection
  console.log('1. Testing database connection...');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }
  console.log('✓ Database connection successful\n');

  // Check if table exists
  console.log('2. Checking if saved_filters table exists...');
  try {
    await db.select().from(savedFilters).limit(1);
    console.log('✓ Table exists\n');
  } catch (error) {
    console.error('❌ Table does not exist');
    console.error('   Run migration first:');
    console.error(
      '   psql $DATABASE_URL -f db/migrations/' +
      '0001_create_saved_filters.sql'
    );
    await closeDb();
    process.exit(1);
  }

  // Create sample filter
  console.log('3. Inserting sample saved filter...');
  const sampleRules: RuleClause[] = [
    {
      field: 'provider',
      operator: 'in',
      value: ['openai', 'anthropic'],
      type: 'hard',
    },
    {
      field: 'inputCost',
      operator: 'lte',
      value: 10,
      type: 'soft',
      weight: 0.6,
    },
    {
      field: 'capabilities',
      operator: 'contains',
      value: 'reasoning',
      type: 'soft',
      weight: 0.4,
    },
  ];

  const [inserted] = await db
    .insert(savedFilters)
    .values({
      ownerId: '00000000-0000-0000-0000-000000000001',
      name: 'Budget-friendly reasoning models',
      description: 'OpenAI or Anthropic models with low cost and reasoning',
      visibility: 'private',
      rules: sampleRules,
    })
    .returning();

  console.log(`✓ Inserted filter: ${inserted.name} (${inserted.id})\n`);

  // Query it back
  console.log('4. Querying saved filter...');
  const [queried] = await db
    .select()
    .from(savedFilters)
    .where(eq(savedFilters.id, inserted.id));

  if (!queried) {
    console.error('❌ Failed to query filter back');
    await closeDb();
    process.exit(1);
  }

  console.log(`✓ Retrieved filter: ${queried.name}`);
  console.log(`  Rules: ${JSON.stringify(queried.rules, null, 2)}\n`);

  // Test filter evaluator
  console.log('5. Testing filter evaluator...');

  const mockModel: ModelMetadata = {
    id: 'mock-1',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    inputCost: 5.0,
    outputCost: 15.0,
    cacheReadCost: 1.0,
    cacheWriteCost: 2.0,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    modalities: ['text'],
    capabilities: ['reasoning', 'tools'],
    releaseDate: '2024-01-01',
    lastUpdated: '2024-01-01',
    knowledge: '2024-04',
    openWeights: false,
    supportsTemperature: true,
    supportsAttachments: false,
    new: false,
  };

  const result = evaluateFilterAgainstModel(queried.rules, mockModel);

  console.log(`  Model: ${mockModel.name} (${mockModel.provider})`);
  console.log(`  ${formatEvaluationResult(result)}`);
  console.log(`  Rationale: ${result.rationale}\n`);

  // Clean up test data
  console.log('6. Cleaning up test data...');
  await db.delete(savedFilters).where(eq(savedFilters.id, inserted.id));
  console.log('✓ Test filter deleted\n');

  // Close connection
  await closeDb();
  console.log('✅ All verification checks passed!\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
