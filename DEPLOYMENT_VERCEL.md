# Effect Models - Vercel Deployment Implementation

## Overview

This document provides a **Vercel-specific implementation guide** for deploying Effect Models to production. It supersedes the generic `DEPLOYMENT_IMPLEMENTATION.md` with Vercel best practices.

**Target Stack**:
- **Hosting**: Vercel (serverless functions)
- **Database**: Vercel Postgres (managed PostgreSQL)
- **Cache**: Upstash Redis (serverless Redis)
- **Monitoring**: Vercel Analytics + Datadog
- **CI/CD**: Vercel + GitHub integration (automatic)

**Timeline**: 1-2 weeks to production

---

## Phase 0: Initial Setup (1 day)

### 0.1 Install Vercel CLI

```bash
npm install -g vercel
# or
brew install vercel
```

### 0.2 Link Project to Vercel

```bash
cd /Users/paul/Projects/In-Progress/effect-models

# Login to Vercel
vercel login

# Link project
vercel link
# Follow prompts:
# - Create new project: "effect-models"
# - Select "TypeScript" framework
# - Root directory: "."
# - Build command: "bun run build"
# - Output directory: "dist"
```

**Vercel Project Created**: https://vercel.com/dashboard

---

### 0.3 Create Vercel PostgreSQL Database

**Option A: Vercel Postgres (Recommended)**

```bash
# In Vercel Dashboard:
# 1. Go to Storage tab
# 2. Click "Create Database"
# 3. Select "Postgres"
# 4. Choose region (us-east-1 recommended)
# 5. Name: "effect-models"

# After creation, Vercel automatically adds these env vars:
# POSTGRES_PRISMA_URL
# POSTGRES_URL
# POSTGRES_URL_NON_POOLING
# etc.

# Verify connection
vercel env pull  # Download environment variables
psql $POSTGRES_URL -c "SELECT version();"
```

**Limitations of Vercel Postgres**:
- Max 3GB storage (starter tier)
- Billed per database, not per usage
- No direct SSH access

**Option B: External PostgreSQL (AWS RDS)**

If you need more control:

```bash
# Create RDS database
# Use AWS Console or CLI

# Note the connection string:
DATABASE_URL=postgresql://user:pass@db.xxx.rds.amazonaws.com:5432/effect_models

# Add to Vercel:
vercel env add DATABASE_URL
# Paste the connection string
```

**Recommendation**: Use Vercel Postgres for MVP (simplicity), migrate to RDS later if needed.

---

### 0.4 Create Upstash Redis

```bash
# Visit https://console.upstash.com
# Sign in with GitHub

# Create new database:
# Name: effect-models-staging
# Region: us-east-1
# Eviction policy: allkeys-lru

# Get REST API credentials:
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Add to Vercel:
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN

# Verify
redis-cli -u $UPSTASH_REDIS_REST_URL PING
# Should return: PONG
```

**Checklist**:
- [ ] Vercel Postgres created
- [ ] Connection string accessible
- [ ] Upstash Redis created
- [ ] Environment variables set in Vercel

---

## Phase 1: Connect Repository (30 minutes)

### 1.1 Configure GitHub Integration

```bash
# In Vercel Dashboard:
# 1. Settings > Git Integration
# 2. Connect GitHub
# 3. Select repository: PaulJPhilp/model-lens
# 4. Grant permissions

# Or use CLI:
vercel link --repo PaulJPhilp/model-lens
```

**Auto-deployment Enabled**:
- `main` branch → production
- Pull requests → preview deployments
- `develop` branch → staging (optional)

---

### 1.2 Configure Build Settings

**Vercel Project Settings**:

```
Framework: Other (using Bun)
Build Command: bun run build
Output Directory: dist (or .next if using Next.js)
Install Command: bun install
```

**To Update**:
1. Vercel Dashboard → Settings → General
2. Update "Build and Output Settings"
3. Save

---

### 1.3 Create vercel.json Configuration

**File**: `vercel.json`

```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "devCommand": "bun run dev",
  "framework": null,
  "outputDirectory": "dist",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "functions": {
    "packages/website/src/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

**Note**: Vercel has limited Bun support. May need to use Node.js runtime with Bun compatibility.

---

## Phase 2: Environment Configuration (30 minutes)

### 2.1 Set Production Environment Variables

**In Vercel Dashboard**:

```
Settings > Environment Variables
```

**Add these variables**:

```env
# Database (auto-added by Vercel Postgres)
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Cache
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# App Config
NODE_ENV=production
PORT=3000

