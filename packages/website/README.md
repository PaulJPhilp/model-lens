# Effect Models - Backend API Server

A pure backend REST API for AI model discovery and comparison. Aggregates real-time data from multiple AI provider APIs and provides type-safe endpoints for querying 1000+ AI models from 50+ providers.

## Features

- **Multi-Source Data Aggregation**: Fetches model data from models.dev, OpenRouter, HuggingFace, and ArtificialAnalysis
- **Persistent Storage**: PostgreSQL database for storing aggregated model data
- **Real-time Sync**: Manual sync via CLI or API endpoints
- **Type-Safe API**: Effect.js-powered backend with comprehensive error handling
- **Caching**: Optional Redis caching for improved performance
- **Simple REST Interface**: Clean API endpoints for model queries

## Tech Stack

- **HTTP Framework**: Effect Platform HTTP (built on Effect.js 3.18+)
- **Language**: TypeScript 5.8+ (strict mode)
- **Runtime**: Bun 1.3+
- **Database**: PostgreSQL with Drizzle ORM
- **Optional Caching**: Upstash Redis
- **Testing**: Vitest
- **Code Quality**: Biome

## Quick Start

### Prerequisites

- **Bun** 1.3+ (required)
- **PostgreSQL** 12+ database
- **Node.js** compatible environment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/effect-models.git
   cd effect-models
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up the database**
   ```bash
   cd packages/website
   bun run db:push
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your PostgreSQL connection string
   ```

5. **Start the API server**
   ```bash
   cd packages/website
   bun run dev
   ```

6. **Verify the server is running**
   ```bash
   curl http://localhost:3000/health
   ```

   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-01-27T16:40:00.000Z",
     "version": "1.0.0"
   }
   ```

7. **Try the API**
   ```bash
   curl http://localhost:3000/v1/models?limit=10
   ```

## Environment Variables

Create a `.env.local` file in the `packages/website` directory:

```env
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/effect_models
NODE_ENV=development
PORT=3000

# Optional - Caching (for production)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Configuration
API_RETRY_MS=1000
MODEL_SERVICE_RETRY_MS=1000
```

## API Endpoints

### Public Endpoints

- `GET /health` - Health check endpoint
- `GET /v1/models` - List all aggregated models with pagination

### Admin Endpoints

Admin endpoints require the `x-admin: true` header.

- `POST /v1/admin/sync` - Trigger manual model data sync
- `GET /v1/admin/sync/history` - View sync history and status

See [API Documentation](docs/API.md) for complete endpoint reference with examples.

## Data Synchronization

Keep model data fresh through multiple sync mechanisms:

### Manual Sync via CLI

Run synchronization directly from the command line:

```bash
cd packages/website
bun run sync-models
```

### API-Triggered Sync

Trigger synchronization via the API endpoint (requires admin):

```bash
curl -X POST "http://localhost:3000/v1/admin/sync" \
  -H "x-admin: true"
```

### Check Sync Status

```bash
cd packages/website
bun run check-sync-health
```

### View Sync History

```bash
curl "http://localhost:3000/v1/admin/sync/history?limit=10" \
  -H "x-admin: true"
```

## Data Sources

Effect Models aggregates data from:

1. **models.dev** - Marketplace pricing and specifications
2. **OpenRouter** - Real-time availability and routing
3. **HuggingFace** - Open-source model popularity metrics
4. **ArtificialAnalysis** - Performance benchmarks

## Development

### Running the Server

```bash
cd packages/website

# Development server with hot reload
bun run dev

# Or run directly
bun run src/server.ts
```

### Database Operations

```bash
cd packages/website

# Generate migrations from schema changes
bun run db:generate

# Apply schema changes to database
bun run db:push

# Reset database (caution: deletes all data)
bun run db:reset

# Interactive database CLI
bun run db
```

### Testing

```bash
cd packages/website

# Run all tests
bun run test

# Run in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```

