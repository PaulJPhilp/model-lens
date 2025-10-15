# Model Data Management Setup

This document explains how to set up the automated daily model data synchronization for Model Lens.

## Overview

The data management system automatically fetches model data from external APIs and stores it in the database daily. This provides:

- Historical tracking of model changes
- Reduced dependency on external APIs for frontend requests
- Better performance and reliability
- Audit trail of model data updates

## Database Setup

### 1. Run Database Migrations

First, ensure your database is set up and run the latest migrations:

```bash
# Apply database migrations
bun run db:migrate

# Or push schema changes directly (for development)
bun run db:push
```

### 2. Verify Database Connection

Test that your database connection is working:

```bash
# Run the database connection test
bun run src/scripts/verify-db.ts
```

## Manual Sync

### Run a One-Time Sync

To manually trigger a model data sync:

```bash
# Run the sync script
bun run sync:models
```

This will:
1. Fetch model data from the external API (`https://models.dev/api.json`)
2. Transform the data into our internal format
3. Store it in the database with a new sync ID
4. Mark the sync operation as completed

### Dry Run

To test the sync without actually storing data:

```bash
# Run in dry-run mode (doesn't modify database)
bun run sync:models:dry-run
```

## Automated Daily Sync

### Option 1: Cron Job (Recommended for Production)

Set up a daily cron job to run the sync script:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 2 AM
0 2 * * * cd /path/to/model-lens && bun run sync:models >> /var/log/model-lens-sync.log 2>&1
```

**Notes:**
- Replace `/path/to/model-lens` with the actual path to your project
- Adjust the time (2 AM in this example) as needed
- The log file will capture both stdout and stderr
- Ensure the environment variables (like `DATABASE_URL`) are available in the cron environment

### Option 2: Systemd Timer (Linux)

Create a systemd service and timer for more reliable scheduling:

```bash
# Create service file: /etc/systemd/system/model-lens-sync.service
[Unit]
Description=Model Lens Daily Model Sync
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/model-lens
ExecStart=/usr/local/bin/bun run sync:models
StandardOutput=journal
StandardError=journal

# Create timer file: /etc/systemd/system/model-lens-sync.timer
[Unit]
Description=Run Model Lens sync daily
Requires=model-lens-sync.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Then enable and start the timer:

```bash
sudo systemctl enable model-lens-sync.timer
sudo systemctl start model-lens-sync.timer
```

### Option 3: GitHub Actions (for Vercel deployments)

If deploying to Vercel, you can use GitHub Actions to trigger daily syncs:

```yaml
# .github/workflows/daily-sync.yml
name: Daily Model Sync

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run sync:models
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Monitoring

### Check Sync Status

You can check the status of sync operations through the database or via the admin API (when implemented).

### View Sync History

Query the database directly to see sync history:

```sql
SELECT id, started_at, completed_at, status, total_fetched, total_stored, error_message
FROM model_syncs
ORDER BY started_at DESC
LIMIT 10;
```

### Logs

Monitor the application logs for sync-related messages:

- `[Sync]` - Sync operation logs
- `[ModelDataService]` - Database operation logs

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Ensure database is running and accessible
   - Verify network connectivity

2. **External API Unavailable**
   - The sync will retry with exponential backoff
   - Check network connectivity to `https://models.dev/api.json`
   - Sync operations are marked as failed in the database

3. **Permission Issues**
   - Ensure the user running the sync has write access to the database
   - For cron jobs, ensure environment variables are properly set

4. **Memory Issues**
   - Large model datasets may require more memory
   - Monitor system resources during sync operations

### Recovery

If a sync fails, you can:

1. Check the error message in the `model_syncs` table
2. Run a manual sync: `bun run sync:models`
3. Investigate and fix the underlying issue
4. Re-run the sync

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `MODEL_SERVICE_RETRY_MS`: Retry delay for external API calls (default: 1000ms)
- `DB_RETRY_MS`: Retry delay for database operations (default: 1000ms)

### Customization

The sync script can be customized by:

1. Modifying `src/scripts/sync-models.ts` for different data sources
2. Updating the transformation logic in the script
3. Changing retry policies and timeouts
4. Adding additional validation or filtering

## Future Enhancements

Potential improvements to the data management system:

- Webhook notifications for sync failures
- Slack/Discord integration for alerts
- Metrics and monitoring dashboard
- Incremental syncs (only update changed models)
- Data validation and quality checks
- Backup and recovery procedures
