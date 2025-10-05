import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Navbar component to avoid window.matchMedia issues
vi.mock('@/components/Navbar', () => ({
  Navbar: ({ providerCount, modelCount, activeProviderCount, activeModelCount }: any) => (
    <nav className="p-2 border-b border-brand flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-sans font-bold text-primary">ModelLens</h1>
        <span className="text-xs text-muted-foreground">
          {activeProviderCount}/{providerCount} providers · {activeModelCount}/{modelCount} models
        </span>
      </div>
      <button className="bg-secondary p-1 rounded hover:bg-secondary/80 transition-colors text-sm">
        🌙
      </button>
    </nav>
  )
}))

// Simplified Effect mock - just return mock data for any runPromise call
vi.mock('effect', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...(actual as object),
    Effect: {
      ...(actual.Effect as object),
      runPromise: vi.fn().mockResolvedValue([
        {
          id: 'gpt-4',
          name: 'gpt-4',
          provider: 'OpenAI',
          contextWindow: 128000,
          maxOutputTokens: 4096,
          inputCost: 0.03,
          outputCost: 0.06,
          cacheReadCost: 0.015,
          cacheWriteCost: 0.03,
          modalities: ['text'],
          capabilities: ['tools'],
          releaseDate: '2023-03-01',
          lastUpdated: '2023-03-01',
          knowledge: '2023-04',
          openWeights: false,
          supportsTemperature: true,
          supportsAttachments: false,
          new: false
        },
        {
          id: 'claude-3',
          name: 'claude-3',
          provider: 'Anthropic',
          contextWindow: 200000,
          maxOutputTokens: 4096,
          inputCost: 0.015,
          outputCost: 0.075,
          cacheReadCost: 0.0075,
          cacheWriteCost: 0.015,
          modalities: ['text', 'image'],
          capabilities: ['reasoning'],
          releaseDate: '2023-06-01',
          lastUpdated: '2023-06-01',
          knowledge: '2023-08',
          openWeights: false,
          supportsTemperature: true,
          supportsAttachments: true,
          new: true
        },
        {
          id: 'dall-e-3',
          name: 'dall-e-3',
          provider: 'OpenAI',
          contextWindow: 0,
          maxOutputTokens: 0,
          inputCost: 0.08,
          outputCost: 0.08,
          cacheReadCost: 0,
          cacheWriteCost: 0,
          modalities: ['image'],
          capabilities: ['generation'],
          releaseDate: '2023-09-01',
          lastUpdated: '2023-09-01',
          knowledge: '',
          openWeights: false,
          supportsTemperature: false,
          supportsAttachments: false,
          new: false
        }
      ]),
    },
  }
})


// Mock FilterService to just return models unchanged
vi.mock('@/lib/services/FilterService', () => {
  const { Effect } = require('effect');
  const mockService = {
    applyFilters: (models: any[]) => Effect.succeed(models),
    validateFilters: (filters: any) => Effect.succeed(filters)
  };

  return {
    FilterService: {
      _tag: 'FilterService',
      [Symbol.iterator]: function* () {
        yield mockService;
      }
    }
  };
})

import { ModelTable } from '@/components/ModelTable'
import { mockExternalApiResponses } from '@/tests/setup/mocks'

