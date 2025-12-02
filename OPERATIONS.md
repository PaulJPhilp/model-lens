# Effect Models - Operations Plan

## Overview

This document details the day-to-day operational procedures, monitoring, incident response, and maintenance tasks for **Effect Models** in production.

---

## Service Components

### Core Services

1. **API Server** (Stateless)
   - REST endpoint for model queries
   - Request validation & rate limiting
   - Response caching via Redis

2. **Data Sync Service** (Scheduled)
   - Fetches from 4 external APIs in parallel
   - Transforms and deduplicates data
   - Updates PostgreSQL database
   - Duration: 30-45 minutes per run

3. **Database** (PostgreSQL)
   - Stores 1000+ AI models
   - Primary data store
   - Automatic backups

4. **Cache** (Redis)
   - Caches API responses
   - Rate limiting state
   - TTL: 1 hour

---

## Health Monitoring

### Health Check Endpoint

**Endpoint**: `GET /health`

**Expected Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T16:40:00.000Z",
  "version": "1.0.0"
}
```

**Check Every**: 30 seconds (automated)

**Alert If**:
- No response for >2 minutes
- Status != "ok"
- Response time >1000ms

### Manual Health Verification

```bash
# Check API is responding
curl -s https://api.effectmodels.com/health | jq .

# Get a model to verify DB connectivity
curl -s 'https://api.effectmodels.com/v1/models?limit=1' | jq '.data[0]'

# Check last sync
curl -s 'https://api.effectmodels.com/v1/admin/sync/history?limit=1' \
  -H "x-admin: true" | jq '.data[0]'
```

---

## Data Sync Monitoring

### Sync Status

**Monitoring Dashboard**:
```
Last Sync:     2025-01-27 14:00 UTC ✅
Status:        Completed successfully
Duration:      38 minutes
Models:        1,247 synced
Next Sync:     2025-01-27 16:00 UTC (in 1h 20m)
```

**Get Sync History** (Admin Only):
```bash
curl 'https://api.effectmodels.com/v1/admin/sync/history?limit=10' \
  -H "x-admin: true"
```

**Response**:
```json
{
  "data": [
    {
      "id": "sync_123",
      "status": "completed",
      "message": "Successfully synced from all sources",
      "startedAt": "2025-01-27T14:00:00Z",
      "completedAt": "2025-01-27T14:38:00Z",
      "totalFetched": 1247,
      "totalStored": 1247
    }
  ],
  "timestamp": "2025-01-27T16:40:00Z"
}
```

### Sync Failure Response

**If sync fails**:
1. Check external API status (models.dev, OpenRouter, HuggingFace, ArtificialAnalysis)
2. Verify database connectivity
3. Check network/proxy configuration
4. Retry sync manually via API:
   ```bash
   curl -X POST 'https://api.effectmodels.com/v1/admin/sync' \
     -H "x-admin: true"
   ```

**If retry fails**:
- [ ] Page on-call engineer
- [ ] Check GitHub Actions logs
- [ ] Investigate specific API that failed
- [ ] File issue in repository

---

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | None |
| 400 | Bad request | Check query parameters |
| 401 | Unauthorized | Verify x-admin header |
| 429 | Rate limited | Implement exponential backoff |
| 500 | Server error | Check logs, restart if needed |
| 503 | Service unavailable | Check database/cache connectivity |

### Debugging

**View Logs** (platform-dependent):
```bash
# Fly.io
fly logs

# Vercel
vercel logs

# Railway
railway logs

# DigitalOcean
doctl apps logs <app-id>
```

**Search for errors**:
```bash
# Look for 500 errors in the last hour
grep "500" app.log | tail -20

# Search for sync failures
grep "sync.*failed" app.log
```

---

## Performance Baseline

### Query Performance

| Operation | Baseline | P99 | Alert Threshold |
|-----------|----------|-----|-----------------|
| GET /health | <50ms | <100ms | >500ms |
| GET /v1/models (limit=20) | 100-150ms | <300ms | >1000ms |
| GET /v1/models (limit=100) | 200-300ms | <500ms | >1500ms |
| POST /v1/admin/sync | ~45 min | N/A | >60 min |

**Troubleshooting Slow Queries**:
```bash
# Enable query logging
# Check database slow query log for queries >1s

# Check if cache is hit (Redis)
# If cache miss rate >20%, investigate

# Check database connection pool
# Max 100 connections recommended
```

---

## Database Operations

### Checking Database Health

```bash
# Connect to database
psql $DATABASE_URL

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check index usage
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

# Check active connections
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;

# Check for long-running queries
SELECT pid, usename, query, query_start 
FROM pg_stat_activity 
WHERE state = 'active' AND query_start < now() - interval '5 minutes';
```

### Database Maintenance

**Daily** (Automated):
- Backup created automatically
- Replication lag checked
- Connection pool monitored

**Weekly**:
- VACUUM ANALYZE (optimizes query planner)
- Check index fragmentation
- Review slow query logs

**Monthly**:
- Full backup verified
- Disaster recovery test (restore backup)
- Capacity planning review

### Scaling the Database

**When to scale up**:
- Storage >80% full
- Connection pool >80 used
- Query latency p99 >1000ms
- CPU >70% sustained

**How to scale**:
```bash
# AWS RDS
aws rds modify-db-instance \
  --db-instance-identifier effect-models \
  --db-instance-class db.t4g.large  # Larger instance type
  --apply-immediately

