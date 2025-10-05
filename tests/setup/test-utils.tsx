import { RenderOptions, fireEvent, render } from '@testing-library/react'
import { ReactElement } from 'react'
import { vi } from 'vitest'

// Mock the AppLayer for testing
const TestAppLayer = {
  // Provide mock implementations for testing
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add any custom options here
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return render(ui, {
    wrapper: ({ children }) => {
      // Wrap with any providers needed for testing
      return <>{children}</>
    },
    ...options,
  })
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test data factories
export const createMockModel = (overrides: Partial<any> = {}) => ({
  id: 'test-model-id',
  name: 'test-model',
  provider: 'TestProvider',
  contextWindow: 4096,
  maxOutputTokens: 2048,
  inputCost: 0.01,
  outputCost: 0.02,
  cacheReadCost: 0.005,
  cacheWriteCost: 0.01,
  modalities: ['text'],
  capabilities: ['chat'],
  releaseDate: '2023-01-01',
  lastUpdated: '2023-01-01',
  knowledge: '2023-01',
  openWeights: false,
  supportsTemperature: true,
  supportsAttachments: false,
  new: false,
  ...overrides,
})

export const createMockFilter = (overrides: Partial<any> = {}) => ({
  id: 'test-filter-id',
  ownerId: 'test-user',
  teamId: null,
  name: 'Test Filter',
  description: 'Test filter description',
  visibility: 'private',
  rules: [
    {
      field: 'provider',
      operator: 'eq',
      value: 'OpenAI',
      type: 'hard',
    },
  ],
  version: 1,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  lastUsedAt: null,
  usageCount: 0,
  ...overrides,
})

export const createMockRule = (overrides: Partial<any> = {}) => ({
  field: 'provider',
  operator: 'eq',
  value: 'OpenAI',
  type: 'hard',
  ...overrides,
})

export const createMockEvaluationResult = (overrides: Partial<any> = {}) => ({
  modelId: 'test-model-id',
  modelName: 'test-model',
  match: true,
  score: 1.0,
  rationale: 'Matches all criteria',
  failedHardClauses: 0,
  passedSoftClauses: 0,
  totalSoftClauses: 0,
  ...overrides,
})

// Mock API response helpers
export const mockApiResponse = (data: any, options: ResponseInit = {}) => ({
  ok: true,
  status: 200,
  json: async () => data,
  text: async () => JSON.stringify(data),
  ...options,
})

export const mockApiError = (message: string, status: number = 500) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message }),
})

// Mock fetch helpers
export const mockFetchSuccess = (data: any) => {
  global.fetch = vi.fn().mockResolvedValue(mockApiResponse(data))
}

export const mockFetchError = (message: string, status: number = 500) => {
  global.fetch = vi.fn().mockResolvedValue(mockApiError(message, status))
}

export const mockFetchNetworkError = () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Test user interactions
export const userInteractions = {
  type: (element: HTMLElement, text: string) => {
    fireEvent.change(element, { target: { value: text } })
  },
  click: (element: HTMLElement) => {
    fireEvent.click(element)
  },
  submit: (form: HTMLFormElement) => {
    fireEvent.submit(form)
  },
}

// Mock authentication
export const mockAuth = {
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  team: {
    id: 'test-team-456',
    name: 'Test Team',
  },
}

// Mock database operations
export const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

// Mock Effect operations
export const mockEffect = {
  runPromise: vi.fn(),
  provide: vi.fn(),
  gen: vi.fn(),
}
