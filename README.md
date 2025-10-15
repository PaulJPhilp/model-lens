# Model Lens

A comprehensive database and comparison tool for AI models, aggregating data from multiple sources to help users discover and evaluate AI models.

## Features

- **Multi-Source Aggregation**: Fetches model data from models.dev, OpenRouter, HuggingFace, and ArtificialAnalysis
- **Real-time Updates**: Automated daily sync keeps data current
- **Advanced Filtering**: Powerful rule-based filtering system
- **Performance Metrics**: Compare models by cost, speed, and capabilities
- **API Access**: RESTful API for programmatic access
- **Health Monitoring**: Built-in sync monitoring and alerting

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run database migrations
cd packages/website && bun run db:push

# Sync model data
bun run sync-models
```

## Available Scripts

```bash
# Development
bun run dev              # Start development servers
bun run build           # Build all packages
bun run lint            # Run linter
bun run test            # Run tests

# Data Operations
bun run sync-models     # Sync model data from APIs
bun run check-sync-health # Check sync health status

# Database Management
bun run db              # Database CLI for inspection and management
bun run analytics       # Generate comprehensive analytics reports
```

## Data Sync Workflow

Model Lens automatically syncs AI model data on a schedule. See [DATA_SYNC_WORKFLOW.md](DATA_SYNC_WORKFLOW.md) for detailed information about:

- Automated daily syncs via GitHub Actions
- Self-hosted cron job setup
- Health monitoring and alerting
- Manual sync operations
- Troubleshooting guides

## Available Scripts

```bash
# Development
bun run dev              # Start development servers
bun run build           # Build all packages
bun run lint            # Run linter
bun run test            # Run tests

# Data Operations
bun run sync-models     # Sync model data from APIs
bun run check-sync-health # Check sync health status

# Database
cd packages/website
bun run db:generate     # Generate migrations
bun run db:push         # Apply schema changes
bun run db:migrate      # Run migrations
```

## Architecture

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Upstash Redis
- **Effects**: Effect library for functional programming
- **Testing**: Vitest with coverage thresholds

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis (optional, for caching)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Sync configuration
API_RETRY_MS=1000
```

## API Endpoints

- `GET /api/models` - List models with filtering
- `POST /api/admin/sync-models` - Trigger manual sync
- `GET /api/admin/sync-models` - View sync history
- `GET/POST /api/filters` - Manage saved filters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `bun run lint` and `bun run test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details
