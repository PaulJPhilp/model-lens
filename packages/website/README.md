
# Effect Models 🧠

ModelLens is an open-source REST API server for AI model discovery and comparison. It aggregates real-time data from multiple AI provider APIs and provides type-safe endpoints for querying, filtering, and analyzing 1000+ AI models from 50+ providers.

## ✨ Features

### 🌐 **Multi-Source Data Aggregation**
- **models.dev**: Comprehensive marketplace data from 50+ providers
- **OpenRouter**: Real-time routing and pricing information (326+ models)
- **HuggingFace**: Popular open-source models with download metrics (100+ models)
- **ArtificialAnalysis**: Intelligence benchmarking data (293+ models)

### 📊 **Advanced Filtering API**
- **Saved Filters**: Create, update, and manage custom model filters
- **Filter Evaluation**: Execute filters against live models with execution history
- **Visibility Scopes**: Private, team-based, and public filter sharing
- **Filter Runs**: Track evaluation history and results over time

### 📋 **Model Management**
- **REST Endpoints**: Type-safe endpoints for model exploration and discovery
- **Pagination**: Efficient query results with page-based pagination
- **Real-time Data**: Models fetched from live APIs on request
- **Database Persistence**: PostgreSQL storage for filters and evaluation history

### 🕒 **Automated Data Pipeline**
- **Manual Sync Triggers**: Admin endpoint to trigger model data synchronization
- **Sync History**: Track synchronization status and statistics
- **Multiple Sources**: Aggregate data from 4 independent API sources
- **Error Resilience**: Partial failure handling with retry logic

## 🛠️ Tech Stack

- **HTTP Framework**: Effect Platform HTTP (built on Effect.js)
- **Language**: TypeScript 5.8+
- **Runtime**: Bun 1.3+
- **Functional Programming**: Effect.js 3.18+
- **Database**: PostgreSQL with Drizzle ORM
- **ORM**: Drizzle ORM 0.44+
- **Testing**: Vitest 3.2+
- **Code Quality**: Biome 2.2+

## 📚 Documentation

- **[API Documentation](docs/API.md)** - Complete REST API reference with examples
- **[Architecture Guide](docs/Architecture.md)** - System design and implementation details
- **[Database Setup](docs/DATABASE_SETUP.md)** - PostgreSQL configuration guide

## 🚀 Quick Start

### Prerequisites
- **Bun** 1.3+ (required)
- **PostgreSQL** 12+ database
- **Node.js** compatible environment (Bun provides runtime)

### Environment Variables

Create a `.env.local` file in the `packages/website` directory:

```env
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/model_lens
NODE_ENV=development
PORT=3000

# Optional - Caching (for production)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

**Security Notes:**
- Never commit `.env.local` files to version control
- Use environment-specific values for production
- The API works without Redis but caching will be disabled
- Use secret management services in production (Vercel Secrets, AWS Secrets Manager, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/modellens.git
   cd model-lens
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up the database**
   ```bash
   cd packages/website

   # Generate database schema (if needed)
   bun run db:generate

   # Push schema to database (creates tables)
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
   bun run src/server.ts
   ```

   Or use the dev command with hot reload:
   ```bash
   bun run dev
   ```

6. **Verify the server is running**
   ```bash
   curl -H "x-user-id: test-user" http://localhost:3000/health
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
   curl -H "x-user-id: test-user" http://localhost:3000/v1/models?page=1&pageSize=10
   ```

## 📡 API Endpoints

All endpoints require the `x-user-id` header for authentication.

### Models
- `GET /v1/models` - List all available models with pagination
- `GET /health` - Health check endpoint

### Filters Management
- `GET /v1/filters` - List filters accessible to user
- `POST /v1/filters` - Create a new filter
- `GET /v1/filters/:id` - Get specific filter details
- `PUT /v1/filters/:id` - Update a filter (owner only)
- `DELETE /v1/filters/:id` - Delete a filter (owner only)

### Filter Evaluation
- `POST /v1/filters/:id/evaluate` - Evaluate filter against models
- `GET /v1/filters/:id/runs` - List evaluation runs for a filter
- `GET /v1/filters/:id/runs/:runId` - Get specific evaluation run

### Admin Operations
- `POST /v1/admin/sync` - Trigger manual model data sync (admin only)
- `GET /v1/admin/sync/history` - View sync history and status (admin only)

See [API Documentation](docs/API.md) for complete endpoint reference with examples.

## 🔄 Data Synchronization

ModelLens keeps model data fresh through multiple sync mechanisms:

### API-Triggered Sync
Trigger synchronization via the API endpoint (requires admin privileges):

```bash
curl -X POST "http://localhost:3000/v1/admin/sync" \
  -H "x-user-id: admin-user" \
  -H "x-admin: true"
