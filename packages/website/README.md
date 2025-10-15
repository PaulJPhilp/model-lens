
# ModelLens 🧠

ModelLens is an open-source web dashboard for AI engineers to explore, analyze, and compare LLM models from multiple providers. Built with comprehensive data aggregation and intelligent analytics.

## ✨ Features

### 📊 **Interactive Model Explorer**
- **Advanced Filtering & Sorting**: Filter models by provider, capabilities, pricing, and performance
- **Real-time Cost Estimation**: Calculate token costs and usage estimates with @tokenlens/tokenlens
- **Model Comparison**: Side-by-side analysis of model specifications and capabilities

### 📈 **Analytics & Intelligence**
- **ArtificialAnalysis Integration**: Access proprietary intelligence indices for objective model performance benchmarking
- **Provider Analytics**: Track model availability, pricing trends, and market dynamics
- **Historical Data**: Daily snapshots capturing model evolution and ecosystem changes

### 🌐 **Multi-Source Data Aggregation**
- **models.dev**: Comprehensive marketplace data from 50+ providers
- **OpenRouter**: Real-time routing and pricing information (326+ models)
- **HuggingFace**: Popular open-source models with download metrics (100+ models)
- **ArtificialAnalysis**: Intelligence benchmarking data (293+ models)

### 🕒 **Automated Data Pipeline**
- **Daily Sync**: Automated model data synchronization
- **Source Tracking**: Attribution for all model data by origin
- **Database Integration**: PostgreSQL with Drizzle ORM for reliable data persistence
- **Admin API**: Manual sync triggers and sync history monitoring

### 📋 **Model Management**
- **Timeline View**: Visualize model release patterns and evolution
- **Capability Detection**: Automatic identification of model features (tools, reasoning, vision, etc.)
- **Provider Intelligence**: Smart provider mapping and model categorization

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.8
- **Runtime**: Bun
- **Effects**: Effect 3.1.9
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: shadcn/ui + Tailwind CSS 4
- **Tables**: TanStack React Table
- **Charts**: Vis.js
- **Monorepo**: TurboRepo

## 📚 Documentation

- **[API Documentation](docs/API.md)** - Complete API reference with examples
- **[Interactive API Docs](http://localhost:3000/api-docs)** - Swagger UI interface
- **[Architecture Guide](docs/Architecture.md)** - System design and implementation details
- **[Database Setup](docs/DATABASE_SETUP.md)** - PostgreSQL configuration guide

## 🚀 Quick Start

### Prerequisites
- **Bun** (recommended) or Node.js 18+
- **PostgreSQL** database

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/model_lens
NODE_ENV=development

# Optional - Rate Limiting (for production)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Optional - External API Keys (for enhanced features)
OPENAI_API_KEY=sk-your-openai-api-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
HUGGINGFACE_API_KEY=hf_your-huggingface-token-here
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key-here
```

**Security Notes:**
- Never commit `.env` files to version control
- Use environment-specific values for production
- API keys are optional - the app works without them but with limited functionality
- Use secret management services in production (Vercel Secrets, AWS Secrets Manager, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/modellens.git
   cd modellens
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up the database**
   ```bash
   # Generate database schema
   bun run db:generate

   # Push schema to database
   bun run db:push
   ```

4. **Configure environment variables**
   Copy `.env.example` to `.env.local` and update with your values:
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/modellens"
   NODE_ENV="development"
   ```
   
   Optional variables:
   ```env
   MODEL_SERVICE_RETRY_MS=1000
   DB_RETRY_MS=1000
   ```

5. **Run the development server**
   ```bash
   bun run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000/models](http://localhost:3000/models)

## 📡 API Endpoints

### Public Endpoints
- `GET /api/models` - Retrieve all available models
- `GET /api/models/[id]` - Get specific model details

### Admin Endpoints
- `POST /api/admin/sync-models` - Trigger manual model data sync
- `GET /api/admin/sync-models` - View sync history and status

## 🔄 Data Synchronization

### Automated Daily Sync
ModelLens automatically syncs data from all sources daily. Configure cron jobs:

```bash
# Daily sync at 2 AM
0 2 * * * cd /path/to/modellens && bun run sync:models
```

### Manual Sync
Trigger immediate synchronization:
```bash
bun run sync:models
```

### Dry Run
Test synchronization without database writes:
```bash
bun run sync:models:dry-run
```

## 📊 Data Sources

### Primary Sources (Live API)
- **models.dev**: Marketplace pricing and specifications
- **OpenRouter**: Real-time availability and routing
- **HuggingFace**: Open-source model popularity metrics

### Analytics Sources (Database)
- **ArtificialAnalysis**: Intelligence indices and performance benchmarks

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   External APIs │───▶│  Model Services  │───▶│   Live Models   │
│                 │    │                  │    │                 │
│ • models.dev    │    │ • Data Fetching  │    │ • Real-time     │
│ • OpenRouter    │    │ • Transformation │    │ • API Response  │
│ • HuggingFace   │    │ • Validation     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        ▲
                                ▼                        │
┌─────────────────┐    ┌──────────────────┐             │
│   Database      │    │  Analytics       │             │
│                 │    │                  │             │
│ • PostgreSQL    │    │ • Intelligence   │─────────────┘
│ • Daily Snapshots│    │ • Trends         │
│ • Source Tracking│    │ • Comparisons    │
└─────────────────┘    └──────────────────┘
```

## 🔧 Development

### Database Operations
```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:push

# Reset database
bun run db:reset
```

### Testing
```bash
# Run all tests
bun run test

# Run specific test suite
bun run test:services

# Run API tests
bun run test:api
```

### Code Quality
```bash
# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck
```

## 📈 Analytics Features

### Intelligence Indices
- **ArtificialAnalysis Scores**: Proprietary performance benchmarks (0-68+ range)
- **Model Comparison**: Objective capability assessment across providers
- **Trend Analysis**: Track model evolution and market dynamics

### Provider Intelligence
- **Market Coverage**: 50+ AI providers and platforms
- **Pricing Analysis**: Cost comparison across deployment options
- **Capability Mapping**: Feature detection and categorization

## 🚢 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Docker
```bash
# Build container
docker build -t modellens .

# Run with database
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  modellens
```

### Manual Deployment
```bash
# Build for production
bun run build

# Start production server
bun run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

### Adding New Data Sources

1. Create a new service in `lib/services/`
2. Implement the data fetching logic
3. Add transformation functions
4. Update the sync script
5. Add database storage logic

## 📄 License

MIT - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **models.dev** for comprehensive model marketplace data
- **OpenRouter** for routing and pricing intelligence
- **HuggingFace** for open-source model ecosystem
- **ArtificialAnalysis** for objective performance benchmarks
- **Effect** team for the excellent functional programming library
- **shadcn/ui** for beautiful component primitives

---

**ModelLens** - Making AI model selection data-driven and intelligent 🧠✨
