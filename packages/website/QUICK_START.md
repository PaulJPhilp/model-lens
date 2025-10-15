# Quick Start Guide - Filter System

Get the complete filter system up and running in 5 minutes.

## Prerequisites

- ✅ Node.js 18+ and Bun installed
- ✅ PostgreSQL 12+ running
- ✅ Project dependencies installed (`bun install`)

## 1. Database Setup (1 minute)

### Option A: Local PostgreSQL

```bash
# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb modellens

# Create .env
echo 'DATABASE_URL=postgres://postgres@localhost:5432/modellens' > .env
```

### Option B: Docker

```bash
# Start PostgreSQL
docker run -d \
  --name modellens-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=modellens \
  -p 5432:5432 \
  postgres:16

# Create .env
echo 'DATABASE_URL=postgres://postgres:password@localhost:5432/modellens' > .env
```

## 2. Run Migrations (30 seconds)

```bash
bun run src/scripts/verify-db.ts
```

**Expected output:**
```
✓ Database connection successful
✓ Migration applied
✓ Sample filter inserted
✓ All checks passed!
```

## 3. Start Dev Server (10 seconds)

```bash
npm run dev
```

**Server starts at:** http://localhost:3002

## 4. Test Backend API (30 seconds)

In a new terminal:

```bash
bun run src/scripts/test-api-endpoints.ts
```

**Expected:** 15/15 tests pass ✅

## 5. Test Frontend UI (1 minute)

1. Open browser: http://localhost:3002/filters
2. Click "Create Filter"
3. Fill in:
   - Name: "Test Filter"
   - Add rule: `provider` `eq` `openai` (hard)
4. Click "Create Filter"
5. Click "Apply Filter" on your new filter
6. View results! 🎉

## Verification Checklist

- [ ] Database connected
- [ ] Migrations applied
- [ ] Dev server running
- [ ] API tests pass
- [ ] UI loads at /filters
- [ ] Can create filter
- [ ] Can apply filter
- [ ] See evaluation results

## What's Next?

### Explore the UI

**Navigate:** http://localhost:3002/filters

**Try:**
- Create filters with different rule types
- Test hard vs soft clauses
- Apply filters and view matches
- Edit and delete filters
- Change visibility settings

### Explore the API

**Create a filter:**
```bash
curl -X POST http://localhost:3002/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "Budget Models",
    "rules": [{
      "field": "inputCost",
      "operator": "lte",
      "value": 5,
      "type": "hard"
    }]
  }'
```

**List filters:**
```bash
curl "http://localhost:3002/api/filters?page=1&pageSize=20" \
  -H "x-user-id: test-user"
```

**Apply a filter:**
```bash
# Replace FILTER_ID with actual ID from create response
curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{"limit": 10}'
```

## Troubleshooting

### "Database does not exist"

```bash
createdb modellens
```

### "Connection refused"

Start PostgreSQL:
```bash
brew services start postgresql@16
```

### "Relation saved_filters does not exist"

Run migrations:
```bash
bun run src/scripts/verify-db.ts
```

### "Port 3002 in use"

Stop the other process or change port in package.json

## Documentation

**Quick Guides:**
- `QUICK_START.md` - This file
- `BACKEND_SETUP.md` - Detailed setup
- `FILTERS_FRONTEND.md` - Frontend guide

**Detailed Docs:**
- `BACKEND_IMPLEMENTATION_SUMMARY.md` - Backend architecture
- `ACCEPTANCE_TESTS.md` - Test procedures
- `components/README.filters.md` - Component reference
- `docs/API_ROUTES.md` - API documentation

## Example: Complete Workflow

### Create a Budget Filter

1. **Via UI:**
   - Go to /filters
   - Click "Create Filter"
   - Name: "Budget AI Models"
   - Description: "Models under $5/M input tokens"
   - Add rules:
     - `inputCost` `lte` `5` (hard clause)
     - `capabilities` `contains` `reasoning` (soft, weight 0.7)
   - Click "Create Filter"