```

### Manual Sync via CLI
Run synchronization directly from the command line:

```bash
cd packages/website
bun run sync-models
```

### Automated Sync (Cron)
Set up automated daily synchronization:

```bash
# Daily sync at 2 AM UTC
0 2 * * * cd /path/to/model-lens/packages/website && bun run sync-models
```

### Monitor Sync Status
Check synchronization history and health:

```bash
# View last 10 sync operations
curl -H "x-user-id: admin-user" \
     -H "x-admin: true" \
     "http://localhost:3000/v1/admin/sync/history?limit=10"
```

## 📊 Data Sources

### Primary Sources (Live API)
- **models.dev**: Marketplace pricing and specifications
- **OpenRouter**: Real-time availability and routing
- **HuggingFace**: Open-source model popularity metrics

### Analytics Sources (Database)
- **ArtificialAnalysis**: Intelligence indices and performance benchmarks

## 🏗️ Architecture

ModelLens is a pure backend API server using Effect.js for functional programming and type safety:

```
┌────────────────────────────────────────────────────────────────┐
│                     REST API Server (Effect Platform HTTP)      │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ /v1/models       │  │ /v1/filters      │  │ /v1/admin    │  │
│  │ • GET /models    │  │ • GET /filters   │  │ • POST /sync │  │
│  │ • Pagination     │  │ • POST /filters  │  │ • GET /history
│  │ • Live data      │  │ • Filter runs    │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│            │                    │                      │         │
│            └────────────────────┼──────────────────────┘         │
│                                 ▼                                │
│                    ┌────────────────────────┐                    │
│                    │   Service Layer        │                    │
│                    │ (Effect.Service)       │                    │
│                    │                        │                    │
│                    │ • ModelService         │                    │
│                    │ • FilterService        │                    │
│                    │ • CacheService         │                    │
│                    │ • RateLimitService     │                    │
│                    └────────────────────────┘                    │
└────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
        ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
        │  PostgreSQL │  │   External   │  │   Cache     │
        │  Database   │  │     APIs     │  │  (Upstash)  │
        │             │  │              │  │             │
        │ • Filters   │  │ • models.dev │  │ • Redis     │
        │ • Runs      │  │ • OpenRouter │  │ • TTL-based │
        │ • Analytics │  │ • HuggingFace│  │             │
        │             │  │ • ArtAnalysis│  │             │
        └─────────────┘  └──────────────┘  └─────────────┘
```

**Technology Stack:**
- **HTTP Framework**: Effect Platform HTTP (Effect.js built-in)
- **Functional Programming**: Effect.js for error handling and dependency injection
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Concurrency**: Effect.js for managing concurrent API calls with retry logic
- **Testing**: Vitest for unit and integration tests

## 🔧 Development

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

# Lint and format code with Biome
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

## 🚢 Deployment

### Self-Hosted (Recommended)

1. **Build the server**
   ```bash
   cd packages/website
   bun run build
   ```

2. **Set production environment variables**
   ```bash
   export DATABASE_URL="postgresql://prod-user:password@prod-host:5432/model_lens"
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
docker build -t modellens .

# Run with database
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@db-host:5432/model_lens" \
  -e NODE_ENV=production \
  modellens
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Write tests for your changes
4. Run `bun run check` to verify types
5. Run `bun run lint` to format code
6. Run `bun run test` to verify tests pass
7. Commit changes: `git commit -am 'Add new feature'`
8. Push to branch: `git push origin feature/new-feature`
9. Submit a Pull Request

### Adding New API Endpoints

1. Create route handler in `src/routes/`
2. Define request/response types
3. Add validation using Zod or Effect Schema
4. Create corresponding Effect.Service if needed
5. Add tests in `tests/`
6. Update API documentation in `docs/API.md`

### Adding New Data Sources

1. Create a new service in `lib/services/` extending `Effect.Service`
2. Implement the data fetching and transformation logic
3. Add to `lib/layers.ts` for dependency injection
4. Update `ModelServiceLive.ts` to include new source
5. Add tests for the new service
6. Document the new data source in README and API docs

## 📄 License

MIT - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **models.dev** for comprehensive model marketplace data
- **OpenRouter** for routing and pricing intelligence
- **HuggingFace** for open-source model ecosystem
- **ArtificialAnalysis** for objective performance benchmarks
- **Effect** team for the excellent functional programming library
- **Bun** for high-performance JavaScript runtime and package manager
- **Drizzle ORM** for type-safe database access
- **Effect Platform HTTP** for type-safe REST server framework

---

**ModelLens** - Open-source REST API for AI model discovery and comparison 🧠✨