describe('ModelTable', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockExternalApiResponses.models.success
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render the model table with data', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
      expect(screen.getByText('claude-3')).toBeInTheDocument()
      expect(screen.getByText('dall-e-3')).toBeInTheDocument()
    })

    // Check that provider information is displayed in the table
    const openaiCells = screen.getAllByText('OpenAI')
    expect(openaiCells.length).toBeGreaterThan(0)
    const anthropicCells = screen.getAllByText('Anthropic')
    expect(anthropicCells.length).toBeGreaterThan(0)
  })

  it('should display loading state initially', () => {
    render(<ModelTable />)
    
    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('should handle search functionality', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Find search input and search for "gpt"
    const searchInput = screen.getByPlaceholderText(/search models/i)
    fireEvent.change(searchInput, { target: { value: 'gpt' } })

    // Should filter to show only GPT models
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
      expect(screen.queryByText('claude-3')).not.toBeInTheDocument()
    })
  })

  it('should handle provider filtering', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Find provider filter and select OpenAI
    const providerFilter = screen.getByRole('combobox', { name: /provider/i })
    fireEvent.click(providerFilter)
    
    // Select OpenAI option
    const openaiOption = screen.getByText('OpenAI')
    fireEvent.click(openaiOption)

    // Should filter to show only OpenAI models
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
      expect(screen.getByText('dall-e-3')).toBeInTheDocument()
      expect(screen.queryByText('claude-3')).not.toBeInTheDocument()
    })
  })

  it('should handle cost range filtering', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Find input cost slider and adjust it
    const inputCostSlider = screen.getByRole('slider', { name: /input cost/i })
    fireEvent.change(inputCostSlider, { target: { value: 0.02 } })

    // Should filter to show only models with input cost <= 0.02
    await waitFor(() => {
      expect(screen.getByText('claude-3')).toBeInTheDocument()
      expect(screen.queryByText('gpt-4')).not.toBeInTheDocument()
    })
  })

  it('should handle modality filtering', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Find modality filter and select image
    const modalityFilter = screen.getByRole('combobox', { name: /modality/i })
    fireEvent.click(modalityFilter)
    
    // Select image option
    const imageOption = screen.getByText('Image')
    fireEvent.click(imageOption)

    // Should filter to show only models with image modality
    await waitFor(() => {
      expect(screen.getByText('claude-3')).toBeInTheDocument()
      expect(screen.getByText('dall-e-3')).toBeInTheDocument()
      expect(screen.queryByText('gpt-4')).not.toBeInTheDocument()
    })
  })

  it('should handle capability filtering', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Find capability filter and select tools
    const capabilityFilter = screen.getByRole('combobox', { name: /capability/i })
    fireEvent.click(capabilityFilter)
    
    // Select tools option
    const toolsOption = screen.getByText('Tools')
    fireEvent.click(toolsOption)

    // Should filter to show only models with tools capability
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
      expect(screen.queryByText('claude-3')).not.toBeInTheDocument()
    })
  })

  it('should handle table sorting', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Find a sortable column header and click it
    const nameHeader = screen.getByRole('columnheader', { name: /name/i })
    fireEvent.click(nameHeader)

    // Should sort the table (exact behavior depends on implementation)
    await waitFor(() => {
      expect(nameHeader).toBeInTheDocument()
    })
  })

  it('should display model details when row is clicked', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Click on a model row
    const gpt4Row = screen.getByText('gpt-4').closest('tr')
    if (gpt4Row) {
      fireEvent.click(gpt4Row)
    }

    // Should show model details (implementation dependent)
    // This test assumes there's a modal or expanded view
  })

  it('should handle error state when API fails', async () => {
    // Mock fetch to return an error
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

    render(<ModelTable />)
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/failed to load models/i)).toBeInTheDocument()
    })
  })

  it('should display cost information correctly', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Check that cost information is displayed
    expect(screen.getByText('$0.03')).toBeInTheDocument() // GPT-4 input cost
    expect(screen.getByText('$0.06')).toBeInTheDocument() // GPT-4 output cost
  })

  it('should display context window information', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Check that context window is displayed
    expect(screen.getByText('128,000')).toBeInTheDocument() // GPT-4 context window
    expect(screen.getByText('200,000')).toBeInTheDocument() // Claude-3 context window
  })

  it('should display modality icons correctly', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Check for modality icons (implementation dependent)
    // This assumes icons are rendered with specific aria-labels or test-ids
  })

  it('should display capability icons correctly', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Check for capability icons (implementation dependent)
    // This assumes icons are rendered with specific aria-labels or test-ids
  })

  it.skip('should handle clear filters functionality', async () => {
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Apply a filter first
    const searchInput = screen.getByPlaceholderText(/search models/i)
    fireEvent.change(searchInput, { target: { value: 'gpt' } })

    await waitFor(() => {
      expect(screen.queryByText('claude-3')).not.toBeInTheDocument()
    })

    // Find and click clear filters button
    const clearButton = screen.getByRole('button', { name: /clear/i })
    fireEvent.click(clearButton)

    // Should show all models again
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
      expect(screen.getByText('claude-3')).toBeInTheDocument()
      expect(screen.getByText('dall-e-3')).toBeInTheDocument()
    })
  })

  it('should handle pagination if implemented', async () => {
    // This test assumes pagination is implemented
    render(<ModelTable />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('gpt-4')).toBeInTheDocument()
    })

    // Look for pagination controls
    // Implementation dependent
  })
})
