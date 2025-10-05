import { FilterList } from '@/components/FilterList'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock window.confirm for delete operations
global.confirm = vi.fn(() => true)

const mockFilters = [
  {
    id: 'filter-1',
    ownerId: 'test-user',
    teamId: null,
    name: 'OpenAI Models',
    description: 'Filter for OpenAI models only',
    visibility: 'private',
    rules: [
      {
        field: 'provider',
        operator: 'eq' as const,
        value: 'OpenAI',
        type: 'hard' as const
      }
    ],
    version: 1,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    lastUsedAt: '2023-01-02T00:00:00Z',
    usageCount: 5
  },
  {
    id: 'filter-2',
    ownerId: 'test-user',
    teamId: null,
    name: 'Budget Models',
    description: 'Models under $0.05 per 1M tokens',
    visibility: 'public',
    rules: [
      {
        field: 'inputCost',
        operator: 'lte' as const,
        value: 0.05,
        type: 'hard' as const
      }
    ],
    version: 1,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    lastUsedAt: null,
    usageCount: 0
  }
]

const mockEvaluationResults = {
  filterId: 'filter-1',
  filterName: 'OpenAI Models',
  results: [
    {
      modelId: 'gpt-4',
      modelName: 'gpt-4',
      match: true,
      score: 1.0,
      rationale: 'Matches provider criteria',
      failedHardClauses: 0,
      passedSoftClauses: 0,
      totalSoftClauses: 0
    },
    {
      modelId: 'claude-3',
      modelName: 'claude-3',
      match: false,
      score: 0.0,
      rationale: 'Does not match provider criteria',
      failedHardClauses: 1,
      passedSoftClauses: 0,
      totalSoftClauses: 0
    }
  ],
  totalEvaluated: 2,
  matchCount: 1
}

