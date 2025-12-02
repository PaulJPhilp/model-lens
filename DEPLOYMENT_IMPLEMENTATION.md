# Effect Models - Deployment Implementation Plan

## Overview

This document provides a **step-by-step implementation roadmap** to move Effect Models from local development to production deployment. The plan is organized in phases, with clear success criteria and timeline estimates.

**Current State**: Local development environment  
**Target State**: Fully operational production API with CI/CD, monitoring, and data sync  
**Estimated Duration**: 2-4 weeks (depending on platform choice and parallelization)

---

## Phase Overview

| Phase | Goal | Duration | Priority |
|-------|------|----------|----------|
| **Phase 0** | Infrastructure Setup | 2-3 days | Critical |
| **Phase 1** | Staging Environment | 3-5 days | Critical |
| **Phase 2** | CI/CD Pipeline | 2-3 days | Critical |
| **Phase 3** | Monitoring & Alerting | 2-3 days | High |
| **Phase 4** | Production Deployment | 1-2 days | Critical |
| **Phase 5** | Data Sync Setup | 1-2 days | High |
| **Phase 6** | Runbooks & Training | 1-2 days | Medium |

---

## Phase 0: Infrastructure Setup (2-3 days)

### 0.1 Choose Deployment Platform

**Recommendation**: **Fly.io** (or Railway as alternative)

**Why Fly.io**:
- Native Bun support
- Simple database management (PostgreSQL)
- Global edge deployment
- Pay-per-use pricing
- Excellent for backend APIs

**Decision Tree**:
```
Choose Platform:
├─ Fly.io (Recommended)
│  └─ Best for: Backend-first, global distribution, cost-efficient
├─ Railway
│  └─ Best for: Quick setup, MongoDB/PostgreSQL integration, simplicity
├─ Vercel
│  └─ Best for: Full-stack, edge functions, but overkill for pure backend
└─ DigitalOcean App Platform
   └─ Best for: Kubernetes control, predictable pricing
```

**Action Items**:
- [ ] Read platform documentation (1 hour)
- [ ] Compare cost estimates for 3 months (30 min)
- [ ] Create platform account (15 min)
- [ ] Review platform limitations for Bun/TypeScript (1 hour)
- [ ] **Decision & team approval** (BLOCKER)

---

### 0.2 Set Up Databases

**PostgreSQL (Primary Data Store)**

```bash
# Option A: Managed PostgreSQL (Recommended)
# Use platform's managed database offering
# Example for Fly.io:
fly postgres create effect-models-db

# Option B: External Service
# AWS RDS, DigitalOcean Managed DB, Railway Postgres

# Verify connection
DATABASE_URL=postgresql://user:pass@host/db psql -c "SELECT version();"
```

**Success Criteria**:
- [ ] Database accessible from local machine
- [ ] Can run migrations
- [ ] Backup configured
- [ ] Connection pool configured (max 100)

**Checklist**:
- [ ] Database created
- [ ] Username & password secure (stored in 1Password/LastPass)
- [ ] SSL/TLS enabled
- [ ] Backup scheduled (daily)
- [ ] PITR enabled (point-in-time recovery)
- [ ] Connection string saved as `DATABASE_URL`

**Estimated Time**: 1 hour

---

### 0.3 Set Up Cache (Redis)

**Upstash Redis** (recommended for serverless, pay-per-request)

```bash
# Create Upstash Redis instance
# Visit https://console.upstash.com
# Create new database
# Note the REST URL and token

UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

**Alternative**: Railway Redis (included in platform)

**Success Criteria**:
- [ ] Can connect to Redis
- [ ] SET/GET operations work
- [ ] TTL configured (1 hour default)
- [ ] Rate limiting key-space available

**Checklist**:
- [ ] Redis instance created
- [ ] SSL/TLS enabled
- [ ] Eviction policy: allkeys-lru
- [ ] Max memory: 5GB
- [ ] Credentials stored securely

**Estimated Time**: 30 minutes

---

### 0.4 Set Up Monitoring & Logging

**Recommended**: Datadog (has free tier for small projects)

**Alternatives**: 
- Grafana + Prometheus (self-hosted)
- Sentry (error tracking)
- LogRocket (session replay)

```bash
# Create Datadog account
# https://www.datadoghq.com/

