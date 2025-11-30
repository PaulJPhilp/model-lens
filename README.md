# Effect Models

Open-source REST API for AI model discovery and comparison. Aggregates real-time data from multiple AI provider APIs and provides a simple REST interface for querying model information.

## Features

- **Multi-Source Aggregation**: Fetches model data from models.dev, OpenRouter, HuggingFace, and ArtificialAnalysis
- **Real-time Sync**: Automated data synchronization via CLI or API triggers
- **PostgreSQL Storage**: Persistent storage for aggregated model data
- **Type-Safe API**: Effect.js-powered backend with comprehensive error handling
- **Caching**: Optional Redis caching for improved performance

## Architecture

- **Framework**: Effect Platform HTTP (pure backend, no web UI)
- **Runtime**: Bun 1.3+
- **Language**: TypeScript 5.8+ (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Upstash Redis (optional)

## Quick Start

```bash
# Install dependencies
bun install

# Setup database
cd packages/website
bun run db:push

# Sync model data
bun run sync-models

# Start API server
bun run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `GET /v1/models` - List all aggregated models with pagination

### Admin Endpoints (require x-admin: true header)

- `POST /v1/admin/sync` - Trigger manual model sync
- `GET /v1/admin/sync/history` - View sync history

## Available Scripts

```bash
# Development
bun run dev              # Start development server
bun run build           # Build for production
bun run start           # Start production server

# Data Operations
bun run sync-models     # Sync models from all APIs
bun run check-sync-health # Monitor sync status

# Database
cd packages/website
bun run db:generate     # Generate migrations
bun run db:push         # Apply schema changes
bun run db              # Interactive database CLI

# Code Quality
bun run lint            # Format and lint
bun run test            # Run tests
bun run check           # Type check
```

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/effect_models

# Optional (for caching and rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Configuration
NODE_ENV=production
PORT=3000
API_RETRY_MS=1000
```

## Data Sources

Effect Models aggregates data from:

1. **models.dev** - Provider pricing and model specifications
2. **OpenRouter** - Real-time model availability and pricing
3. **HuggingFace** - Open-source model metrics and downloads
4. **ArtificialAnalysis** - Performance benchmarks and intelligence scores

## Testing

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage
```

## Documentation

- `packages/website/CLAUDE.md` - Development guide for this codebase
- `packages/website/docs/API.md` - Complete API reference
- `packages/website/docs/Architecture.md` - System design
- `packages/website/docs/DATABASE_SETUP.md` - Database setup guide

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `bun run lint` and `bun run test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details
