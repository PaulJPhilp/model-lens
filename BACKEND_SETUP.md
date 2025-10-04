# Backend API Setup Guide

Complete guide to set up and verify the Filter API backend.

## Prerequisites

### 1. PostgreSQL Database

You need a running PostgreSQL instance (12+).

**Option A: Local PostgreSQL (macOS)**
```bash
# Install via Homebrew
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

# Verify it's running
docker ps | grep modellens-postgres
```

**Option C: Cloud (Neon, Supabase, etc.)**

Get a free PostgreSQL database from:
- [Neon](https://neon.tech) - Serverless Postgres
- [Supabase](https://supabase.com) - Full platform with Postgres
- [Railway](https://railway.app) - Easy deployment
- [Render](https://render.com) - Free tier available

Copy the connection string provided.

### 2. Environment Variables

Create `.env` file in project root:

```bash
# Create .env file
cat > .env << 'EOF'
# PostgreSQL connection string
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens

# For cloud databases, use the connection string provided:
# DATABASE_URL=postgres://user:pass@host.region.provider.com:5432/dbname?sslmode=require
EOF
```

**Connection String Format:**
```
postgres://username:password@host:port/database
```

**Examples:**
```bash
# Local
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens

# Docker
DATABASE_URL=postgres://postgres:password@localhost:5432/modellens

# Neon
DATABASE_URL=postgres://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb

# Supabase
DATABASE_URL=postgres://postgres:pass@db.projectref.supabase.co:5432/postgres
```

### 3. Run Migrations

Apply database schema:

```bash
# Test connection and run migrations
bun run src/scripts/verify-db.ts
```

Expected output:
```
✓ Database connection successful
✓ Migration applied: db/migrations/0001_create_saved_filters.sql
✓ Sample filter inserted
✓ Sample filter queried
✓ Filter evaluation successful
All checks passed!
```

## Quick Setup (Copy-Paste)

### For Local PostgreSQL

```bash
# 1. Install and start PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# 2. Create database
createdb modellens

# 3. Create .env
echo 'DATABASE_URL=postgres://postgres@localhost:5432/modellens' > .env

# 4. Run migrations
bun run src/scripts/verify-db.ts

# 5. Start dev server
npm run dev

# 6. Test API
bun run src/scripts/test-api-endpoints.ts
```

### For Docker

```bash
# 1. Start PostgreSQL
docker run -d \
  --name modellens-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=modellens \
  -p 5432:5432 \
  postgres:16

# 2. Wait for it to start (5-10 seconds)
sleep 10

# 3. Create .env
echo 'DATABASE_URL=postgres://postgres:password@localhost:5432/modellens' > .env

# 4. Run migrations
bun run src/scripts/verify-db.ts

# 5. Start dev server
npm run dev

# 6. Test API
bun run src/scripts/test-api-endpoints.ts
```

## Verify Setup

### Step 1: Database Connection

```bash
bun run src/scripts/verify-db.ts
```

Should output:
- ✓ Database connection successful
- ✓ Migration applied
- ✓ Sample filter operations work

### Step 2: API Endpoints

```bash
# Make sure dev server is running
npm run dev

# In another terminal, run tests
bun run src/scripts/test-api-endpoints.ts
```

Expected: All tests pass (15 tests)

### Step 3: Manual API Test

```bash
# Create a filter
curl -X POST http://localhost:3002/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "Test Filter",
    "rules": [{
      "field": "provider",
      "operator": "eq",
      "value": "openai",
      "type": "hard"
    }]
  }'

# Should return 201 with filter object
```

## API Endpoints Overview

All endpoints are under `/api/filters`:

### POST /api/filters
**Create a new filter**

Request:
```json
{
  "name": "Budget AI Models",
  "description": "Models under $5/M tokens",
  "visibility": "private",
  "rules": [
    {
      "field": "inputCost",
      "operator": "lte",
      "value": 5,
      "type": "hard"
    }
  ]
}
```

Response: `201 Created` with filter object

### GET /api/filters
**List all accessible filters**

Query params:
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)
- `visibility` - Filter type: 'all', 'private', 'team', 'public'

Response: `200 OK` with list

### GET /api/filters/[id]
**Get single filter**

Response: `200 OK` with filter object

### PUT /api/filters/[id]
**Update filter (owner only)**

Request: Partial filter object

Response: `200 OK` with updated filter

### DELETE /api/filters/[id]
**Delete filter (owner only)**

Response: `200 OK` with `{ success: true }`

### POST /api/filters/[id]/evaluate
**Apply filter and get matches**

Request:
```json
{
  "modelIds": ["gpt-4", "claude-3-opus"],  // Optional
  "limit": 50                               // Optional (max: 500)
}
```

Response: `200 OK` with evaluation results

**Side Effects:**
- Updates `lastUsedAt` timestamp
- Increments `usageCount`

## Auth & Visibility

### Development Mode

Auth uses custom headers:

```bash
# Set user ID
-H "x-user-id: user-123"

# Set team ID (for team filters)
-H "x-team-id: team-456"
```

If no headers provided, uses default dev user: `00000000-0000-0000-0000-000000000001`

### Visibility Rules

| Visibility | Who Can Read | Who Can Modify |
|------------|--------------|----------------|
| private    | Owner only   | Owner only     |
| team       | Team members | Owner only     |
| public     | Everyone     | Owner only     |

### Production Setup

Replace `app/api/filters/auth.ts` with your auth provider:

**NextAuth Example:**
```typescript
import { getServerSession } from 'next-auth';

export async function getAuthContext(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    userId: session.user.id,
    teamId: session.user.teamId,
    isAuthenticated: true,
  };
}
```

## Troubleshooting

### Error: "database does not exist"

**Fix:**
```bash
createdb modellens
# or
docker exec -it modellens-postgres createdb -U postgres modellens
```

### Error: "connection refused"

**Cause:** PostgreSQL not running

**Fix:**
```bash
# Local
brew services start postgresql@16

# Docker
docker start modellens-postgres
```

### Error: "relation saved_filters does not exist"

**Cause:** Migrations not run

**Fix:**
```bash
bun run src/scripts/verify-db.ts
```

### 500 errors from API

**Check:**
1. DATABASE_URL is set: `echo $DATABASE_URL`
2. Database is running: `psql $DATABASE_URL -c "SELECT 1"`
3. Migrations applied: Table exists
4. Check server logs for detailed error

### Tests failing

**Common causes:**
1. DATABASE_URL not set → Create `.env`
2. Dev server not running → `npm run dev`
3. Database not migrated → Run `verify-db.ts`
4. Port conflict → Check port in error message

## File Structure

```
app/api/filters/
├── route.ts                      # POST (create), GET (list)
├── [id]/
│   ├── route.ts                  # GET, PUT, DELETE
│   └── evaluate/
│       └── route.ts              # POST (evaluate)
├── auth.ts                       # Auth helpers
├── types.ts                      # TypeScript types
└── *.test.ts                     # Test files

src/
├── db/
│   ├── index.ts                  # Database client
│   └── schema.ts                 # Drizzle schema
├── lib/
│   └── filters.ts                # Filter evaluation logic
└── scripts/
    ├── verify-db.ts              # Database setup script
    └── test-api-endpoints.ts     # E2E API tests

db/migrations/
└── 0001_create_saved_filters.sql # Initial schema
```

## Validation Rules

### Create Filter

**Required:**
- `name` - Non-empty string
- `rules` - Non-empty array

**Conditional:**
- `teamId` - Required if `visibility='team'`

**Defaults:**
- `visibility` - 'private'
- `description` - null

### Update Filter

All fields optional. Only provided fields are updated.

**Validation:**
- `rules` - If provided, must be non-empty
- `teamId` - Required if changing to `visibility='team'`

### Evaluate Filter

**Optional:**
- `modelIds` - Filter to specific models
- `limit` - Max results (default: 50, max: 500)

## Performance

### Database Indexes

Schema includes indexes for:
- `owner_id` - Fast lookup of user's filters
- `(team_id, visibility)` - Fast team filter queries

### Query Optimization

- List endpoint uses pagination (max 100 items)
- Evaluate endpoint limits results (max 500)
- Usage stats updated atomically

### Caching (Optional)

Consider adding:
- Redis for filter list caching
- CDN for public filter results
- Rate limiting on evaluate endpoint

## Security

### Current Implementation

✅ **Implemented:**
- Visibility enforcement (private/team/public)
- Owner-only modification
- Input validation (SQL injection prevention via Drizzle)
- Parameter sanitization

⚠️ **TODO for Production:**
- [ ] Real authentication (replace dev stubs)
- [ ] Rate limiting (prevent abuse)
- [ ] Request size limits
- [ ] CORS configuration
- [ ] API key/token rotation
- [ ] Audit logging

### Recommended Additions

**Rate Limiting:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// In route handler
const { success } = await ratelimit.limit(userId);
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}
```

## Monitoring

### Logs to Monitor

- Filter creation/updates (audit trail)
- Evaluation requests (usage patterns)
- Failed requests (errors, auth failures)
- Slow queries (performance)

### Metrics to Track

- Filters per user
- Evaluations per filter
- Most used filters
- Average evaluation time
- Error rates by endpoint

### Example Logging

```typescript
console.log('[FILTER_CREATED]', {
  userId,
  filterId: filter.id,
  visibility: filter.visibility,
  ruleCount: filter.rules.length,
});

console.log('[FILTER_EVALUATED]', {
  filterId,
  userId,
  matchCount: results.matchCount,
  totalEvaluated: results.totalEvaluated,
  duration: Date.now() - startTime,
});
```

## Next Steps

1. ✅ Complete this setup guide
2. ✅ Run `verify-db.ts` to set up database
3. ✅ Run `test-api-endpoints.ts` to verify all endpoints
4. ✅ Test UI at `/filters` page
5. ⬜ Replace auth stubs with real auth
6. ⬜ Add rate limiting for production
7. ⬜ Set up monitoring/logging
8. ⬜ Configure backup strategy

## Support

For issues:
1. Check troubleshooting section above
2. Review logs in terminal
3. Test with curl to isolate frontend vs backend
4. Check database connection with psql

## References

- [API Routes Documentation](app/api/filters/README.test.md)
- [Database Schema](src/db/schema.ts)
- [Filter Evaluation Logic](src/lib/filters.ts)
- [Frontend Components](components/README.filters.md)