# Get API key & app key
# Will use in deployment config
```

**Initial Metrics to Track**:
- HTTP request count
- Response time (p50, p99)
- Error rate (4xx, 5xx)
- Database query time
- Cache hit rate

**Checklist**:
- [ ] Monitoring account created
- [ ] API credentials stored
- [ ] Dashboards template created
- [ ] Alert rules skeleton created

**Estimated Time**: 1 hour

---

### 0.5 Set Up Secrets Management

**Create `.env` files** (never commit these):

```bash
# Root .env.production (secret)
DATABASE_URL=postgresql://user:pass@db.host/effect_models
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
NODE_ENV=production
PORT=3000

# Root .env.staging
DATABASE_URL=postgresql://user:pass@db.staging/effect_models_staging
UPSTASH_REDIS_REST_URL=https://xxxxx-staging.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx-staging
NODE_ENV=staging
PORT=3000
```

**Checklist**:
- [ ] `.env.production` created (in 1Password/LastPass)
- [ ] `.env.staging` created
- [ ] `.env.local` for local development
- [ ] Never commit secrets to git
- [ ] Use platform's secret management (Fly.io Secrets, Vercel Env Vars, etc.)

**Estimated Time**: 30 minutes

---

## Phase 1: Staging Environment (3-5 days)

### 1.1 Deploy to Staging

**Step 1: Create Staging App**

```bash
# Using Fly.io as example
fly app create effect-models-staging

# Or using Railway
# Create app via dashboard

# Or using Vercel
vercel projects create effect-models-staging
```

**Step 2: Link Code Repository**

```bash
# Link to GitHub repo
fly auth login
fly apps list

# For GitHub integration (automatic deploys)
# Configure GitHub App integration on platform
```

**Step 3: Configure Staging Environment Variables**

```bash
# Set secrets on platform
fly secrets set \
  DATABASE_URL="postgresql://..." \
  UPSTASH_REDIS_REST_URL="https://..." \
  UPSTASH_REDIS_REST_TOKEN="..." \
  NODE_ENV=staging

# Verify
fly secrets list
```

**Step 4: Initial Deployment**

```bash
# Deploy code to staging
fly deploy

# Verify deployment
fly status
fly logs
```

**Success Criteria**:
- [ ] Staging app deployed
- [ ] `GET /health` returns 200
- [ ] `GET /v1/models?limit=1` works
- [ ] No 500 errors in logs
- [ ] Environment variables set correctly

**Estimated Time**: 1-2 hours

---

### 1.2 Run Database Migrations

```bash
# Connect to staging database
DATABASE_URL=$STAGING_DB psql -c "\dt"

# Run migrations
cd packages/website
DATABASE_URL=$STAGING_DB bun run db:push

# Verify schema
psql $STAGING_DB -c "\dt"
```

**Success Criteria**:
- [ ] All tables created
- [ ] Indexes created
- [ ] No migration errors
- [ ] Can query tables

**Estimated Time**: 30 minutes

---

### 1.3 Manual Smoke Tests

```bash
# Test health endpoint
curl https://staging-api.effectmodels.com/health

# Test models endpoint
curl 'https://staging-api.effectmodels.com/v1/models?limit=1'

# Test admin endpoint
curl -H "x-admin: true" \
  'https://staging-api.effectmodels.com/v1/admin/sync/history?limit=1'
```

**Success Criteria**:
- [ ] All endpoints respond correctly
- [ ] Status codes are correct
- [ ] JSON response format is valid
- [ ] No 500 errors

**Estimated Time**: 30 minutes

---

### 1.4 Performance Baseline Test

```bash
# Load test with ApacheBench
ab -n 1000 -c 10 https://staging-api.effectmodels.com/health

# Expected: <100ms response time
# Expected: 0 failed requests
```

**Success Criteria**:
- [ ] Health endpoint: <100ms p99
- [ ] Models endpoint: <300ms p99
- [ ] Error rate: 0%

**Estimated Time**: 1 hour

---

### 1.5 Verify Database & Cache

```bash
# Check database connection
psql $STAGING_DATABASE_URL -c "SELECT count(*) FROM models;"