### Code Quality

```bash
cd packages/website

# Lint and format code
bun run lint

# Type checking
bun run check
```

### Building

```bash
cd packages/website

# Build for production
bun run build

# Start production build
bun run start
```

## Architecture

Effect Models is a pure backend API server using Effect.js for functional programming and type safety:

```
┌────────────────────────────────────────────────────────────────┐
│                     REST API Server (Effect Platform HTTP)      │
│                                                                  │
│  ┌──────────────────┐  ┌────────────────────────┐               │
│  │ /health          │  │ /v1/admin              │               │
│  │ /v1/models       │  │ • POST /sync           │               │
│  │ • GET /models    │  │ • GET /sync/history    │               │
│  │ • Pagination     │  │                        │               │
│  │ • Live data      │  │                        │               │
│  └──────────────────┘  └────────────────────────┘               │
│            │                    │                                │
│            └────────────────────┼────────────────────┐           │
│                                 ▼                    ▼            │
│                    ┌────────────────────────┐      │             │
│                    │   Service Layer        │      │             │
│                    │ (Effect.Service)       │      │             │
│                    │                        │      │             │
│                    │ • ModelService         │      │             │
│                    │ • ModelDataService     │      │             │
│                    │ • CacheService         │      │             │
│                    │ • RateLimitService     │      │             │
│                    └────────────────────────┘      │             │
└────────────────────────────────────────────────────┼─────────────┘
                                                      │
                ┌──────────────────────────────────────┼──────────────┐
                ▼                                      ▼              ▼
        ┌─────────────┐  ┌────────────────────┐  ┌─────────────┐
        │  PostgreSQL │  │   External APIs    │  │   Cache     │
        │  Database   │  │                    │  │  (Upstash)  │
        │             │  │ • models.dev       │  │             │
        │ • Models    │  │ • OpenRouter       │  │ • Redis     │
        │ • Syncs     │  │ • HuggingFace      │  │ • TTL-based │
        │             │  │ • ArtAnalysis      │  │             │
        └─────────────┘  └────────────────────┘  └─────────────┘
```

## Deployment

### Self-Hosted (Recommended)

1. **Build the server**
   ```bash
   cd packages/website
   bun run build
   ```

2. **Set production environment variables**
   ```bash
   export DATABASE_URL="postgresql://prod-user:password@prod-host:5432/effect_models"
   export PORT=3000
   export NODE_ENV=production
   export UPSTASH_REDIS_REST_URL="https://your-production-redis.upstash.io"
   export UPSTASH_REDIS_REST_TOKEN="your-production-token"
   ```

3. **Start the server**
   ```bash
   cd packages/website
   bun run start
   ```

### Docker

```bash
# Build container
docker build -t effect-models .

# Run with database
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@db-host:5432/effect_models" \
  -e NODE_ENV=production \
  effect-models
```

### Cloud Platforms

**Railway**, **Render**, **Fly.io**, or similar Bun-compatible platforms:
1. Connect your GitHub repository
2. Set environment variables in platform dashboard
3. Deploy (platforms with Bun runtime support)

**AWS/Azure/GCP**:
- Use container deployment (Docker)
- Ensure PostgreSQL database is accessible
- Configure environment variables in deployment service

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Write tests for your changes
4. Run `bun run check` to verify types
5. Run `bun run lint` to format code
6. Run `bun run test` to verify tests pass
7. Commit changes: `git commit -am 'Add new feature'`
8. Push to branch: `git push origin feature/new-feature`
9. Submit a Pull Request

## License

MIT - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **models.dev** for comprehensive model marketplace data
- **OpenRouter** for routing and pricing intelligence
- **HuggingFace** for open-source model ecosystem
- **ArtificialAnalysis** for objective performance benchmarks
- **Effect** team for the excellent functional programming library
- **Bun** for high-performance JavaScript runtime and package manager
- **Drizzle ORM** for type-safe database access
