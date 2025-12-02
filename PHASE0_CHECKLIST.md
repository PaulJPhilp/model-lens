# Phase 0 Deployment Checklist

## Status: IN PROGRESS ✅

### ✅ Step 1: Install/Verify Vercel CLI
- [x] Vercel CLI installed (v48.3.0)
- [x] Verified via `vercel --version`

### ✅ Step 2: Link Project to Vercel
- [x] Project already linked to Vercel
- [x] Project ID: `prj_oQlCLOzpaT88kiqWM3Yh52pZMy4R`
- [x] Organization: `buddybuilder`
- [x] Project name: `model-lens`
- [x] Vercel dashboard: https://vercel.com/dashboard

### ⏳ Step 3: Create/Verify Vercel PostgreSQL Database

**Status**: Currently checking existing Postgres instance

**Current Environment Variables**:
- ✅ `DATABASE_URL` - exists (Production, Development)

**Required DATABASE Variables**:
- `DATABASE_URL` - Pooled connection (for API)
- `POSTGRES_URL_NON_POOLING` - Non-pooled connection (for migrations)

**Action**: Need to check Vercel Postgres status and create if not exists

**Manual Steps**:
```bash
# 1. Go to Vercel Dashboard
https://vercel.com/dashboard

# 2. Select model-lens project

# 3. Go to Storage tab

# 4. Click "Create Database" → Postgres
   - Name: effect-models
   - Region: us-east-1

# 5. Copy connection strings

# 6. Add to Vercel environment:
vercel env add POSTGRES_URL_NON_POOLING
# Paste the NON_POOLING connection string
```

### ⏳ Step 4: Create Upstash Redis

**Status**: Not yet created

**Required REDIS Variables**:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

**Action**: Manual setup at Upstash

**Manual Steps**:
```bash
# 1. Go to Upstash Console
https://console.upstash.com

# 2. Create new Redis database
   - Name: effect-models-staging
   - Region: us-east-1
   - Eviction: allkeys-lru
   - Type: Serverless

# 3. Copy REST API credentials:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN

# 4. Add to Vercel environment:
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# 5. Verify connection:
redis-cli -u $UPSTASH_REDIS_REST_URL PING
# Should return: PONG
```

### ⏳ Environment Variables to Add

```bash
# Database (after creating Vercel Postgres)
POSTGRES_URL_NON_POOLING=postgresql://...

# Cache
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# App Config (if not set)
NODE_ENV=production
PORT=3000

# API Retry Configuration
API_RETRY_MS=1500
MODEL_SERVICE_RETRY_MS=2000
SYNC_TIMEOUT_MS=45000
```

## Files Created

- ✅ `vercel.json` - Vercel configuration
- ✅ `PHASE0_CHECKLIST.md` - This checklist

## Next Actions

### Required (Blocking)
1. [ ] Create/verify Vercel Postgres database
   - [ ] Get `DATABASE_URL` (pooled)
   - [ ] Get `POSTGRES_URL_NON_POOLING` (non-pooled)
   - [ ] Add both to Vercel environment

2. [ ] Create Upstash Redis
   - [ ] Create account at https://console.upstash.com
   - [ ] Create database
   - [ ] Get REST API credentials
   - [ ] Add to Vercel environment

### Optional (Nice to Have)
- [ ] Set additional environment variables (retry configs)
- [ ] Test local connection to production database
- [ ] Create database backups policy

## Estimated Time Remaining
- Create Vercel Postgres: 10 minutes
- Create Upstash Redis: 10 minutes
- Add environment variables: 5 minutes
- **Total**: ~25 minutes

## Done When

✅ Phase 0 is complete when:
- [x] Vercel CLI working
- [x] Project linked to Vercel
- [ ] Vercel Postgres created with both connection strings
- [ ] Upstash Redis created with REST API credentials
- [ ] All environment variables added to Vercel
- [ ] Can connect to database: `psql $DATABASE_URL -c "SELECT 1;"`
- [ ] Can connect to Redis: `redis-cli -u $UPSTASH_REDIS_REST_URL PING`