# Test Redis
# Check via Upstash dashboard or CLI:
redis-cli -u $UPSTASH_REDIS_REST_URL PING
# Should return PONG
```

**Success Criteria**:
- [ ] Can query models table
- [ ] Redis connection works
- [ ] Cache operations succeed

**Estimated Time**: 30 minutes

---

## Phase 2: CI/CD Pipeline (2-3 days)

### 2.1 Create GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Staging & Production

on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'packages/website/**'
      - '.github/workflows/deploy.yml'
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
        with:
          files: ./coverage/coverage-final.json

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Staging
        run: flyctl deploy
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      
      - name: Smoke Tests
        run: |
          sleep 30  # Wait for deployment
          curl https://staging-api.effectmodels.com/health

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: superfly/flyctl-actions/setup-flyctl@master
      
      - name: Deploy to Production
        run: flyctl deploy
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
      
      - name: Smoke Tests
        run: |
          sleep 60  # Wait longer for production
          curl https://api.effectmodels.com/health
      
      - name: Notify Success
        if: success()
        run: |
          # Notify Slack channel
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Production deployed successfully"}'
      
      - name: Notify Failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"❌ Production deployment failed"}'
```

**Success Criteria**:
- [ ] Workflow file created
- [ ] All steps execute
- [ ] Tests pass
- [ ] Deployment succeeds
- [ ] Smoke tests pass

**Estimated Time**: 2 hours

---

### 2.2 Set Up GitHub Secrets

```bash
# In GitHub repository settings:
# Settings > Secrets and variables > Actions

# Add secrets:
- FLY_API_TOKEN          # From Fly.io
- SLACK_WEBHOOK          # From Slack (optional)
- CODECOV_TOKEN          # From Codecov (optional)
```

**Checklist**:
- [ ] FLY_API_TOKEN set
- [ ] Can access secrets in workflows
- [ ] All required secrets configured

**Estimated Time**: 30 minutes

---

### 2.3 Test CI/CD Pipeline

```bash
# Create test branch
git checkout -b test/ci-cd

# Make minor change
echo "# Test" >> README.md

# Push to trigger workflow
git push origin test/ci-cd

# Create PR
# Watch GitHub Actions run

# Verify:
# - Tests pass
# - Code quality checks pass
# - Staging deployment succeeds
```

**Success Criteria**:
- [ ] Tests run automatically
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Coverage uploaded
- [ ] Staging deployment succeeds

**Estimated Time**: 1 hour

---

## Phase 3: Monitoring & Alerting (2-3 days)

### 3.1 Create Monitoring Dashboard

**Datadog Dashboard Setup**:

```bash
# Create dashboard in Datadog
# Add metrics:
- http.requests (count)
- http.request_time (latency)
- http.errors (by status code)
- db.query_time (latency)
- cache.hit_rate
- system.cpu
- system.memory
```

**Success Criteria**:
- [ ] Dashboard created
- [ ] Metrics visible
- [ ] Can filter by environment (staging/prod)

**Estimated Time**: 1 hour

---

### 3.2 Set Up Alerting

**Create alerts in Datadog**:

```
Alert 1: API Down
- Trigger: No requests for 2 minutes
- Severity: Critical
- Action: Page on-call engineer

Alert 2: High Error Rate
- Trigger: Error rate > 5% for 5 minutes
- Severity: Warning
- Action: Slack notification

Alert 3: High Latency
- Trigger: P99 latency > 1 second for 5 minutes
- Severity: Warning
- Action: Slack notification

Alert 4: Database Connection Exhausted
- Trigger: Connections > 95% for 5 minutes
- Severity: Critical
- Action: Page on-call engineer
```

**Success Criteria**:
- [ ] All alerts configured
- [ ] Test alert fires
- [ ] Notifications work
- [ ] On-call setup complete

**Estimated Time**: 1-2 hours

---

### 3.3 Set Up Status Page

**Create status page** (Statuspage.io, Incident.io, or similar):

```
Components:
- API Server
- PostgreSQL Database
- Redis Cache
- External APIs (models.dev, OpenRouter, etc.)
```