2. **Via API:**
   ```bash
   curl -X POST http://localhost:3002/api/filters \
     -H "Content-Type: application/json" \
     -H "x-user-id: my-user" \
     -d '{
       "name": "Budget AI Models",
       "description": "Models under $5/M input tokens",
       "rules": [
         {
           "field": "inputCost",
           "operator": "lte",
           "value": 5,
           "type": "hard"
         },
         {
           "field": "capabilities",
           "operator": "contains",
           "value": "reasoning",
           "type": "soft",
           "weight": 0.7
         }
       ]
     }'
   ```

### Apply the Filter

1. **Via UI:**
   - Find filter in list
   - Click "Apply Filter"
   - View results modal showing matches

2. **Via API:**
   ```bash
   curl -X POST http://localhost:3002/api/filters/FILTER_ID/evaluate \
     -H "Content-Type: application/json" \
     -H "x-user-id: my-user" \
     -d '{"limit": 20}'
   ```

### Update the Filter

1. **Via UI:**
   - Click "Edit" on filter
   - Modify name or rules
   - Click "Update Filter"

2. **Via API:**
   ```bash
   curl -X PUT http://localhost:3002/api/filters/FILTER_ID \
     -H "Content-Type: application/json" \
     -H "x-user-id: my-user" \
     -d '{
       "description": "Updated: Models under $5/M tokens with reasoning"
     }'
   ```

## Features at a Glance

### ✅ CRUD Operations
- Create, read, update, delete filters
- Visibility controls (private/team/public)
- Team collaboration

### ✅ Filter Rules
- 12 model fields (provider, costs, capabilities, etc.)
- 8 operators (eq, ne, gt, gte, lt, lte, in, contains)
- Hard clauses (must match)
- Soft clauses (weighted scoring 0-1)

### ✅ Evaluation
- Apply filters to model registry
- Get matching models with scores
- See detailed rationale for each match
- Deterministic results

### ✅ UI Components
- FilterList - Complete management interface
- FilterEditor - Create/edit form
- Results modal - View evaluation results
- Pagination and filtering

### ✅ API
- RESTful endpoints
- Full TypeScript typing
- Comprehensive error handling
- Auth ready (dev stubs included)

## Architecture Overview

```
Frontend (React/Next.js)
    ↓
API Routes (/api/filters)
    ↓
Database (PostgreSQL + Drizzle ORM)
    ↓
Filter Evaluation (Pure Function)
    ↓
Results
```

## Files Overview

**Frontend:**
- `components/FilterEditor.tsx` - Create/edit form
- `components/FilterList.tsx` - Management UI
- `app/filters/page.tsx` - Filters page

**Backend:**
- `app/api/filters/route.ts` - Create, list
- `app/api/filters/[id]/route.ts` - Get, update, delete
- `app/api/filters/[id]/evaluate/route.ts` - Apply
- `app/api/filters/auth.ts` - Authentication
- `app/api/filters/types.ts` - TypeScript types

**Database:**
- `src/db/index.ts` - Database client
- `src/db/schema.ts` - Drizzle schema
- `db/migrations/0001_create_saved_filters.sql` - Migration

**Logic:**
- `src/lib/filters.ts` - Filter evaluation engine

**Tests:**
- `app/api/filters/*.test.ts` - 45 unit tests
- `src/scripts/test-api-endpoints.ts` - 15 E2E tests

## Performance

**Expected Response Times:**
- Create filter: <100ms
- List filters: <200ms
- Get filter: <50ms
- Update filter: <100ms
- Delete filter: <50ms
- Evaluate (50 models): <500ms

## Support

**Issues?**
1. Check troubleshooting section above
2. See BACKEND_SETUP.md for detailed setup
3. Review logs in terminal
4. Test with curl to isolate issues

**Everything working?** 🎉

You're ready to:
- Create custom filters
- Apply them to find models
- Build your own features on top
- Deploy to production (after auth setup)

---

**Total setup time:** ~5 minutes ⚡

**Get started now!** 🚀
