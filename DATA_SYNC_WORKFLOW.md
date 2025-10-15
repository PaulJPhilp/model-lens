# Model Lens Data Sync Workflow

This document describes the automated workflow for downloading AI model data and building the database on a schedule.

## Overview

The Model Lens application maintains an up-to-date database of AI models by periodically fetching data from multiple external APIs and storing it in PostgreSQL. The sync process runs automatically and includes monitoring and health checks.

## Data Sources

The sync fetches model data from:
- **models.dev** - Comprehensive model registry
- **OpenRouter** - Model marketplace with pricing
- **HuggingFace** - Open-source model repository
- **ArtificialAnalysis** - Model intelligence rankings

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   External APIs │───▶│   Sync Script    │───▶│   PostgreSQL    │
│                 │    │                  │    │   Database      │
│ • models.dev    │    │ • Parallel fetch │    │                 │
│ • OpenRouter    │    │ • Transform      │    │ • model_snapshots│
│ • HuggingFace   │    │ • Store batches  │    │ • model_syncs   │
│ • ArtificialAnalysis│ │ • Error handling │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Database Schema

### model_snapshots
- Stores complete model data at sync time
- Includes provider, source, and timestamp tracking
- Indexed for fast queries

### model_syncs
- Tracks sync operations and their status
- Records success/failure and metrics
- Used for monitoring and debugging

## Sync Process

1. **Initialize**: Test database connection and create sync record
2. **Fetch**: Retrieve data from all sources in parallel
3. **Transform**: Convert API responses to internal Model format
4. **Store**: Batch insert models with source tracking
5. **Complete**: Update sync record with results
6. **Cleanup**: Close connections and log results

## Scheduling Options

### Option 1: GitHub Actions (Recommended for Cloud)

The repository includes a GitHub Actions workflow (`.github/workflows/daily-sync.yml`) that:

- Runs daily at 2 AM UTC
- Can be manually triggered
- Uses PostgreSQL service for testing
- Includes health checks
- Can send notifications on failure

**Setup:**
```bash
# No setup required - runs automatically on GitHub
# Configure environment secrets as needed
```

### Option 2: Cron Jobs (For Self-Hosted)

For self-hosted deployments, use the provided setup script:

```bash
# Make script executable and run
chmod +x setup-cron.sh
./setup-cron.sh
```

This creates cron jobs for:
- Daily sync at 2 AM UTC
- Hourly health checks

**Cron Schedule:**
```
# Daily sync
0 2 * * * cd /path/to/model-lens && bun run sync-models

# Hourly health check
0 * * * * cd /path/to/model-lens && bun run check-sync-health
```

### Option 3: Manual/On-Demand

Run syncs manually when needed:

```bash
# From project root
bun run sync-models

# Or directly
cd packages/website && bun run ../../src/scripts/sync-models.ts
```

## Monitoring & Health Checks

### Health Check Script

The health check monitors:
- **Sync Freshness**: Age of last successful sync (< 24 hours)
- **Data Volume**: Minimum number of models stored
- **Failure Rate**: Recent sync success rate
- **Database**: Connection health

**Run health check:**
```bash
bun run check-sync-health
```

**Exit codes:**
- `0`: Healthy (all checks pass)
- `1`: Warning (some issues)
- `2`: Critical (immediate attention needed)

### Logs

Logs are written to:
- `logs/sync.log` - Sync operation logs
- `logs/health.log` - Health check logs

Monitor logs with:
```bash
tail -f logs/sync.log
```

### API Monitoring

Use the admin API to check sync status:

```bash
# Get sync history
curl http://localhost:3000/api/admin/sync-models

# Trigger manual sync
curl -X POST http://localhost:3000/api/admin/sync-models
```

## Configuration

### Environment Variables

Required for sync operations:
```env
DATABASE_URL=postgresql://user:pass@host:port/db
```

Optional:
```env
# API rate limiting
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Sync behavior
API_RETRY_MS=1000
```

### Health Check Configuration

Adjust thresholds in `check-sync-health.ts`:
```typescript
const HEALTH_CONFIG = {
  maxSyncAgeHours: 25,        // Max age for last sync
  minExpectedModels: 100,     // Minimum model count
  maxFailureRate: 20,         // Max failure percentage
  recentSyncsToCheck: 10,     // Syncs to analyze
}
```

## Troubleshooting

### Common Issues

**Database Connection Failed:**
- Check DATABASE_URL
- Verify PostgreSQL is running
- Check network connectivity

**Sync Taking Too Long:**
- Check API rate limits
- Review network latency
- Consider increasing concurrency

**Models Not Appearing:**
- Check transform functions
- Verify API responses
- Review error logs

**High Failure Rate:**
- Check API endpoints
- Review authentication
- Monitor rate limits

### Manual Recovery

**Force re-sync:**
```bash
# Clear cache and force fresh fetch
rm -rf .next/cache
bun run sync-models
```

**Reset database:**
```bash
# Drop and recreate (CAUTION: loses data)
bun run db:push --force
bun run sync-models
```

**Debug mode:**
```bash
# Run with verbose logging
DEBUG=* bun run sync-models
```

## Performance Optimization

### Database Indexes
Ensure these indexes exist:
- `idx_model_snapshots_sync_id`
- `idx_model_snapshots_synced_at`
- `idx_model_snapshots_source`
- `idx_model_snapshots_provider`

### Caching Strategy
- Models cached in Redis for 24 hours
- Database serves as persistent store
- API responses cached to reduce load

### Concurrency
- Parallel fetching from multiple sources
- Batch database inserts
- Configurable concurrency limits

## Alerting

### GitHub Actions
The workflow can be extended to send notifications:
- Slack webhooks
- Discord webhooks
- Email notifications
- PagerDuty integration

### Cron Jobs
For self-hosted, add alerting to cron:
```bash
# In crontab
0 2 * * * cd /path/to/project && bun run sync-models && curl -X POST https://alert-service/success || curl -X POST https://alert-service/failure
```

### Health Check Integration
Use exit codes for monitoring systems:
```bash
#!/bin/bash
if ! bun run check-sync-health; then
    # Send alert
    curl -X POST https://alert-service/health-check-failed
fi
```

## Future Enhancements

- **Incremental Syncs**: Only sync changed models
- **Change Detection**: Notify on new/changed models
- **Analytics**: Track model popularity trends
- **Multi-region**: Sync from different geographic sources
- **Quality Gates**: Validate data before storing
- **Backup/Restore**: Automated database backups

## Support

For issues with the sync workflow:
1. Check logs in `logs/` directory
2. Run health check: `bun run check-sync-health`
3. Review recent syncs: `GET /api/admin/sync-models`
4. Check database connectivity
5. Verify environment variables
