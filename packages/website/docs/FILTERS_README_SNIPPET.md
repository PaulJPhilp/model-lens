# Saved Filters Feature

ModelLens includes a powerful saved filters system that allows you to create, save, and share custom model filtering criteria.

## Features

- 🎯 **Rule-based filtering** - Combine hard (must-pass) and soft (scoring) clauses
- 💾 **Persistent storage** - Filters saved in PostgreSQL with full history
- 🔍 **Advanced operators** - Support for `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`
- 🤝 **Sharing** - Private, team, or public visibility options
- 📊 **Usage tracking** - Monitor filter usage and popularity
- ✅ **Type-safe** - Full TypeScript support with Drizzle ORM

## Quick Example

```typescript
// Create a filter for budget-friendly reasoning models
const filter = {
  name: 'Budget AI with Reasoning',
  rules: [
    {
      field: 'provider',
      operator: 'in',
      value: ['openai', 'anthropic'],
      type: 'hard',  // Must be OpenAI or Anthropic
    },
    {
      field: 'inputCost',
      operator: 'lte',
      value: 10,
      type: 'soft',   // Prefer cheaper models
      weight: 0.6,
    },
    {
      field: 'capabilities',
      operator: 'contains',
      value: 'reasoning',
      type: 'soft',   // Prefer reasoning capability
      weight: 0.4,
    },
  ],
};

// Evaluate against a model
const result = evaluateFilterAgainstModel(filter.rules, model);
console.log(result.match);      // true/false
console.log(result.score);      // 0.0-1.0 (soft clause score)
console.log(result.rationale);  // Explanation of result
```

## Setup

See **[Database Setup Guide](./docs/DATABASE_SETUP.md)** for complete instructions.

**Quick start:**

```bash
# 1. Set database URL
export DATABASE_URL=postgres://user:pass@localhost:5432/modellens

# 2. Run migration
psql $DATABASE_URL -f db/migrations/0001_create_saved_filters.sql

# 3. Verify
bun run src/scripts/verify-db.ts

# 4. Test
bun test tests/filter-evaluator.test.ts
```

## Documentation

- [Complete Setup Guide](./docs/DATABASE_SETUP.md) - Installation, configuration, troubleshooting
- [Implementation Summary](./docs/FILTERS_SETUP_SUMMARY.md) - Technical overview and architecture
- [Filter Evaluator Tests](./tests/filter-evaluator.test.ts) - Usage examples and test cases

## Tech Stack

- PostgreSQL 12+ with pgcrypto
- Drizzle ORM for type-safe database access
- Vitest for unit testing
- Pure TypeScript evaluator (zero dependencies)