**Success Criteria**:
- [ ] Status page created
- [ ] Components listed
- [ ] Can log incidents
- [ ] Team members invited

**Estimated Time**: 1 hour

---

### 3.4 Configure Log Aggregation

**Datadog Logs**:

```bash
# Install Datadog agent on platform (if applicable)
# Configure log forwarding

# Or use platform's built-in logging
# Verify logs appear in Datadog/monitoring tool

# Test logging
curl https://staging-api.effectmodels.com/health
# Check logs within 1 minute
```

**Success Criteria**:
- [ ] Logs appear in monitoring tool
- [ ] Can search logs
- [ ] Can filter by environment/service

**Estimated Time**: 1 hour

---

## Phase 4: Production Deployment (1-2 days)

### 4.1 Prepare Production Infrastructure

```bash
# Create production app
fly app create effect-models

# Create production database
fly postgres create effect-models-db

# Set production environment variables
fly secrets set \
  DATABASE_URL="postgresql://..." \
  UPSTASH_REDIS_REST_URL="https://..." \
  UPSTASH_REDIS_REST_TOKEN="..." \
  NODE_ENV=production
```

**Checklist**:
- [ ] Production app created
- [ ] Production database created
- [ ] Environment variables set
- [ ] Backups configured
- [ ] Monitoring connected

**Estimated Time**: 2-3 hours

---

### 4.2 Run Production Migrations

```bash
# Verify database connection
psql $PRODUCTION_DATABASE_URL -c "SELECT version();"

# Run migrations
DATABASE_URL=$PRODUCTION_DATABASE_URL \
  cd packages/website && bun run db:push

# Verify
psql $PRODUCTION_DATABASE_URL -c "\dt"
```

**Success Criteria**:
- [ ] All migrations applied
- [ ] No errors
- [ ] Tables created

**Estimated Time**: 1 hour

---

### 4.3 Initial Production Deployment

```bash
# Deploy to production
git tag v0.1.0
git push origin v0.1.0

# This triggers production deployment via CI/CD
# OR manually:
fly deploy --app=effect-models
```

**Pre-deployment Checklist**:
- [ ] All tests passing
- [ ] Type checking passes
- [ ] Code review completed
- [ ] Staging verified
- [ ] On-call engineer notified
- [ ] Status page updated

**Deployment Checklist**:
- [ ] Deployment starts
- [ ] Blue-green deployment active
- [ ] New version health checks passing
- [ ] Old version still running
- [ ] Monitoring shows 0 errors

**Post-deployment Checklist** (First 30 minutes):
- [ ] Monitor error rate (target: 0%)
- [ ] Monitor response time (p99: <500ms)
- [ ] Monitor database connections
- [ ] Monitor cache hit rate
- [ ] Check logs for errors
- [ ] Verify /health endpoint
- [ ] Verify /v1/models endpoint

**Success Criteria**:
- [ ] GET /health returns 200
- [ ] GET /v1/models works
- [ ] Error rate 0%
- [ ] Response time <500ms p99

**Estimated Time**: 2-3 hours (including monitoring period)

---

### 4.4 Smoke Tests (Production)

```bash
# Test health endpoint
curl https://api.effectmodels.com/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0"}

# Test models endpoint
curl 'https://api.effectmodels.com/v1/models?limit=1'
# Expected: 200 OK with model data

# Test admin endpoint (with auth)
curl -H "x-admin: true" \
  'https://api.effectmodels.com/v1/admin/sync/history?limit=1'
# Expected: 200 OK with sync history
```

**Success Criteria**:
- [ ] All endpoints respond correctly
- [ ] Status codes correct
- [ ] Response format valid
- [ ] No errors in logs

**Estimated Time**: 30 minutes

---

### 4.5 Monitor for 1 Hour

```
Monitoring Checklist (Post-deployment):
- [ ] Check error rate every 5 minutes (target: 0%)
- [ ] Check response time every 5 minutes (target: <500ms)
- [ ] Check database connections (target: <50)
- [ ] Check cache hit rate (target: >80%)
- [ ] Review logs for warnings
- [ ] Check Datadog dashboard
- [ ] Verify no alerts firing
```