# API Retry Configuration
API_RETRY_MS=1500
MODEL_SERVICE_RETRY_MS=2000
SYNC_TIMEOUT_MS=45000

# Monitoring (optional)
DATADOG_API_KEY=xxx (if using Datadog)
SENTRY_DSN=https://xxx@sentry.io/xxx (if using Sentry)
```

**Environment Scope**:
- Set each variable for: Production, Preview, Development

---

### 2.2 Create .env.local for Local Development

```bash
# Copy from Vercel
vercel env pull

# This creates .env.local with staging/preview variables
# Never commit this file

# For production testing locally:
vercel env pull --environment production
```

---

### 2.3 Secrets Management

**For sensitive values** (API keys, tokens):

```bash
# Store in Vercel Secrets:
vercel env add --secret UPSTASH_REDIS_REST_TOKEN

# Or manually in Dashboard:
# Settings > Environment Variables > [use secret values]

# Reference in code:
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
```

---

## Phase 3: Database Setup (1 hour)

### 3.1 Create Database Migrations

**Vercel Postgres with Drizzle**:

```bash
cd packages/website

# Generate migration from schema
bun run db:generate

# Create migration file in db/migrations/

# Apply migration to Vercel Postgres:
bun run db:push
```

**Connection String**: Use `POSTGRES_URL_NON_POOLING` for migrations (Vercel Postgres requirement)

```bash
# In drizzle.config.ts:
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING!,
  },
})
```

---

### 3.2 Verify Schema

```bash
# List tables
vercel postgres exec "SELECT tablename FROM pg_tables WHERE schemaname='public';"

# Or via psql:
psql $POSTGRES_URL -c "\dt"
```

**Expected tables**:
- models
- model_syncs (if filter feature enabled)
- Other app-specific tables

---

### 3.3 Create Database Backup

```bash
# Vercel Postgres: Automatic daily backups
# Check in Vercel Dashboard > Storage > Postgres > Backups

# Restore from backup if needed:
# Use Vercel Dashboard > Restore
```

---

## Phase 4: Local Testing (1 day)

### 4.1 Test Locally with Production Config

```bash
# Pull production environment
vercel env pull --environment production > /dev/null

# Start dev server
bun run dev

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/v1/models?limit=1

# Test with production database:
# Edit .env.local to use POSTGRES_URL instead of local DB
# Restart dev server
# Verify it connects to Vercel Postgres
```

---

### 4.2 Run Full Test Suite

```bash
bun run lint
bun run check
bun run test
```

**Expected Results**:
- ✅ All tests passing
- ✅ No type errors
- ✅ Code quality checks pass

---

### 4.3 Build Production Bundle

```bash
# Build for production
bun run build

# Verify build output
ls -la dist/

# Test built version
# (May need to adapt for Vercel)
```

---

## Phase 5: Deploy to Staging (Preview)

### 5.1 Create Staging Branch

```bash
git checkout -b develop

# Or push to develop branch:
git push origin develop

# In Vercel Dashboard:
# Settings > Git > Auto-deploy branches
# Add "develop" → staging environment
```

**Vercel Preview URLs** (auto-generated):
- `develop` branch: https://effect-models-develop.vercel.app
- PRs: https://effect-models-pr-123.vercel.app

---

### 5.2 Deploy to Preview

**Option A: Automatic (Recommended)**

```bash
# Push to develop branch
git push origin develop

# Vercel automatically deploys
# Check Deployments tab in Vercel Dashboard
# Wait for "Ready" status
```

**Option B: Manual**

```bash
# Deploy specific branch
vercel deploy --prod --scope=username

# Or to preview:
vercel deploy
```

---

### 5.3 Run Staging Migrations

```bash
# Use Vercel Postgres CLI:
vercel postgres exec --command="..." --resource=effect-models-staging

# Or connect with psql:
psql $POSTGRES_URL_STAGING -f db/migrations/0001_*.sql
```

---

### 5.4 Smoke Tests (Staging)

```bash
# Test preview deployment
PREVIEW_URL="https://effect-models-develop.vercel.app"

