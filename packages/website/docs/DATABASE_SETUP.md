# Database Setup - Postgres + Drizzle ORM

This document describes the PostgreSQL database setup for Effect Models
saved filters feature.

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ with Bun package manager
- Database with pgcrypto extension support (standard on most installs)

## Quick Start

### 1. Set Database URL

Create a `.env.local` file in the project root:

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/effect-models
```

**Production example:**
```bash
DATABASE_URL=postgres://user:pass@host.com:5432/dbname?sslmode=require
```

### 2. Run Migration

Apply the database schema:

```bash
psql $DATABASE_URL -f db/migrations/0001_create_saved_filters.sql
```

Or if you have DATABASE_URL in your environment:

```bash
psql "$DATABASE_URL" -f db/migrations/0001_create_saved_filters.sql
```

**Expected output:**
```
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
```

### 3. Verify Setup

Run the verification script:

```bash
DATABASE_URL="your-connection-string" bun run src/scripts/verify-db.ts
```

**Expected output:**
```
🔍 Verifying database setup...

1. Testing database connection...
✓ Database connection successful

2. Checking if saved_filters table exists...
✓ Table exists

3. Inserting sample saved filter...
✓ Inserted filter: Budget-friendly reasoning models (uuid)

4. Querying saved filter...
✓ Retrieved filter: Budget-friendly reasoning models
  Rules: [...]

5. Testing filter evaluator...
  Model: GPT-4 Turbo (openai)
  ✓ Filter passed with score 100.0% (2/2 soft clauses)
  Rationale: Soft clause passed: inputCost lte 10 (+0.6); ...

6. Cleaning up test data...
✓ Test filter deleted

✅ All verification checks passed!
```

### 4. Run Tests

Execute the unit tests:

```bash
bun test
```

Or specifically for filter tests:

```bash
bun test tests/filter-evaluator.test.ts
```

## Database Schema

### saved_filters table

| Column        | Type                     | Description                    |
|---------------|--------------------------|--------------------------------|
| id            | UUID                     | Primary key (auto-generated)   |
| owner_id      | UUID                     | User who created the filter    |
| team_id       | UUID (nullable)          | Optional team association      |
| name          | TEXT                     | Filter display name            |
| description   | TEXT (nullable)          | Optional description           |
| visibility    | TEXT                     | 'private', 'team', or 'public' |
| rules         | JSONB                    | Array of RuleClause objects    |
| version       | INT                      | Schema version (default: 1)    |
| created_at    | TIMESTAMP WITH TIME ZONE | Creation timestamp             |
| updated_at    | TIMESTAMP WITH TIME ZONE | Last update timestamp          |
| last_used_at  | TIMESTAMP WITH TIME ZONE | Last usage timestamp           |
| usage_count   | BIGINT                   | Number of times used           |

**Indexes:**
- `idx_saved_filters_owner_id` on `owner_id`
- `idx_saved_filters_team_visibility` on `(team_id, visibility)`

**Triggers:**
- Auto-updates `updated_at` on row modification

### RuleClause JSON Schema

```typescript
interface RuleClause {
  field: string;           // Model field path (e.g., "inputCost")
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' |
            'contains';
  value: unknown;          // Comparison value
  type: 'hard' | 'soft';   // Hard = must pass, Soft = adds score
  weight?: number;         // Weight for soft clauses (0-1)
}
```

**Example rules:**

```json
[
  {
    "field": "provider",
    "operator": "in",
    "value": ["openai", "anthropic"],
    "type": "hard"
  },
  {
    "field": "inputCost",
    "operator": "lte",
    "value": 10,
    "type": "soft",
    "weight": 0.6
  }
]
```

## Filter Evaluator

The filter evaluator is a pure TypeScript function that tests models
against saved filter rules.

### Usage

```typescript
import { evaluateFilterAgainstModel } from './src/lib/filters.js';
import type { RuleClause } from './src/db/schema.js';

const rules: RuleClause[] = [
  {
    field: 'provider',
    operator: 'eq',
    value: 'openai',
    type: 'hard',
  },
];

const result = evaluateFilterAgainstModel(rules, model);
console.log(result.match);      // true/false
console.log(result.score);      // 0-1 (soft clause score)
console.log(result.rationale);  // Human-readable explanation
```

### Evaluation Logic

1. **Hard clauses**: Must ALL pass for `match: true`
   - If any hard clause fails, the entire filter rejects the model

2. **Soft clauses**: Contribute to score (0-1 range)
   - Weighted sum of passing soft clauses
   - Normalized by total weight of all soft clauses
   - Does not affect `match` status

3. **Result**:
   ```typescript
   {
     match: boolean;              // All hard clauses passed
     score: number;               // Soft clause score (0-1)
     failedHardClauses: number;
     passedSoftClauses: number;
     totalSoftClauses: number;
     rationale: string;           // Explanation
   }
   ```

## Troubleshooting

### Connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:** Ensure PostgreSQL is running:
```bash
# macOS (Homebrew)
brew services start postgresql

# Linux (systemd)
sudo systemctl start postgresql

# Check status
psql -l
```

### Permission denied for database

```
ERROR: permission denied for database
```

**Solution:** Grant proper permissions or create database:
```bash
# Create database
createdb effect-models

# Or with psql
psql -U postgres -c "CREATE DATABASE \"effect-models\";"
```

### Extension not available

```
ERROR: extension "pgcrypto" is not available
```

**Solution:** Install PostgreSQL contrib package:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-contrib

# macOS (Homebrew)
# Usually included by default
```

### Table already exists

```
ERROR: relation "saved_filters" already exists
```

**Solution:** Migration is idempotent; this warning is safe to ignore
if re-running the migration.

## Development Workflow

### 1. Local Development

```bash
# Start local Postgres
docker run --name modellens-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=effect-models \
  -p 5432:5432 \
  -d postgres:15

# Set env var
export DATABASE_URL=postgres://postgres:password@localhost:5432/effect-models

# Run migrations
psql $DATABASE_URL -f db/migrations/0001_create_saved_filters.sql

# Verify
bun run src/scripts/verify-db.ts
```

### 2. Running Tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# Specific test file
bun test tests/filter-evaluator.test.ts
```

### 3. Reset Database

```bash
# Drop and recreate
psql $DATABASE_URL -c "DROP TABLE IF EXISTS saved_filters CASCADE;"
psql $DATABASE_URL -f db/migrations/0001_create_saved_filters.sql
```

## Next Steps

- [ ] Create API routes for CRUD operations on saved_filters
- [ ] Add authentication/authorization middleware
- [ ] Implement filter sharing (team visibility)
- [ ] Add filter templates/presets
- [ ] Build UI for filter creation and management
- [ ] Add filter usage analytics

## File Structure

```
effect-models/
├── db/
│   └── migrations/
│       └── 0001_create_saved_filters.sql  # Schema migration
├── src/
│   ├── db/
│   │   ├── index.ts                       # Drizzle client
│   │   └── schema.ts                      # Table definitions
│   ├── lib/
│   │   └── filters.ts                     # Evaluator logic
│   └── scripts/
│       └── verify-db.ts                   # Verification script
├── tests/
│   └── filter-evaluator.test.ts           # Unit tests
└── docs/
    └── DATABASE_SETUP.md                  # This file
```

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Vitest Testing Framework](https://vitest.dev/)