**If Issues Detected**:
```
1. Check logs for errors
2. Identify issue
3. If critical: rollback immediately
   fly rollback --app=effect-models
4. If minor: create issue ticket
5. Document in incident log
```

**Success Criteria**:
- [ ] No critical issues found
- [ ] All metrics normal
- [ ] Ready to complete deployment

**Estimated Time**: 1 hour

---

## Phase 5: Data Sync Setup (1-2 days)

### 5.1 Manual Test Sync (Non-production)

**Test in Staging First**:

```bash
# Trigger sync via API (staging)
curl -X POST 'https://staging-api.effectmodels.com/v1/admin/sync' \
  -H "x-admin: true"

# Monitor sync progress
# Check logs: fly logs --app=effect-models-staging

# Wait for completion (10-15 minutes)

# Verify data in database
psql $STAGING_DATABASE_URL -c "SELECT COUNT(*) FROM models;"
# Should show >1000 models
```

**Success Criteria**:
- [ ] Sync completes without errors
- [ ] Models table populated (>1000 models)
- [ ] No 500 errors in logs
- [ ] Sync duration <45 minutes

**Estimated Time**: 1-2 hours

---

### 5.2 Manual Test Sync (Production)

```bash
# Trigger sync via API (production)
curl -X POST 'https://api.effectmodels.com/v1/admin/sync' \
  -H "x-admin: true"

# Monitor progress
# Check logs: fly logs --app=effect-models

# Wait for completion

# Verify data
psql $PRODUCTION_DATABASE_URL -c "SELECT COUNT(*) FROM models;"
# Should show >1000 models
```

**Success Criteria**:
- [ ] Sync completes without errors
- [ ] Models table populated
- [ ] No data loss
- [ ] All 4 APIs queried successfully

**Estimated Time**: 1-2 hours (including wait time)

---

### 5.3 Set Up Automated Sync (GitHub Actions)

**File**: `.github/workflows/daily-sync.yml`

```yaml
name: Daily Model Data Sync

on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours UTC
  workflow_dispatch  # Allow manual trigger

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
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
          UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
          UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
      
      - name: Verify Sync
        run: |
          COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM models;")
          echo "Models in database: $COUNT"
          if [ "$COUNT" -lt 1000 ]; then
            echo "ERROR: Less than 1000 models synced"
            exit 1
          fi
        env:
          DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
      
      - name: Notify Success
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Data sync completed successfully"}'
      
      - name: Notify Failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"❌ Data sync failed"}'
```

**Success Criteria**:
- [ ] Workflow file created
- [ ] Triggers on schedule
- [ ] Can be manually triggered
- [ ] Notifications work

**Estimated Time**: 1 hour

---

### 5.4 Monitor First Scheduled Sync

```
Wait for first scheduled sync (next 2-hour interval):
- [ ] Sync triggers automatically
- [ ] Completes without errors
- [ ] Models count increases
- [ ] Cache invalidated
- [ ] Slack notification received
```

**Success Criteria**:
- [ ] Automated sync works
- [ ] Data updated on schedule
- [ ] No manual intervention needed

**Estimated Time**: 2 hours (mostly waiting)

---

## Phase 6: Runbooks & Training (1-2 days)

### 6.1 Create On-Call Runbook

**Document**: Create `docs/ONCALL_RUNBOOK.md`

```markdown
# On-Call Runbook

## Quick Reference
- API health: https://api.effectmodels.com/health
- Logs: fly logs --app=effect-models
- Database: psql $DATABASE_URL
- Alerting: Check Datadog dashboard

## Common Issues

### Issue: API returning 500 errors
1. Check logs: fly logs
2. Verify database: psql ... -c "SELECT 1;"
3. Check Redis: redis-cli PING
4. If DB down: Check RDS console
5. If cache down: Check Upstash console
6. Restart app: fly restart --app=effect-models
7. If still broken: Rollback
   fly rollback --app=effect-models

### Issue: Data sync failed
1. Check sync history: curl ... /v1/admin/sync/history
2. Check API sources (models.dev, OpenRouter, etc.)
3. Retry: curl -X POST .../v1/admin/sync
4. If fails again: Check logs and investigate

### Issue: High latency
1. Check database: psql ... -c "EXPLAIN ANALYZE SELECT * FROM models LIMIT 1;"
2. Check cache hit rate
3. Check database connections
4. If overloaded: Scale up instances
```