curl $PREVIEW_URL/health
curl "$PREVIEW_URL/v1/models?limit=1"
curl -H "x-admin: true" "$PREVIEW_URL/v1/admin/sync/history"
```

**Expected Results**:
- ✅ All endpoints respond
- ✅ Status 200 OK
- ✅ Valid JSON responses

---

## Phase 6: CI/CD Pipeline (1 day)

### 6.1 GitHub Actions Workflow (Optional)

**Note**: Vercel has native GitHub integration. GitHub Actions is optional for additional checks.

**File**: `.github/workflows/test-and-deploy.yml`

```yaml
name: Test & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.3.1-canary.43'
      
      - run: bun install
      
      - name: Lint
        run: bun run lint
      
      - name: Type Check
        run: bun run check
      
      - name: Tests
        run: bun run test
      
      - name: Coverage
        run: bun run test:coverage
      
      - uses: codecov/codecov-action@v3

  deploy:
    # Vercel handles deployment automatically
    # This job just notifies or triggers additional checks
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - name: Trigger Vercel deployment
        run: |
          # Vercel already deployed via GitHub integration
          # This is optional - just log completion
          echo "Vercel deployment in progress..."
```

---

### 6.2 Enable Branch Protection

**In GitHub Repository Settings**:

```
Settings > Branches > Branch protection rules

For main branch:
- [x] Require pull request reviews
- [x] Require status checks to pass (GitHub Actions)
- [x] Require code quality checks
- [x] Require approvals before merge
```

---

### 6.3 Configure Deployment Rules

**In Vercel Dashboard**:

```
Settings > Git > Deploy on every push
Settings > Git > Preview deployments
- Deploy previews for pull requests: Yes
- Revert preview on merge: Yes
```

---

## Phase 7: Production Deployment (1 day)

### 7.1 Create Release Branch

```bash
# Create release branch
git checkout -b release/v0.1.0

# Update version
# Edit package.json, bump version
# Edit CHANGELOG.md

# Commit
git add package.json CHANGELOG.md
git commit -m "chore: release v0.1.0"

# Push to release branch
git push origin release/v0.1.0

# Create PR to main
# Title: "Release v0.1.0"
```

---

### 7.2 Pre-Deployment Checklist

**In PR**:
```
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Code quality checks pass
- [ ] Coverage acceptable
- [ ] Staging verified (no issues)
- [ ] Database migrations tested
- [ ] Performance baseline acceptable
- [ ] Security review completed
```

---

### 7.3 Merge to Main

```bash
# After approval, merge PR to main
# Vercel automatically deploys to production

# Monitor deployment:
# Vercel Dashboard > Deployments > main

# Wait for "Ready" status
```

**Auto-deployment Timeline**:
- Merge to main → GitHub notifies Vercel
- Vercel builds (~3-5 minutes)
- Vercel deploys to production (~30 seconds)
- Production live within 5 minutes

---

### 7.4 Smoke Tests (Production)

```bash
# Test production deployment
curl https://api.effectmodels.com/health
curl https://api.effectmodels.com/v1/models?limit=1
curl -H "x-admin: true" https://api.effectmodels.com/v1/admin/sync/history
```

**Monitor for 30 minutes**:
- [ ] No 500 errors
- [ ] Response time <500ms
- [ ] All endpoints working
- [ ] Database connected

---

### 7.5 Rollback Procedure

**If issues detected**:

```bash
# Option 1: Revert commit
git revert <commit-hash>
git push origin main
# Vercel auto-deploys the reverted version

# Option 2: Use Vercel Dashboard
# Deployments > Select previous deployment > Promote to production
# This is faster than git revert

# Time to rollback: <2 minutes
```

---

## Phase 8: Data Sync Setup (1-2 days)

### 8.1 Configure Sync via Vercel Cron

**Using Vercel Functions** (currently limited):

```bash
# Vercel has limited cron support for serverless functions
# Recommended: Use GitHub Actions instead
```

### 8.2 Set Up GitHub Actions Cron

**File**: `.github/workflows/sync-models.yml`

```yaml
name: Daily Model Data Sync

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
  workflow_dispatch  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.3.1-canary.43'
      
      - run: bun install
      
      - name: Run Sync
        run: bun run sync-models
        env:
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
          UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
          UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
      
      - name: Verify Sync
        run: |
          psql $POSTGRES_URL -t -c "SELECT COUNT(*) FROM models;" | grep -q '[0-9]\+'
          echo "Sync completed successfully"
        env:
          POSTGRES_URL: ${{ secrets.POSTGRES_URL }}
      
      - name: Notify Slack (Success)
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Data sync completed"}'
      
      - name: Notify Slack (Failure)
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"❌ Data sync failed"}'
```

---

### 8.3 Test Manual Sync

```bash
# Trigger via API endpoint
curl -X POST https://api.effectmodels.com/v1/admin/sync \
  -H "x-admin: true"

