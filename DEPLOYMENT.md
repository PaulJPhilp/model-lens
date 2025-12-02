# Effect Models - Deployment Strategy

## Overview

This document outlines the deployment architecture, environments, and procedures for **Effect Models**, a production-grade REST API for AI model discovery and comparison.

**Key Characteristics**:
- Backend-only API (no web UI)
- Stateless compute, stateful database
- Real-time data synchronization from 4 external APIs
- PostgreSQL + Redis architecture
- Bun runtime with TypeScript

---

## Architecture & Infrastructure

### Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                            │
│                  (Region: us-east-1)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
    ┌──▼───┐      ┌────▼────┐      ┌──▼───┐
    │ App  │      │  App    │      │ App  │
    │Pod 1 │      │ Pod 2   │      │Pod 3 │
    └──┬───┘      └────┬────┘      └──┬───┘
       │               │               │
       └───────────────┼───────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
    ┌──▼────────┐  ┌───▼───┐  ┌──────▼─────┐
    │ PostgreSQL│  │ Redis │  │External APIs│
    │   (RDS)   │  │(Cache)│  │(Upstash)   │
    └───────────┘  └───────┘  └────────────┘
```

### Environment Tiers

| Environment | Purpose | Replicas | Database | Auto-scaling | Sync Frequency |
|-------------|---------|----------|----------|--------------|-----------------|
| **Dev** | Local development | 1 | Local PostgreSQL | No | Manual |
| **Staging** | Pre-production validation | 2 | Staging DB | Yes (2-4) | Every 6 hours |
| **Production** | Live API | 3+ | Production DB | Yes (3-10) | Every 2 hours |

---

## Deployment Targets

### Option 1: Vercel (Recommended for MVP)

**Pros**: 
- Zero-config Next.js deployment
- Automatic HTTPS, CDN, edge caching
- Easy scaling and environment management
- GitHub integration for CI/CD

**Cons**:
- Cold start times (effect-models is pure backend)
- Limited Bun support (requires Node.js compatibility)
- Higher costs at scale

**Setup**:
```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Deploy
vercel deploy --prod
```

### Option 2: Railway (Recommended for Backend)

**Pros**:
- Native Bun support
- Simple database management
- Pay-per-use pricing
- GitHub integration

**Setup**:
```bash
# Create railway.toml
[build]
builder = "nixpacks"
start = "bun run start"

[deploy]
numReplicas = 3
```

### Option 3: DigitalOcean App Platform

**Pros**:
- Kubernetes under the hood
- PostgreSQL included
- Predictable pricing
- Good documentation

**Setup**: Configure via dashboard or `app.yaml`

### Option 4: Fly.io (For Distributed Deployment)

**Pros**:
- Global edge deployment
- Excellent Bun support
- Database co-location options
- Simple volume management

**Setup**:
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create app
fly launch

# Deploy
fly deploy
```

---

## Database Deployment

### PostgreSQL Setup

**Managed Options**:
1. **AWS RDS** - Enterprise-grade, automated backups, Multi-AZ failover
2. **DigitalOcean Managed Database** - Simpler, cost-effective
3. **Railway** - Easiest, built into deployment
4. **Render** - Good free tier for staging

**Minimum Configuration**:
```env
DATABASE_URL=postgresql://user:password@host:5432/effect_models
```

**Production Checklist**:
- [ ] SSL/TLS connection enabled (`sslmode=require`)
- [ ] Automated daily backups
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Read replicas for high availability
- [ ] Connection pooling (PgBouncer or built-in)
- [ ] Max 100 connections limit
- [ ] Monitoring via CloudWatch/DataDog

**Initial Schema Deployment**:
```bash
cd packages/website
bun run db:push  # Applies all migrations
```

### Redis (Cache) Setup

**Recommended**: Upstash Redis (serverless, pay-per-request)

**Configuration**:
```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

**Production Checklist**:
- [ ] Enable SSL/TLS
- [ ] Set 30-day retention policy
- [ ] Configure rate limiting (2,000 req/min per IP)
- [ ] Set cache TTL to 1 hour for model data
- [ ] Monitor memory usage

---

## CI/CD Pipeline

### GitHub Actions Workflow Structure

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    paths:
      - 'packages/website/**'
      - '.github/workflows/deploy.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run test
      - run: bun run check

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Deploy to Vercel/Railway/Fly.io
          # Environment: production
          # Database migration: apply automatically
```

