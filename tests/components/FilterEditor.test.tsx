import { FilterEditor } from '@/components/FilterEditor'
import type { RuleClause } from '@/src/db/schema'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fetch for API calls
global.fetch = vi.fn()

const mockRuleClause: RuleClause = {
  field: 'provider',
  operator: 'eq',
  value: 'OpenAI',
  type: 'hard'
}

const mockSoftRuleClause: RuleClause = {
  field: 'inputCost',
  operator: 'lte',
  value: 0.05,
  type: 'soft',
  weight: 0.8
}

describe('FilterEditor', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render create mode by default', () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    expect(screen.getByText(/create filter/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create filter/i })).toBeInTheDocument()
  })

  it('should render edit mode when filter is provided', () => {
    const mockFilter = {
      id: 'test-filter-id',
      ownerId: 'test-user',
      teamId: null,
      name: 'Test Filter',
      description: 'Test Description',
      visibility: 'private' as const,
      rules: [mockRuleClause],
      version: 1,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      lastUsedAt: null,
      usageCount: 0
    }

    render(<FilterEditor filter={mockFilter} onCancel={() => {}} />)
    
    expect(screen.getByText(/edit filter/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Filter')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /update filter/i })).toBeInTheDocument()
  })

  it('should allow adding rules', async () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    // Click add rule button
    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    fireEvent.click(addRuleButton)

    // Should show a new rule form
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(1) // At least one field selector
    })
  })

  it('should allow removing rules', async () => {
    const mockFilter = {
      id: 'test-filter-id',
      ownerId: 'test-user',
      teamId: null,
      name: 'Test Filter',
      description: 'Test Description',
      visibility: 'private' as const,
      rules: [mockRuleClause, mockSoftRuleClause],
      version: 1,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      lastUsedAt: null,
      usageCount: 0
    }

    render(<FilterEditor filter={mockFilter} onCancel={() => {}} />)
    
    // Should show existing rules
    expect(screen.getByDisplayValue('provider')).toBeInTheDocument()
    expect(screen.getByDisplayValue('inputCost')).toBeInTheDocument()

    // Find and click remove rule button for first rule
    const removeButtons = screen.getAllByRole('button', { name: /remove rule/i })
    fireEvent.click(removeButtons[0])

    // Should remove the first rule
    await waitFor(() => {
      expect(screen.queryByDisplayValue('provider')).not.toBeInTheDocument()
      expect(screen.getByDisplayValue('inputCost')).toBeInTheDocument()
    })
  })

  it('should validate required fields', async () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create filter/i })
    fireEvent.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('should handle form submission for create', async () => {
    const mockOnClose = vi.fn()
    
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'new-filter-id' })
    })

    render(<FilterEditor onCancel={mockOnClose} />)
    
    // Fill in the form
    const nameInput = screen.getByLabelText(/filter name/i)
    fireEvent.change(nameInput, { target: { value: 'New Filter' } })

    const descriptionInput = screen.getByLabelText(/description/i)
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } })

    // Add a rule
    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    fireEvent.click(addRuleButton)

    await waitFor(() => {
      const fieldSelect = screen.getByDisplayValue('') // First field selector
      fireEvent.click(fieldSelect)
    })

    // Select field
    const providerOption = screen.getByText('Provider')
    fireEvent.click(providerOption)

    // Set operator
    const operatorSelect = screen.getByDisplayValue('') // Operator selector
    fireEvent.click(operatorSelect)
    const equalsOption = screen.getByText('Equals')
    fireEvent.click(equalsOption)

    // Set value
    const valueInput = screen.getByPlaceholderText(/enter value/i)
    fireEvent.change(valueInput, { target: { value: 'OpenAI' } })

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create filter/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user'
        },
        body: expect.stringContaining('"name":"New Filter"')
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should handle form submission for update', async () => {
    const mockFilter = {
      id: 'test-filter-id',
      ownerId: 'test-user',
      teamId: null,
      name: 'Test Filter',
      description: 'Test Description',
      visibility: 'private' as const,
      rules: [mockRuleClause],
      version: 1,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      lastUsedAt: null,
      usageCount: 0
    }

    const mockOnClose = vi.fn()
    
    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-filter-id' })
    })

    render(<FilterEditor filter={mockFilter} onCancel={mockOnClose} />)
    
    // Update the name
    const nameInput = screen.getByDisplayValue('Test Filter')
    fireEvent.change(nameInput, { target: { value: 'Updated Filter' } })

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update filter/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/filters/test-filter-id', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user'
        },
        body: expect.stringContaining('"name":"Updated Filter"')
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('should handle visibility selection', async () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    // Find visibility selector
    const visibilitySelect = screen.getByDisplayValue('Private')
    fireEvent.click(visibilitySelect)

    // Select team visibility
    const teamOption = screen.getByText('Team')
    fireEvent.click(teamOption)

    // Should show team ID input
    await waitFor(() => {
      expect(screen.getByLabelText(/team id/i)).toBeInTheDocument()
    })
  })

  it('should handle soft rule weight configuration', async () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    // Add a rule
    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    fireEvent.click(addRuleButton)

    await waitFor(() => {
      const typeSelect = screen.getByDisplayValue('') // Type selector
      fireEvent.click(typeSelect)
    })

    // Select soft type
    const softOption = screen.getByText('Soft')
    fireEvent.click(softOption)

    // Should show weight input
    await waitFor(() => {
      expect(screen.getByLabelText(/weight/i)).toBeInTheDocument()
    })

    // Set weight
    const weightInput = screen.getByLabelText(/weight/i)
    fireEvent.change(weightInput, { target: { value: '0.8' } })

    expect(weightInput).toHaveValue(0.8)
  })

  it('should handle different field types and operators', async () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    // Add a rule
    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    fireEvent.click(addRuleButton)

    await waitFor(() => {
      const fieldSelect = screen.getByDisplayValue('')
      fireEvent.click(fieldSelect)
    })

    // Select different field types
    const costField = screen.getByText('Input Cost')
    fireEvent.click(costField)

    // Should show appropriate operator options
    await waitFor(() => {
      const operatorSelect = screen.getByDisplayValue('')
      fireEvent.click(operatorSelect)
    })

    // Should have numeric operators
    expect(screen.getByText('Less than or equal')).toBeInTheDocument()
    expect(screen.getByText('Greater than')).toBeInTheDocument()
  })

  it('should handle cancel action', async () => {
    const mockOnClose = vi.fn()
    
    render(<FilterEditor onCancel={mockOnClose} />)
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    // Mock API error
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid request' })
    })

    render(<FilterEditor onCancel={() => {}} />)
    
    // Fill in required fields
    const nameInput = screen.getByLabelText(/filter name/i)
    fireEvent.change(nameInput, { target: { value: 'Test Filter' } })

    // Add a rule
    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    fireEvent.click(addRuleButton)

    await waitFor(() => {
      const fieldSelect = screen.getByDisplayValue('')
      fireEvent.click(fieldSelect)
    })

    const providerOption = screen.getByText('Provider')
    fireEvent.click(providerOption)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create filter/i })
    fireEvent.click(submitButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error creating filter/i)).toBeInTheDocument()
    })
  })

  it('should handle loading state during submission', async () => {
    // Mock slow API response
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ id: 'new-filter-id' })
      }), 100))
    )

    render(<FilterEditor onCancel={() => {}} />)
    
    // Fill in required fields
    const nameInput = screen.getByLabelText(/filter name/i)
    fireEvent.change(nameInput, { target: { value: 'Test Filter' } })

    // Add a rule
    const addRuleButton = screen.getByRole('button', { name: /add rule/i })
    fireEvent.click(addRuleButton)

    await waitFor(() => {
      const fieldSelect = screen.getByDisplayValue('')
      fireEvent.click(fieldSelect)
    })

    const providerOption = screen.getByText('Provider')
    fireEvent.click(providerOption)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create filter/i })
    fireEvent.click(submitButton)

    // Should show loading state
    expect(screen.getByText(/creating/i)).toBeInTheDocument()
    
    // Button should be disabled
    expect(submitButton).toBeDisabled()
  })

  it('should validate rule completeness', async () => {
    render(<FilterEditor onCancel={() => {}} />)
    
    // Fill in name but don't add any rules
    const nameInput = screen.getByLabelText(/filter name/i)
    fireEvent.change(nameInput, { target: { value: 'Test Filter' } })

    // Try to submit
    const submitButton = screen.getByRole('button', { name: /create filter/i })
    fireEvent.click(submitButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/at least one rule is required/i)).toBeInTheDocument()
    })
  })
})