# Monitor logs
# In Vercel Dashboard: Logs tab
# Look for sync job output

# Wait for completion (30-45 minutes)

# Verify data
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM models;"
# Should show >1000 models
```

---

### 8.4 Schedule First Automated Sync

```bash
# GitHub Actions will run on schedule
# First sync: 2 hours from now at top of hour

# Manually trigger first sync:
curl -X POST https://api.effectmodels.com/v1/admin/sync \
  -H "x-admin: true" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Wait and verify
```

---

## Phase 9: Monitoring (1 day)

### 9.1 Enable Vercel Analytics

**Automatically enabled** in Vercel Dashboard:

```
Analytics > Web Vitals
- Monitors page performance
- Shows Core Web Vitals
- Historical trends
```

**Key Metrics**:
- Response time
- Error rate
- Requests per minute

---

### 9.2 Set Up Error Tracking

**Option A: Sentry (Recommended)**

```bash
# Create Sentry account
# https://sentry.io/

# Install SDK
bun add @sentry/node

# Initialize in your app
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

# Add environment variable to Vercel:
vercel env add SENTRY_DSN
# Paste Sentry DSN
```

**Option B: Vercel Analytics + Console Logs**

```bash
# Use Vercel's built-in analytics
# Logs appear in Vercel Dashboard > Logs tab
# Filter by status code, path, etc.
```

---

### 9.3 Configure Alerts

**Vercel Alerts**:

```
Settings > Alerts
- Failed deployments: Enable
- Threshold violations: Set limits
```

**Custom Alerts** (via third-party):

```bash
# Create Slack webhook
# https://api.slack.com/apps

# Test alert
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"✅ Test alert"}'
```

---

### 9.4 Create Monitoring Dashboard

**Using Vercel Dashboard**:
- Deployments page (recent deployments)
- Analytics tab (Web Vitals, requests)
- Logs tab (application logs)
- Function Logs (serverless function logs)

**Optional: Datadog**

```bash
# Create Datadog account
# https://www.datadoghq.com/

# Monitor Vercel metrics:
# Datadog integrates with Vercel via API
```

---

## Phase 10: Team Training (4 hours)

### 10.1 Create Deployment Runbook

**Document**: `docs/VERCEL_RUNBOOK.md`

```markdown
# Vercel Deployment Runbook

## Quick Links
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/PaulJPhilp/model-lens
- API: https://api.effectmodels.com
- Staging: https://effect-models-develop.vercel.app

## How to Deploy

### Deploy to Staging (Preview)
```bash
git checkout -b feature/my-feature
git push origin feature/my-feature
# Create PR - Vercel auto-deploys preview
# Preview URL: https://effect-models-pr-123.vercel.app
```

### Deploy to Production
```bash
# 1. Merge PR to main
git push origin main
# 2. Vercel auto-deploys
# 3. Check deployment status: https://vercel.com/dashboard
```

## Troubleshooting

### Build Failed
1. Check Vercel logs: Dashboard > Deployments > [failed] > Logs
2. Common issues:
   - Missing env vars: Check Settings > Environment Variables
   - Build command failure: Run `bun run build` locally
   - Bun version mismatch: Check vercel.json

### API Not Responding
1. Check deployment status: Is it "Ready"?
2. Check logs: Vercel Dashboard > Logs tab
3. Verify environment variables are set
4. Rollback to previous version if needed