### Pre-deployment Checks

1. **Code Quality**
   - All tests pass (261+ passing)
   - Type checking passes
   - Linting passes

2. **Database Validation**
   - Schema migrations valid
   - No breaking changes
   - Data integrity checks

3. **API Validation**
   - /health endpoint responsive
   - /v1/models endpoint working
   - Admin endpoints secured

4. **Monitoring Setup**
   - Alerting configured
   - Logging enabled
   - Metrics collection active

---

## Data Synchronization

### Scheduled Sync Strategy

```
┌─────────────────────────────────────┐
│   GitHub Actions Cron               │
│   Every 2 hours (Production)        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Sync Job (30-45 min duration)      │
│  1. Fetch from 4 APIs in parallel   │
│  2. Transform & deduplicate         │
│  3. Update PostgreSQL               │
│  4. Invalidate Redis cache          │
│  5. Health check                    │
└─────────────────────────────────────┘
```

**Sync Schedule by Environment**:
| Environment | Frequency | Time | Duration |
|-------------|-----------|------|----------|
| Dev | Manual | - | ~5 min |
| Staging | Every 6h | 00:00, 06:00, 12:00, 18:00 UTC | ~15 min |
| Production | Every 2h | Every even hour UTC | ~30-45 min |

**Sync Configuration** (.github/workflows/daily-sync.yml):
```yaml
schedule:
  - cron: '0 */2 * * *'  # Every 2 hours
```

**Manual Trigger**:
```bash
# Trigger via API
curl -X POST https://api.effectmodels.com/v1/admin/sync \
  -H "x-admin: true" \
  -H "Content-Type: application/json"

# Check status
curl https://api.effectmodels.com/v1/admin/sync/history \
  -H "x-admin: true"
```

---

## Environment Variables

### Production (.env.production)

```env
# Core
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@prod-db.aws.amazon.com:5432/effect_models
DB_RETRY_MS=2000

# Cache & Rate Limiting
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
RATE_LIMIT_MS=100

# API Configuration
API_RETRY_MS=1500
MODEL_SERVICE_RETRY_MS=2000
SYNC_TIMEOUT_MS=45000

# Monitoring (optional)
DATADOG_API_KEY=xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Staging (.env.staging)

Same as production but with different credentials and looser rate limits.

---

## Monitoring & Alerting

### Key Metrics

1. **Availability**
   - API uptime (target: 99.9%)
   - Response time (p99: <500ms)
   - Error rate (target: <0.1%)

2. **Data Sync**
   - Last sync timestamp
   - Sync duration (target: <45 min)
   - Models synced count
   - Sync failure rate

3. **Database**
   - Connection count
   - Query latency (p99)
   - Storage usage
   - Backup status

4. **Cache**
   - Hit rate (target: >80%)
   - Memory usage
   - Eviction rate

### Alert Thresholds

```
🔴 Critical (Page on-call)
- API down >2 min
- Error rate >5%
- Database connection failed

🟠 Warning (Notify Slack)
- API error rate >1%
- Sync failed
- Cache hit rate <50%
- Response time p99 >1s

🟡 Info (Log only)
- Sync running (>2h)
- Low cache hit rate
- High memory usage
```

### Recommended Monitoring Tools

- **Uptime**: Pingdom, DataDog Synthetic
- **Logs**: CloudWatch, Datadog, LogRocket
- **Metrics**: Prometheus, Grafana, Datadog
- **Tracing**: Datadog APM, Honeycomb
- **Alerts**: PagerDuty, Slack, Opsgenie

---

## Disaster Recovery

### Backup Strategy

**Database Backups**:
- Automated daily snapshots (7-day retention)
- Weekly full backup (30-day retention)
- Monthly archive (1-year retention)
- Point-in-time recovery (5 days)

**Restore Procedure**:
```bash
# List available backups
aws rds describe-db-snapshots

