#!/bin/bash
# Setup cron job for daily model data sync
# Run this script on your server to schedule automated syncs

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$PROJECT_DIR/packages/website/src/scripts/sync-models.ts"
HEALTH_SCRIPT="$PROJECT_DIR/packages/website/src/scripts/check-sync-health.ts"
LOG_DIR="$PROJECT_DIR/logs"
SYNC_LOG="$LOG_DIR/sync.log"
HEALTH_LOG="$LOG_DIR/health.log"

# Create log directory
mkdir -p "$LOG_DIR"

echo "Setting up cron jobs for Model Lens data sync..."

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "sync-models.ts"; then
    echo "⚠️  Cron job for sync already exists. Skipping..."
else
    # Add daily sync job (2 AM UTC)
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $PROJECT_DIR && bun run sync-models >> $SYNC_LOG 2>&1") | crontab -
    echo "✅ Added daily sync cron job (runs at 2 AM UTC)"
fi

# Check if health check cron job exists
if crontab -l 2>/dev/null | grep -q "check-sync-health.ts"; then
    echo "⚠️  Cron job for health check already exists. Skipping..."
else
    # Add hourly health check job
    (crontab -l 2>/dev/null; echo "0 * * * * cd $PROJECT_DIR && bun run packages/website/src/scripts/check-sync-health.ts >> $HEALTH_LOG 2>&1 || echo 'Health check failed'") | crontab -
    echo "✅ Added hourly health check cron job"
fi

echo ""
echo "📋 Current cron jobs:"
crontab -l | grep -E "(sync-models|check-sync-health)" || echo "No relevant cron jobs found"

echo ""
echo "📁 Log files:"
echo "  Sync logs: $SYNC_LOG"
echo "  Health logs: $HEALTH_LOG"

echo ""
echo "🔧 Manual commands:"
echo "  Run sync: bun run sync-models"
echo "  Run health check: cd packages/website && bun run ../../src/scripts/check-sync-health.ts"
echo "  View logs: tail -f $SYNC_LOG"
echo "  Edit cron: crontab -e"

echo ""
echo "✅ Setup complete!"
echo ""
echo "💡 Tips:"
echo "  - Monitor logs regularly: tail -f $SYNC_LOG"
echo "  - Check health status: bun run packages/website/src/scripts/check-sync-health.ts"
echo "  - Adjust cron timing by editing with: crontab -e"
echo "  - For different schedules, modify the cron expressions above"