### Database Connection Failed
1. Check POSTGRES_URL environment variable
2. Verify Vercel Postgres is running (Dashboard > Storage)
3. Check if database credentials changed
4. Test connection: `psql $POSTGRES_URL -c "SELECT 1;"`
```

---

### 10.2 Team Presentation

**Schedule**: 30-minute team sync

**Agenda**:
1. How to deploy (2 min demo)
2. How to check deployment status (2 min)
3. How to view logs (2 min)
4. What to do if deployment fails (3 min)
5. Q&A (5 min)

---

## Phase 11: Post-Deployment (Ongoing)

### 11.1 Monitor First Week

**Daily checks**:
- [ ] No failed deployments
- [ ] Error rate 0%
- [ ] Response time <500ms
- [ ] Data syncs completing

**Weekly review**:
- [ ] All metrics healthy
- [ ] Cost within budget
- [ ] Team confident with operations

---

### 11.2 Cost Tracking

**Vercel Pricing**:
- **Pro Plan**: $20/month (includes 100GB bandwidth, unlimited projects)
- **Database** (Postgres): $15/month (starter tier, 3GB)
- **Upstash Redis**: Pay-per-request (~$0.2-5/month)
- **Total**: ~$35-40/month

**Monitor spending**:
- Vercel Dashboard > Settings > Billing
- Upstash Console > Pricing

---

### 11.3 Optimization Opportunities

```
After 1 week:
- [ ] Review function execution time
- [ ] Check database query performance
- [ ] Review cache hit rate
- [ ] Assess CDN effectiveness

After 1 month:
- [ ] Plan database upgrade if needed
- [ ] Consider database replication
- [ ] Optimize cold start times
- [ ] Plan Phase 2 improvements
```

---

## Complete Checklist

### ✅ Setup (Phase 0-1)
- [ ] Vercel account created
- [ ] Project linked to GitHub
- [ ] Vercel Postgres database created
- [ ] Upstash Redis created
- [ ] Environment variables set

### ✅ Development (Phase 2-4)
- [ ] Local development working
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Build succeeds

### ✅ Staging (Phase 5)
- [ ] Preview deployments working
- [ ] Staging migrations applied
- [ ] Endpoints tested
- [ ] No 500 errors

### ✅ Production (Phase 7)
- [ ] Production database configured
- [ ] Production deployment successful
- [ ] Smoke tests pass
- [ ] Monitoring active

### ✅ Operations (Phase 8-11)
- [ ] Data sync automated
- [ ] Alerts configured
- [ ] Team trained
- [ ] Runbooks documented

---

## Vercel-Specific Features

### 1. Preview Deployments

```
Every PR automatically gets:
- Unique preview URL
- Separate environment (staging DB, Redis)
- Automatic cleanup on close
- Comment with link in PR
```

### 2. Analytics

```
Built-in Web Vitals tracking:
- Core Web Vitals (LCP, FID, CLS)
- Custom metrics
- Real-time dashboard
```

### 3. Edge Functions

```
Optional: Run code on Vercel Edge Network
- Geographically distributed
- Sub-50ms response times
- Perfect for cache invalidation, webhooks
```

### 4. Automatic Rollback

```
Built-in rollback to previous deployment:
- Dashboard > Deployments > [previous] > Promote
- Zero-downtime rollback
- <2 minute RTO
```

---

## Troubleshooting Guide

### Issue: Build Fails with "bun not found"

**Solution**: Update `vercel.json`

```json
{
  "installCommand": "npm install -g bun && bun install",
  "buildCommand": "bun run build"
}
```

### Issue: Environment Variables Not Loading

**Solution**: Check variable scope

```bash
# Ensure variables set for all environments:
# - Production
# - Preview
# - Development

vercel env list  # View all variables
```

### Issue: Database Connection Timeout

**Solution**: Use `POSTGRES_URL_NON_POOLING` for migrations

```bash
# In drizzle.config.ts
url: process.env.POSTGRES_URL_NON_POOLING
```

### Issue: Preview Deployment Stuck

**Solution**: Manually redeploy

```bash
# In Vercel Dashboard:
# Deployments > [stuck deployment] > ... > Redeploy
```

---

## Next Steps After Launch

### Week 1
- [ ] Monitor closely (daily)
- [ ] Verify sync working
- [ ] Review error logs
- [ ] Adjust alerts if needed

### Week 2-4
- [ ] Collect performance data
- [ ] Optimize if needed
- [ ] Plan Phase 2 features
- [ ] Document learnings

### Month 2+
- [ ] Add GraphQL endpoint
- [ ] Implement advanced filtering
- [ ] Add webhook support
- [ ] Plan multi-region deployment

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment strategy
- [OPERATIONS.md](./OPERATIONS.md) - Day-to-day operations
- [packages/website/CLAUDE.md](./packages/website/CLAUDE.md) - Architecture
- [Vercel Docs](https://vercel.com/docs) - Official Vercel documentation