# Restore from snapshot (creates new DB)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier effect-models-restore \
  --db-snapshot-identifier snapshot-id

# Point-in-time restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier effect-models \
  --target-db-instance-identifier effect-models-pitr \
  --restore-time "2025-01-27T12:00:00Z"
```

### Failover Scenarios

**Scenario 1: Database Unavailable**
- [ ] Alert fires
- [ ] Check database status
- [ ] Restore from backup (5-10 min)
- [ ] Point API to restored DB
- [ ] Verify sync process resumes

**Scenario 2: API Service Down**
- [ ] Load balancer detects unhealthy instances
- [ ] Auto-scaling triggers new instances
- [ ] Service restored within 2-3 minutes
- [ ] No manual intervention needed

**Scenario 3: Data Sync Failure**
- [ ] Sync job fails (retry 3x)
- [ ] Alert sent
- [ ] Manual sync triggered
- [ ] Investigation of API source (models.dev, OpenRouter, etc.)

**RTO/RPO Targets**:
- RTO (Recovery Time Objective): <15 minutes
- RPO (Recovery Point Objective): <2 hours

---

## Cost Optimization

### Estimated Monthly Costs (Staging + Production)

| Service | Cost | Notes |
|---------|------|-------|
| Compute (3x containers) | $50-100 | Fly.io or Railway |
| PostgreSQL (20GB) | $40-80 | RDS or managed service |
| Redis (5GB) | $20-40 | Upstash serverless |
| Monitoring | $30-50 | Datadog or Sentry |
| **Total** | **$140-270** | Scales with usage |

### Cost Reduction Strategies

1. Use managed services (avoid self-hosting)
2. Enable auto-scaling (don't overprovision)
3. Cache aggressively (reduce API calls)
4. Archive sync history after 30 days
5. Use reserved instances for staging

---

## Security Checklist

- [ ] HTTPS/TLS enabled everywhere
- [ ] API authentication implemented (x-admin header)
- [ ] Rate limiting configured
- [ ] SQL injection protection (Drizzle ORM)
- [ ] Input validation on all endpoints
- [ ] Secrets in environment variables (never in code)
- [ ] Database credentials rotated quarterly
- [ ] Server logs encrypted at rest
- [ ] VPC isolation for database
- [ ] Network ACLs configured
- [ ] DDoS protection enabled
- [ ] Regular security audits

---

## Deployment Rollout Plan

### Blue-Green Deployment

```
Version 0.1.0 (Blue)     Version 0.2.0 (Green)
└─ Running in prod ────► Launch in staging
                         ├─ Run tests
                         ├─ Verify sync
                         └─ If OK, switch traffic
```

**Steps**:
1. Deploy new version to staging
2. Run smoke tests (health check, /v1/models query)
3. Verify data sync completes successfully
4. Switch 10% traffic (canary)
5. Monitor error rate for 15 minutes
6. If stable, switch remaining 90%
7. Keep old version running for 1 hour (quick rollback)

### Rollback Procedure

```bash
# If deployment fails, revert immediately
vercel rollback  # or equivalent for your platform

# Verify old version running
curl https://api.effectmodels.com/health
```

**Estimated rollback time**: <2 minutes

---

## Version Control & Releases

### Tagging Scheme

```
v0.1.0       # Major.minor.patch
v0.1.0-rc.1  # Release candidate
v0.1.0-beta  # Beta release
```

### Release Checklist

- [ ] Update CHANGELOG.md
- [ ] Bump version in package.json
- [ ] Run full test suite
- [ ] Create release notes
- [ ] Tag release in git
- [ ] Deploy to staging
- [ ] Verify sync works
- [ ] Deploy to production
- [ ] Monitor for errors (30 min)
- [ ] Announce release

---

## Related Documentation

- [OPERATIONS.md](./OPERATIONS.md) - Day-to-day operations guide
- [README.md](./README.md) - Project overview
- [packages/website/CLAUDE.md](./packages/website/CLAUDE.md) - Architecture details
- [packages/website/docs/API.md](./packages/website/docs/API.md) - API reference
- [packages/website/docs/DATABASE_SETUP.md](./packages/website/docs/DATABASE_SETUP.md) - Database setup