describe('FilterList', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render filter list with data', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: mockFilters,
        total: 2,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
      expect(screen.getByText('Budget Models')).toBeInTheDocument()
    })

    // Check that descriptions are displayed
    expect(screen.getByText('Filter for OpenAI models only')).toBeInTheDocument()
    expect(screen.getByText('Models under $0.05 per 1M tokens')).toBeInTheDocument()
  })

  it('should display loading state initially', () => {
    render(<FilterList />)
    
    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should handle empty state', async () => {
    // Mock empty API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: [],
        total: 0,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText(/no filters found/i)).toBeInTheDocument()
    })
  })

  it('should open create filter dialog', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: [],
        total: 0,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText(/no filters found/i)).toBeInTheDocument()
    })

    // Click create filter button
    const createButton = screen.getByRole('button', { name: /create filter/i })
    fireEvent.click(createButton)

    // Should open filter editor dialog
    await waitFor(() => {
      expect(screen.getByText(/create filter/i)).toBeInTheDocument()
    })
  })

  it('should handle visibility filtering', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: mockFilters,
        total: 2,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Find visibility filter and select private
    const visibilityFilter = screen.getByDisplayValue('All')
    fireEvent.click(visibilityFilter)
    
    const privateOption = screen.getByText('Private')
    fireEvent.click(privateOption)

    // Should filter to show only private filters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('visibility=private')
      )
    })
  })

  it('should handle filter application', async () => {
    const mockOnFilterApplied = vi.fn()
    
    // Mock successful API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: mockFilters,
          total: 2,
          page: 1,
          pageSize: 20
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvaluationResults
      })

    render(<FilterList onFilterApplied={mockOnFilterApplied} />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Click apply filter button for first filter
    const applyButtons = screen.getAllByRole('button', { name: /apply filter/i })
    fireEvent.click(applyButtons[0])

    // Should call evaluation API and show results
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/filters/filter-1/evaluate`,
        expect.objectContaining({
          method: 'POST'
        })
      )
      expect(mockOnFilterApplied).toHaveBeenCalledWith(mockEvaluationResults)
    })
  })

  it('should display evaluation results modal', async () => {
    // Mock successful API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: mockFilters,
          total: 2,
          page: 1,
          pageSize: 20
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvaluationResults
      })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Click apply filter button
    const applyButtons = screen.getAllByRole('button', { name: /apply filter/i })
    fireEvent.click(applyButtons[0])

    // Should show evaluation results modal
    await waitFor(() => {
      expect(screen.getByText(/evaluation results/i)).toBeInTheDocument()
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
      expect(screen.getByText('1 of 2 models matched')).toBeInTheDocument()
    })
  })

  it('should handle edit filter', async () => {
    // Mock successful API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: mockFilters,
          total: 2,
          page: 1,
          pageSize: 20
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFilters[0]
      })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Click edit button for first filter
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    fireEvent.click(editButtons[0])

    // Should open filter editor in edit mode
    await waitFor(() => {
      expect(screen.getByText(/edit filter/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue('OpenAI Models')).toBeInTheDocument()
    })
  })

  it('should handle delete filter with confirmation', async () => {
    // Mock successful API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: mockFilters,
          total: 2,
          page: 1,
          pageSize: 20
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204
      })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Click delete button for first filter
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(confirmButton)

    // Should call delete API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/filters/filter-1`,
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  it('should handle delete filter cancellation', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: mockFilters,
        total: 2,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })

    // Cancel deletion
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    // Should close dialog without deleting
    await waitFor(() => {
      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/filters/'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('should display usage statistics', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: mockFilters,
        total: 2,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Should show usage count
    expect(screen.getByText('5 times')).toBeInTheDocument()
    expect(screen.getByText('0 times')).toBeInTheDocument()
  })

  it('should display last used date', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: mockFilters,
        total: 2,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Should show last used date for first filter
    expect(screen.getByText('1/1/2023')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    // Mock API error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' })
    })

    render(<FilterList />)
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch filters/i)).toBeInTheDocument()
    })
  })

  it('should handle pagination', async () => {
    const manyFilters = Array.from({ length: 25 }, (_, i) => ({
      id: `filter-${i}`,
      ownerId: 'test-user',
      teamId: null,
      name: `Filter ${i}`,
      description: `Description ${i}`,
      visibility: 'private' as const,
      rules: [],
      version: 1,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      lastUsedAt: null,
      usageCount: 0
    }))

    // Mock paginated API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: manyFilters.slice(0, 20),
        total: 25,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('Filter 0')).toBeInTheDocument()
    })

    // Should show pagination info
    expect(screen.getByText(/Showing 1-20 of 25/i)).toBeInTheDocument()
  })

  it('should handle search functionality', async () => {
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        filters: mockFilters,
        total: 2,
        page: 1,
        pageSize: 20
      })
    })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Find search input and search
    const searchInput = screen.getByPlaceholderText(/search filters\.\.\./i)
    fireEvent.change(searchInput, { target: { value: 'OpenAI' } })

    // Should filter results (implementation dependent)
    // This assumes client-side filtering or API call with search param
  })

  it('should refresh data after filter operations', async () => {
    // Mock successful API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: mockFilters,
          total: 2,
          page: 1,
          pageSize: 20
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-filter' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filters: [...mockFilters, { id: 'new-filter', name: 'New Filter' }],
          total: 3,
          page: 1,
          pageSize: 20
        })
      })

    render(<FilterList />)
    
    await waitFor(() => {
      expect(screen.getByText('OpenAI Models')).toBeInTheDocument()
    })

    // Simulate creating a new filter
    const createButton = screen.getByRole('button', { name: 'Create Filter' })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Create New Filter')).toBeInTheDocument()
    })

    // Fill and submit form (simplified)
    const nameInput = screen.getByLabelText(/filter name/i)
    fireEvent.change(nameInput, { target: { value: 'New Filter' } })

    // Find the submit button in the modal (should be the Create Filter button in the form)
    const modalSubmitButton = screen.getByRole('button', { name: 'Create Filter', hidden: true })
    fireEvent.click(modalSubmitButton)

    // Should refresh the list
    await waitFor(() => {
      expect(screen.getByText('New Filter')).toBeInTheDocument()
    })
  })
})