# Railway/Managed Services
# Use dashboard to upgrade tier
```

---

## Cache Management

### Redis Monitoring

```bash
# Check cache hit rate
# Via monitoring dashboard: should be >80%

# Check memory usage
# Via monitoring dashboard: max 5GB allocated

# Clear cache if needed (nuclear option)
redis-cli FLUSHDB  # Only in emergency!
```

**Recommended Cache Strategy**:
- Model list responses: 1 hour TTL
- Single model query: 2 hour TTL
- Rate limit state: 1 minute TTL

### Cache Invalidation

**Automatic** (on data sync):
```bash
# When sync completes, invalidate cache
REDIS> DEL models:*  # All model cache entries
```

**Manual** (if needed):
```bash
# If you modified data directly in DB
redis-cli FLUSHDB  # Clears all cache
curl -X POST 'https://api.effectmodels.com/v1/admin/sync' \
  -H "x-admin: true"  # Re-sync data
```

---

## Incident Response

### Incident Classification

**Severity 1** (Critical): API down, data loss, security breach
- Response time: <5 minutes
- Escalation: Page all on-call

**Severity 2** (High): Degraded performance, sync failure
- Response time: <15 minutes
- Escalation: Notify on-call team

**Severity 3** (Medium): Minor issues, slow queries
- Response time: <1 hour
- Escalation: Create ticket

### Incident Checklist (Severity 1)

```
1. [ ] Declare incident in Slack (#incidents)
2. [ ] Create incident ticket
3. [ ] Identify scope
   - [ ] Is API returning 5xx errors?
   - [ ] Is database responding?
   - [ ] Is sync in progress?
4. [ ] Attempt quick fixes
   - [ ] Restart API service: vercel redeploy
   - [ ] Clear cache: redis-cli FLUSHDB
   - [ ] Check database connections
5. [ ] If not resolved in 5 min, escalate
   - [ ] Page on-call engineer
   - [ ] Prepare rollback (revert to previous version)
6. [ ] Once resolved
   - [ ] Document root cause
   - [ ] Create postmortem ticket
   - [ ] Plan prevention measures
```

### Rollback Procedure

```bash
# If deployment caused issue
vercel rollback  # or platform-specific command

# Verify old version running
curl https://api.effectmodels.com/health

# Notify team
# "Rolled back from v0.2.0 to v0.1.0 due to 500 errors"
```

**Expected time to rollback**: <2 minutes

---

## Routine Maintenance

### Daily Tasks (Automated)

- [x] Health checks every 30 seconds
- [x] Database backups
- [x] Log rotation
- [x] Data sync (every 2 hours)

### Weekly Tasks (Manual)

```bash
# Monday 09:00 UTC
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify backup integrity

# Thursday 14:00 UTC
- [ ] Review database slow query log
- [ ] Check for unused indexes
- [ ] Update dependencies (if needed)
```

### Monthly Tasks (Manual)

```bash
# First Monday of month, 10:00 UTC

# 1. Test disaster recovery
- [ ] Create snapshot from production DB
- [ ] Restore to test environment
- [ ] Verify data integrity
- [ ] Delete test restore

# 2. Security audit
- [ ] Rotate database password
- [ ] Rotate API secrets
- [ ] Check for unauthorized access
- [ ] Review firewall rules

# 3. Capacity planning
- [ ] Database storage growth rate
- [ ] Cache hit rate trends
- [ ] Query performance trends
- [ ] Plan for next 3 months
```

### Quarterly Tasks (Manual)

```bash
# Q1, Q2, Q3, Q4 (first day of each quarter, 10:00 UTC)

- [ ] Full security audit
- [ ] Penetration testing (if applicable)
- [ ] Review architecture for improvements
- [ ] Plan upcoming features
- [ ] Verify compliance requirements
```

---

## Upgrading & Patching

### Patch Schedule

**Security patches**: Applied within 24 hours
**Bug fix patches**: Batched, applied weekly
**Feature releases**: Planned quarterly

### Upgrade Procedure

```bash
# 1. Create release branch
git checkout -b release/v0.2.0

# 2. Update version
# Edit package.json, bump version

# 3. Update CHANGELOG
# Document changes, breaking changes, migrations

# 4. Run full test suite
bun run test
bun run lint
bun run check

# 5. Deploy to staging
git push origin release/v0.2.0
# GitHub Actions automatically deploys to staging

# 6. Test in staging (1-2 hours)
- [ ] Run smoke tests
- [ ] Verify data sync
- [ ] Check performance metrics

# 7. Deploy to production
# Create PR, merge to main
# GitHub Actions automatically deploys to production

# 8. Monitor (30 minutes)
# Watch error rate and performance metrics
```

---

## Scaling Strategy

### Horizontal Scaling (Add More Instances)

**Trigger**: Error rate >1% or response time p99 >1000ms

```bash
# Increase replica count
# Platform-specific commands

# Verify all instances healthy
curl https://api.effectmodels.com/health
```

**How long**: 2-5 minutes to launch and become healthy

### Vertical Scaling (Bigger Instances)

**Trigger**: CPU >80% or memory >85% sustained

```bash
# Upgrade instance type
# Requires rolling deployment (blue-green)
# Zero downtime if >2 instances
```

**How long**: 10-15 minutes for rolling restart

---

## On-Call Runbook

### Escalation Path

```
1. Automated alerting (PagerDuty/Slack)
   ↓
2. On-call engineer acknowledges within 5 min
   ↓
3. Investigates using dashboard & logs
   ↓
4. If unable to resolve in 10 min:
   ↓
5. Escalates to senior engineer
   ↓
6. If still not resolved:
   ↓
7. Page the team lead
```

### On-Call Engineer Responsibilities

- [ ] Monitor alerting channel 24/7
- [ ] Acknowledge alerts within 5 minutes
- [ ] Investigate and resolve issues
- [ ] Document incident details
- [ ] Update status page
- [ ] Post incident report 24 hours after resolution

### Handoff to Next On-Call

```bash
# End of shift
- [ ] Summarize any ongoing issues
- [ ] Share notes on incidents
- [ ] Check no alerts are pending
- [ ] Update status page if needed
```

---

## Metrics & Reporting

### Weekly Report

```
Effect Models Weekly Operations Report
Week of: 2025-01-27

📊 Availability
- Uptime: 99.98%
- Error rate: 0.02%
- P99 latency: 450ms

🔄 Data Sync
- Last 4 syncs: All successful
- Avg sync duration: 38 minutes
- Models in database: 1,247

💾 Database
- Storage used: 2.5 GB / 20 GB
- Connections active: 45 / 100
- Backup status: ✅ All successful

⚡ Performance
- Cache hit rate: 87%
- Average query time: 120ms
- Cost: $145 (within budget)

🚨 Incidents
- Severity 1: 0
- Severity 2: 0
- Severity 3: 1 (slow query, resolved)

📋 Maintenance Completed
- [ ] Verified backup integrity
- [ ] Reviewed error logs
- [ ] Updated dependencies
```

### Key Metrics to Track

- **Availability**: 99.5% minimum target
- **Error Rate**: <0.5% target
- **Response Time (P99)**: <500ms target
- **Sync Success Rate**: 100% target
- **Database Connections**: Monitor growth
- **Cache Hit Rate**: >80% target
- **Cost**: Stay within monthly budget

---

## Communication

### Status Page

Maintain a status page (Statuspage.io, Incident.io) that shows:
- Current system status
- Ongoing incidents
- Scheduled maintenance
- Incident history

### Notification Channels

1. **Critical Issues**: Page on-call engineer via PagerDuty
2. **High Priority**: Post to #incidents Slack channel
3. **Maintenance**: Announce in #announcements
4. **Releases**: Update status page and #releases

### Stakeholder Communication

**For stakeholders (API users)**:
- Maintenance windows: Notify 1 week in advance
- Incidents: Update status page every 15 minutes
- Resolved: Post postmortem within 24 hours

---

## Tools & Access

### Required Tools

- **Monitoring**: Datadog / Prometheus / Grafana
- **Alerting**: PagerDuty / Opsgenie
- **Logs**: CloudWatch / Datadog / Loki
- **Status**: Statuspage.io
- **Communication**: Slack
- **Version Control**: GitHub
- **Deployment**: Vercel / Railway / Fly.io (chosen platform)

### Access Management

- [ ] Every engineer has database read access
- [ ] Senior engineers have database write access
- [ ] On-call engineers have deployment access
- [ ] Team lead has billing/infrastructure access
- [ ] Rotate credentials quarterly

---

## Post-Incident Process

### Incident Report Template

```markdown
# Incident Report: [Title]

**Date**: 2025-01-27
**Severity**: 2 (High)
**Duration**: 15 minutes
**Impact**: 0.5% of requests failed

## Summary
Brief description of what happened

## Timeline
- 14:00 UTC: Issue detected (alert fired)
- 14:05 UTC: Investigated, found root cause
- 14:15 UTC: Issue resolved (redeployed)
- 14:20 UTC: Verified all systems operational

## Root Cause
Technical explanation

## Resolution
What was done to fix it

## Prevention
- Action item 1
- Action item 2
- Action item 3

## Owner
@engineer-name

## Reviewers
@team-lead-name
```

---

## Escalation Matrix

| Issue | L1 (On-Call) | L2 (Senior) | L3 (Lead) |
|-------|--------------|------------|-----------|
| High latency | Investigate | Escalate if >10 min | Escalate if >20 min |
| Data sync failure | Check external APIs | Check DB/network | Review sync logic |
| Database down | Failover to replica | Restore from backup | Declare incident |
| Security issue | Isolate | Investigate | Notify legal/security |

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment strategy
- [README.md](./README.md) - Project overview
- [packages/website/CLAUDE.md](./packages/website/CLAUDE.md) - Architecture
