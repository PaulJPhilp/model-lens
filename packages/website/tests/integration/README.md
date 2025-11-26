# Integration Test Suite

Comprehensive integration tests for the effect-models project.

## Overview

This test suite covers:
- **API Integration**: End-to-end testing of all API routes
- **Service Integration**: Testing service interactions with real dependencies
- **Database Integration**: Database operations, transactions, and data integrity
- **External Services**: Integration with HuggingFace, OpenRouter, and Artificial Analysis APIs

## Test Structure

```
tests/
├── integration/
│   ├── setup.ts                          # Test utilities and setup
│   ├── api/
│   │   ├── models.integration.test.ts           # Models API tests
│   │   ├── filters.integration.test.ts          # Filters CRUD tests
│   │   └── filter-evaluation.integration.test.ts # Filter evaluation tests
│   ├── services/
│   │   └── external-services.integration.test.ts # External API tests
│   └── database/
│       └── database.integration.test.ts         # Database tests
└── setup/
    └── test-setup.ts                     # Global test configuration
```

## Prerequisites

### 1. Database Setup

Ensure you have a test database configured:

```bash
# Set up environment variables
cp .env.example .env

# Configure database connection
DATABASE_URL=postgresql://user:password@localhost:5432/effect_models_test
```

### 2. API Credentials (Optional)

For external service tests, configure API keys:

```bash
HUGGINGFACE_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
ARTIFICIAL_ANALYSIS_API_KEY=your_key_here
```

**Note:** External service tests will be skipped if API credentials are not provided.

## Running Tests

### Run All Integration Tests

```bash
npm run test:integration
```

### Run Specific Test Suites

```bash
# API tests only
npm run test:integration:api

# Service tests only
npm run test:integration:services

# Database tests only
npm run test:integration:database
```

### Run with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

## Test Categories

### 1. API Integration Tests

Tests complete API workflows:

- **Models API** (`models.integration.test.ts`)
  - Fetching models from database
  - Filtering and sorting
  - Error handling
  
- **Filters API** (`filters.integration.test.ts`)
  - CRUD operations
  - Visibility controls (private, team, public)
  - Pagination
  - Usage tracking
  
- **Filter Evaluation** (`filter-evaluation.integration.test.ts`)
  - Filter application logic
  - Complex filter scenarios
  - Run tracking
  - Performance testing

### 2. Service Integration Tests

Tests service layer with real dependencies:

- **External Services** (`external-services.integration.test.ts`)
  - HuggingFace API integration
  - OpenRouter API integration
  - Artificial Analysis API integration
  - Data aggregation and deduplication
  - Error recovery
  - Health checks

### 3. Database Integration Tests

Tests database operations:

- **Database Operations** (`database.integration.test.ts`)
  - Connectivity
  - CRUD operations
  - Batch operations
  - Transactions and rollbacks
  - Foreign key constraints
  - Query performance

## Test Utilities

### Setup Utilities (`setup.ts`)

Provides common test utilities:

```typescript
import {
  cleanupTestData,
  createTestFilter,
  createTestFilterRun,
  createAuthHeaders,
  testUserId,
  testTeamId,
} from '../setup'
```

**Key Functions:**

- `cleanupTestData()` - Clean up test data from database
- `createTestFilter(overrides)` - Create a test filter
- `createTestFilterRun(filterId, overrides)` - Create a test filter run
- `createAuthHeaders(options)` - Create mock authentication headers
- `testUserId` - Consistent test user ID
- `testTeamId` - Consistent test team ID

### Example Usage

```typescript
import { Effect } from "effect"
import { describe, expect, it, beforeEach } from "vitest"
import { AppLayer } from "../../../lib/layers"
import { FilterDataService } from "../../../src/services/FilterDataService"
import { cleanupTestData, createTestFilter, testUserId } from "../setup"

describe("My Integration Test", () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  it("should do something", async () => {
    const testFilter = await createTestFilter({
      name: "My Filter",
      ownerId: testUserId,
    })

    const program = Effect.gen(function* () {
      const service = yield* FilterDataService
      const result = yield* service.getFilterById(testFilter.id)
      
      expect(result).toBeDefined()
      return result
    }).pipe(Effect.provide(AppLayer))

    await Effect.runPromise(program)
  })
})
```

## Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
beforeEach(async () => {
  await cleanupTestData()
})
```

### 2. Effect Pattern

Use Effect.gen for async operations:

```typescript
const program = Effect.gen(function* () {
  const service = yield* MyService
  const result = yield* service.doSomething()
  return result
}).pipe(Effect.provide(AppLayer))

await Effect.runPromise(program)
```

### 3. Error Handling

Test both success and failure cases:

```typescript
// Success case
const result = yield* service.operation()
expect(result).toBeDefined()

// Error case
const errorResult = yield* Effect.either(service.operation())
expect(errorResult._tag).toBe("Left")
```

### 4. Test Data Cleanup

Always clean up test data:

```typescript
afterEach(async () => {
  await cleanupTestData()
})
```

## Configuration

### Vitest Config

Integration tests use the same Vitest configuration as unit tests but may require:

- Longer timeouts for external API calls
- Environment variables for credentials
- Database connection setup

### Environment Variables

Required:
- `DATABASE_URL` - Test database connection

Optional (for external service tests):
- `HUGGINGFACE_API_KEY`
- `OPENROUTER_API_KEY`
- `ARTIFICIAL_ANALYSIS_API_KEY`

## Performance Considerations

### Test Execution Time

- Database tests: ~100-500ms per test
- API tests: ~200-1000ms per test
- External service tests: ~1-5s per test (network dependent)

### Optimization Tips

1. **Use transactions** for test data setup when possible
2. **Batch operations** instead of individual inserts
3. **Mock external services** for faster unit tests
4. **Run database tests in parallel** when safe

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Verify database is running
pg_isready -h localhost -p 5432

# Check connection string
echo $DATABASE_URL
```

**External API Timeouts**
- Increase timeout in test configuration
- Check API credentials
- Verify network connectivity

**Test Data Conflicts**
- Ensure `cleanupTestData()` is called
- Use unique IDs for test data
- Check for transaction rollbacks

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    HUGGINGFACE_API_KEY: ${{ secrets.HUGGINGFACE_API_KEY }}
    # Add other API keys as needed
```

## Contributing

When adding new integration tests:

1. Follow the existing test structure
2. Use setup utilities for consistency
3. Add cleanup in `beforeEach`/`afterEach`
4. Document complex test scenarios
5. Update this README if adding new test categories

## Related Documentation

- [API Documentation](../../docs/API.md)
- [Database Setup](../../docs/DATABASE_SETUP.md)
- [Service Architecture](../../lib/services/README.md)