**Checklist**:
- [ ] Runbook document created
- [ ] Team reviews and approves
- [ ] Posted in team Slack/wiki

**Estimated Time**: 2-3 hours

---

### 6.2 Create Status Dashboard

**Documentation**: Create monitoring dashboard with:

```
Real-time Metrics:
- API uptime (last 24h)
- Response time (p50, p99)
- Error rate (by status code)
- Database connections
- Cache hit rate
- Last sync time & status

Historical Trends:
- Uptime trend (weekly)
- Response time trend
- Error rate trend
- Data sync success rate
```

**Checklist**:
- [ ] Dashboard created in Datadog
- [ ] Team members have access
- [ ] Default view configured

**Estimated Time**: 1-2 hours

---

### 6.3 Team Training

**Schedule training session (30-60 minutes)**:

```
Topics:
1. How to access logs (Datadog)
2. How to trigger manual sync
3. How to check API health
4. How to escalate issues
5. What to do during outage
6. How to access production database
7. Contact information & escalation

Q&A session
```

**Checklist**:
- [ ] Training scheduled
- [ ] All team members attend
- [ ] Questions answered
- [ ] Runbook accessible

**Estimated Time**: 2 hours

---

### 6.4 First On-Call Rotation

```
Setup on-call schedule:
- [ ] Create PagerDuty or similar account
- [ ] Set up escalation policy
- [ ] Assign on-call rotation (start with 1 person)
- [ ] Configure alerts to page
- [ ] Test alert notification
```

**First Week**:
- [ ] Monitor closely (extra alerting)
- [ ] Review all incidents
- [ ] Adjust thresholds if needed
- [ ] Collect feedback

**Checklist**:
- [ ] On-call rotation established
- [ ] First person assigned
- [ ] Can receive alerts
- [ ] Team trained

**Estimated Time**: 2-3 hours

---

## Phase 7: Post-Deployment (Ongoing)

### 7.1 Post-Deployment Monitoring (Week 1)

```
Daily checklist for first week:
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify data sync completed
- [ ] Confirm no alerts during night
- [ ] Team sync/standup

Friday: Week 1 Retrospective
- [ ] Document lessons learned
- [ ] Update runbooks if needed
- [ ] Plan improvements
```

**Success Criteria**:
- [ ] No major issues
- [ ] Team confident with operations
- [ ] Monitoring working well

---

### 7.2 Post-Deployment Review (Week 2)

```
Week 2 Review Meeting:
- [ ] Production stability review
- [ ] Performance baseline assessment
- [ ] Cost review
- [ ] Monitoring effectiveness
- [ ] On-call experience
- [ ] Plan for improvements
```

**Checklist**:
- [ ] Document review findings
- [ ] Update documentation if needed
- [ ] Plan Phase 2 improvements

---

## Timeline & Critical Path

```
Week 1:
┌─ Phase 0: Infrastructure       [████] 2-3 days
│  └─ Platform chosen
│  └─ Databases created
│  └─ Secrets configured
│
├─ Phase 1: Staging Deploy       [████] 3-5 days (parallel)
│  └─ App deployed
│  └─ Migrations run
│  └─ Smoke tests pass
│
└─ Phase 2: CI/CD Pipeline      [███ ] 2-3 days (parallel)
   └─ Workflows created
   └─ Tests pass
   └─ Can deploy

Week 2:
┌─ Phase 3: Monitoring          [███ ] 2-3 days
│  └─ Dashboard created
│  └─ Alerts configured
│  └─ Logs flowing
│
├─ Phase 4: Production Deploy    [██  ] 1-2 days
│  └─ Infrastructure ready
│  └─ App deployed
│  └─ Smoke tests pass
│
└─ Phase 5: Data Sync           [██  ] 1-2 days (parallel)
   └─ Manual sync verified
   └─ Auto-sync scheduled
   └─ First run successful

Week 3:
└─ Phase 6: Runbooks & Training [██  ] 1-2 days
   └─ Documentation complete
   └─ Team trained
   └─ On-call ready

Week 4+:
└─ Phase 7: Post-Deployment Ops [█   ] Ongoing
   └─ Monitor & optimize
   └─ Plan Phase 2 improvements
```

