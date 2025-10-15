# API Filter Tests

Complete test suite for all `/api/filters` endpoints.

## Test Files

- `route.test.ts` - Tests for POST /api/filters (create) and GET /api/filters (list)
- `[id]/route.test.ts` - Tests for GET/PUT/DELETE /api/filters/[id]
- `[id]/evaluate/route.test.ts` - Tests for POST /api/filters/[id]/evaluate

## Test Coverage

### POST /api/filters (Create Filter)
- ✅ Create new private filter
- ✅ Create team filter with teamId
- ✅ Reject request without name
- ✅ Reject request without rules
- ✅ Reject request with empty rules array
- ✅ Reject team visibility without teamId
- ✅ Default to private visibility when not specified

### GET /api/filters (List Filters)
- ✅ List all accessible filters with visibility=all
- ✅ List only private filters with visibility=private
- ✅ List only public filters with visibility=public
- ✅ List only team filters with visibility=team
- ✅ Respect pagination parameters
- ✅ Enforce max page size of 100
- ✅ Default to page=1 and pageSize=20

### GET /api/filters/[id] (Get Filter)
- ✅ Get filter by id for owner
- ✅ Allow anyone to get public filter
- ✅ Allow team member to get team filter
- ✅ Return 403 when user cannot access private filter
- ✅ Return 403 when non-team-member tries to access team filter
- ✅ Return 404 for non-existent filter

### PUT /api/filters/[id] (Update Filter)
- ✅ Update filter name and description
- ✅ Update filter visibility
- ✅ Update filter rules
- ✅ Allow setting description to null
- ✅ Return 403 when non-owner tries to update
- ✅ Return 404 for non-existent filter
- ✅ Validate empty rules array
- ✅ Require teamId when changing to team visibility

### DELETE /api/filters/[id] (Delete Filter)
- ✅ Delete filter when called by owner
- ✅ Return 403 when non-owner tries to delete
- ✅ Return 404 for non-existent filter

### POST /api/filters/[id]/evaluate (Evaluate Filter)
- ✅ Evaluate filter and return matching models
- ✅ Filter by hard clauses correctly
- ✅ Calculate soft clause scores
- ✅ Respect limit parameter
- ✅ Enforce max limit of 500
- ✅ Filter by specific model IDs
- ✅ Update filter usage stats (usageCount, lastUsedAt)
- ✅ Allow non-owner to evaluate public filter
- ✅ Return 403 when user cannot access private filter
- ✅ Return 404 for non-existent filter
- ✅ Handle empty request body
- ✅ Handle models API failure gracefully
- ✅ Count matches correctly
- ✅ Provide meaningful rationale

**Total: 45 tests**

## Prerequisites

### 1. PostgreSQL Database

You need a running PostgreSQL instance (version 12+).

**Option A: Local PostgreSQL**
```bash
# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb modellens
```

**Option B: Docker**
```bash
docker run -d \
  --name modellens-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=modellens \
  -p 5432:5432 \
  postgres:16
```

**Option C: Cloud (Supabase, Neon, etc.)**
Get a free PostgreSQL database from Supabase or Neon and use the connection string.

### 2. Environment Variables

Create `.env` file in project root:

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens
```

Or for test database:

```bash
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens_test
```

### 3. Run Migrations

```bash
bun run src/scripts/verify-db.ts
```

This will:
- Test database connection
- Run migrations (create saved_filters table)
- Insert a test filter
- Verify it works

## Running Tests

### Run All API Tests

```bash
bun test app/api/filters
```

### Run Specific Test File

```bash
# Test create/list endpoints
bun test app/api/filters/route.test.ts

# Test get/update/delete endpoints
bun test app/api/filters/[id]/route.test.ts

# Test evaluate endpoint
bun test app/api/filters/[id]/evaluate/route.test.ts
```

### Watch Mode

```bash
bun test --watch app/api/filters
```

### With Coverage

```bash
bun test --coverage app/api/filters
```

## Test Database Management

The tests use the database specified in `DATABASE_URL`. Each test:
1. Creates test data in `beforeEach`
2. Runs the test
3. Cleans up test data in `afterEach`

### Using a Separate Test Database

Recommended for safety:

```bash
# Create test database
createdb modellens_test

# Set DATABASE_URL for tests only
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens_test \
  bun test app/api/filters
```

### Reset Test Database

If tests leave stale data:

```bash
# Drop and recreate
dropdb modellens_test
createdb modellens_test

# Re-run migrations
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens_test \
  bun run src/scripts/verify-db.ts
```

## Troubleshooting

### Error: database "paul" does not exist

This means `DATABASE_URL` is not set and pg is using default connection.

**Fix:** Create `.env` file with `DATABASE_URL`

### Error: relation "saved_filters" does not exist

Migrations haven't been run.

**Fix:** Run migrations:
```bash
bun run src/scripts/verify-db.ts
```

### Tests hang or timeout

Database connection pool not closing.

**Fix:** Ensure `afterEach` cleanup is running. Add timeout:
```bash
bun test --timeout=10000 app/api/filters
```

### Port 5432 connection refused

PostgreSQL not running.

**Fix:** Start PostgreSQL:
```bash
# macOS
brew services start postgresql@16

# Docker
docker start modellens-postgres
```

## CI/CD Integration

For GitHub Actions:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: modellens_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run src/scripts/verify-db.ts
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/modellens_test
      - run: bun test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/modellens_test
```

## Test Architecture

### Mock Strategy

- **Database calls:** Real database (integration tests)
- **External APIs:** Mocked (e.g., `fetch` for /api/models)
- **Auth:** Uses test headers (`x-user-id`, `x-team-id`)

### Test Users

Tests use these mock user IDs:
- `test-user-123` - Generic test user
- `user-owner` - Filter owner
- `user-other` - Different user (for permission tests)
- `team-123` / `team-456` - Team IDs

### Test Isolation

Each test is isolated:
- Uses unique IDs or cleans up in `afterEach`
- No test depends on another test's state
- Tests can run in any order or in parallel

## Writing New Tests

Example structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { db } from '@/src/db';
import { savedFilters } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

describe('GET /api/filters/new-endpoint', () => {
  const testUserId = 'test-user';
  let testFilterId: string;

  beforeEach(async () => {
    // Create test data
    const [filter] = await db
      .insert(savedFilters)
      .values({ /* ... */ })
      .returning();
    testFilterId = filter.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(savedFilters).where(eq(savedFilters.id, testFilterId));
  });

  it('should do something', async () => {
    const request = new NextRequest('http://localhost:3000/api/filters', {
      headers: { 'x-user-id': testUserId },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('someField');
  });
});
```
