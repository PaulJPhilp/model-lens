# ModelLens Test Suite

This directory contains a comprehensive test suite for the ModelLens application, covering all major features and functionality.

## Test Structure

```
tests/
├── api/                    # API route tests
│   ├── models.test.ts     # Models API endpoint tests
│   ├── chat.test.ts       # Chat API endpoint tests
│   └── filters-evaluation.test.ts # Filter evaluation API tests
├── components/             # Component tests
│   ├── ModelTable.test.tsx # Model table component tests
│   ├── FilterEditor.test.tsx # Filter editor component tests
│   └── FilterList.test.tsx # Filter list component tests
├── services/               # Service layer tests
│   ├── FilterServiceLive.test.ts # Filter service implementation tests
│   └── ModelServiceLive.test.ts # Model service implementation tests
├── e2e/                    # End-to-end workflow tests
│   ├── filter-workflow.test.ts # Complete filter creation/application workflow
│   ├── model-exploration.test.ts # Model discovery and filtering workflow
│   └── chat-integration.test.ts # Chat functionality integration tests
└── setup/                  # Test setup and utilities
    ├── test-setup.ts      # Global test configuration
    ├── test-utils.tsx     # Testing utilities and helpers
    └── mocks.ts           # Mock data and responses
```

## Test Categories

### 1. API Route Tests (`/api`)

Tests for all API endpoints:

- **Models API** (`/api/models`)
  - External API integration
  - Data transformation
  - Error handling
  - Edge cases

- **Chat API** (`/api/chat`)
  - Request validation
  - Streaming responses
  - Authentication
  - Error handling

- **Filters API** (`/api/filters/*`)
  - CRUD operations
  - Filter evaluation
  - Authorization
  - Validation

### 2. Component Tests (`/components`)

Tests for React components:

- **ModelTable**
  - Data loading and display
  - Filtering and searching
  - Sorting functionality
  - User interactions

- **FilterEditor**
  - Form validation
  - Rule creation/editing
  - Submit handling
  - Error states

- **FilterList**
  - Filter management
  - CRUD operations
  - Evaluation results
  - Pagination

### 3. Service Layer Tests (`/services`)

Tests for business logic services:

- **FilterServiceLive**
  - Filter application logic
  - Data validation
  - Search functionality
  - Edge cases

- **ModelServiceLive**
  - External API integration
  - Data transformation
  - Error handling
  - Retry logic

### 4. End-to-End Tests (`/e2e`)

Complete workflow tests:

- **Filter Workflow**
  - Create filter → Apply filter → View results
  - Edit filter → Update → Verify changes
  - Delete filter → Confirm removal
  - Complex multi-rule filters

- **Model Exploration**
  - Load models → Search → Filter → Sort
  - Multiple filter combinations
  - Clear filters → Reset state
  - Error handling

- **Chat Integration**
  - Send message → Receive response
  - Streaming responses
  - Conversation history
  - Citations and metadata

## Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test Categories
```bash
# API tests only
bun test tests/api/

# Component tests only
bun test tests/components/

# Service tests only
bun test tests/services/

# E2E tests only
bun test tests/e2e/
```

### Run with Coverage
```bash
bun test --coverage
```

### Run in Watch Mode
```bash
bun test --watch
```

### Run Specific Test File
```bash
bun test tests/api/models.test.ts
```

## Test Configuration

### Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Test Environment
- **Environment**: jsdom (for React component testing)
- **Timeout**: 10 seconds per test
- **Setup**: Automatic setup via `test-setup.ts`

## Mock Data

### External API Mocks
Located in `tests/setup/mocks.ts`:
- Models API responses
- Error scenarios
- Network failures

### Database Mocks
- Filter CRUD operations
- Evaluation results
- User authentication

### Component Mocks
- Router navigation
- Authentication state
- External dependencies

## Test Utilities

### Custom Render Function
```typescript
import { render } from '@/tests/setup/test-utils'

// Automatically wraps components with providers
render(<MyComponent />)
```

### Mock Factories
```typescript
import { createMockModel, createMockFilter } from '@/tests/setup/test-utils'

const model = createMockModel({ name: 'Custom Model' })
const filter = createMockFilter({ visibility: 'public' })
```

### API Mock Helpers
```typescript
import { mockFetchSuccess, mockFetchError } from '@/tests/setup/test-utils'

mockFetchSuccess({ models: [] })
mockFetchError('API Error', 500)
```

## Writing New Tests

### 1. Component Tests
```typescript
import { render, screen, fireEvent } from '@/tests/setup/test-utils'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

### 2. API Tests
```typescript
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/my-endpoint/route'

describe('GET /api/my-endpoint', () => {
  it('should return expected data', async () => {
    const response = await GET()
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('expectedField')
  })
})
```

### 3. Service Tests
```typescript
import { Effect } from 'effect'
import { MyService } from '@/lib/services/MyService'

describe('MyService', () => {
  it('should process data correctly', async () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService
      return yield* service.processData(testData)
    })
    
    const result = await Effect.runPromise(program)
    expect(result).toBeDefined()
  })
})
```

## Best Practices

### 1. Test Structure
- Use `describe` blocks to group related tests
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

### 2. Mocking
- Mock external dependencies
- Use factory functions for test data
- Reset mocks between tests

### 3. Assertions
- Use specific assertions
- Test both success and error cases
- Verify side effects

### 4. Async Testing
- Use `waitFor` for async operations
- Handle loading states
- Test timeout scenarios

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in vitest config
   - Check for infinite loops
   - Verify async operations complete

2. **Component not rendering**
   - Check for missing providers
   - Verify import paths
   - Check for TypeScript errors

3. **API tests failing**
   - Verify mock setup
   - Check request/response format
   - Ensure proper authentication headers

4. **Coverage not meeting thresholds**
   - Add tests for uncovered code paths
   - Check exclusion patterns
   - Verify test execution

### Debug Mode
```bash
# Run tests with debug output
bun test --reporter=verbose

# Run single test with debug
bun test --reporter=verbose tests/api/models.test.ts
```

## Continuous Integration

Tests are automatically run in CI/CD pipeline with:
- All test suites
- Coverage reporting
- Threshold enforcement
- Parallel execution

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain coverage thresholds
4. Update documentation
5. Add integration tests for complex workflows