---

## Success Criteria (Deployment Complete)

✅ **Infrastructure Ready**
- [ ] Production app deployed
- [ ] PostgreSQL configured with backups
- [ ] Redis caching operational
- [ ] Monitoring & alerting active

✅ **CI/CD Operational**
- [ ] Tests run automatically on PR
- [ ] Code quality checks pass
- [ ] Automated deployment to staging
- [ ] Automated deployment to production

✅ **API Functional**
- [ ] /health endpoint responding
- [ ] /v1/models endpoint working
- [ ] Admin endpoints secured
- [ ] <100ms p99 latency (health check)

✅ **Data Sync Working**
- [ ] Manual sync completes successfully
- [ ] Automated sync runs on schedule
- [ ] >1000 models in database
- [ ] Cache invalidation working

✅ **Monitoring Active**
- [ ] All key metrics being tracked
- [ ] Alerts configured and tested
- [ ] Team notified of incidents
- [ ] Historical data collected

✅ **Team Ready**
- [ ] Runbooks documented
- [ ] Team trained on procedures
- [ ] On-call rotation established
- [ ] Incident response plan ready

---

## Rollback Plan

If deployment fails at any phase:

**Phase 0-1 Issues** (Infrastructure/Staging):
- Rebuild infrastructure
- Redeploy to staging
- Test again (no production impact)

**Phase 2-3 Issues** (CI/CD/Monitoring):
- Disable CI/CD workflows
- Deploy manually
- Configure monitoring manually
- Retry workflow setup

**Phase 4 Issues** (Production Deploy):
- Immediate rollback:
  ```bash
  fly rollback --app=effect-models
  ```
- Return to previous version
- Expected time: <2 minutes
- Data preserved (no rollback needed)

**Phase 5 Issues** (Data Sync):
- If sync fails: Continue using existing data
- Retry sync manually
- Investigate API sources
- Not blocking to operations

**Full Reset** (If catastrophic failure):
1. Rollback production app
2. Restore database from backup
3. Verify from backups
4. Investigate root cause
5. Retry deployment

---

## Resource Requirements

**Team**: 2-3 engineers

**Time Commitment** (per engineer):
- Phases 0-4: 40-60 hours (can be parallelized)
- Phases 5-6: 20-30 hours
- Total: 60-90 hours per engineer

**Cost** (3-month staging + production):
- Compute: $50-100/month
- Database: $40-80/month
- Cache: $20-40/month
- Monitoring: $30-50/month
- **Total**: ~$140-270/month

---

## Communication Plan

**Stakeholders to Notify**:
- Internal team (engineers, PMs)
- Potential users/customers
- Operations/DevOps team
- Security team (if applicable)

**Timeline**:
- **Day 1**: Team kickoff on deployment plan
- **End of Week 1**: Status update to stakeholders
- **End of Week 2**: Staging ready announcement
- **Production Deploy Day**: Prepare announcement
- **Production Launch**: Public announcement (optional)

---

## Next Steps After Deployment

**Immediate** (Day 1-7):
- [ ] Monitor closely
- [ ] Document issues found
- [ ] Train additional team members
- [ ] Prepare for on-call rotation

**Short-term** (Week 2-4):
- [ ] Optimize performance
- [ ] Review costs
- [ ] Improve runbooks based on experience
- [ ] Plan Phase 2 improvements

**Medium-term** (Month 2-3):
- [ ] Add GraphQL endpoint
- [ ] Implement advanced filtering
- [ ] Add webhook support
- [ ] Enhance monitoring

**Long-term** (Month 4+):
- [ ] Scale to multi-region
- [ ] Add API authentication
- [ ] Implement historical data tracking
- [ ] Build public dashboard

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment strategy
- [OPERATIONS.md](./OPERATIONS.md) - Day-to-day operations guide
- [packages/website/CLAUDE.md](./packages/website/CLAUDE.md) - Architecture documentation
