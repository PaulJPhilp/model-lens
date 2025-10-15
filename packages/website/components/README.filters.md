# Filter Components

React components for creating, managing, and applying saved filters in ModelLens.

## Components

### FilterEditor

A comprehensive form component for creating or editing saved filters.

**Location:** `components/FilterEditor.tsx`

**Features:**
- ✅ Create new filters or edit existing ones
- ✅ Filter metadata (name, description, visibility)
- ✅ Team ID support for team-scoped filters
- ✅ Dynamic rule builder with add/remove
- ✅ Rule configuration (field, operator, value, type, weight)
- ✅ Client-side validation
- ✅ Error handling with user feedback
- ✅ TypeScript typed throughout

**Props:**
```typescript
interface FilterEditorProps {
  filter?: SavedFilter;      // Undefined = create mode, provided = edit mode
  onSave?: (filter: SavedFilter) => void;  // Called after successful save
  onCancel?: () => void;     // Called when cancel is clicked
}
```

**Usage:**

```tsx
// Create mode
<FilterEditor
  onSave={(filter) => {
    console.log('Created:', filter);
  }}
/>

// Edit mode
<FilterEditor
  filter={existingFilter}
  onSave={(filter) => {
    console.log('Updated:', filter);
  }}
  onCancel={() => {
    console.log('Cancelled');
  }}
/>
```

**Rule Types:**
- **Hard clauses:** Must match for model to pass filter (required)
- **Soft clauses:** Contribute to weighted score (0-1 scale)

**Available Fields:**
- `provider` - Model provider (e.g., "openai", "anthropic")
- `inputCost` - Input token cost per million
- `outputCost` - Output token cost per million
- `cacheReadCost` - Cache read cost per million
- `cacheWriteCost` - Cache write cost per million
- `contextWindow` - Maximum context window size
- `capabilities` - Array of capabilities (e.g., ["reasoning", "vision"])
- `modalities` - Array of modalities (e.g., ["text", "image"])
- `releaseDate` - ISO date string
- `openWeights` - Boolean for open source models
- `supportsTemperature` - Boolean for temperature support
- `supportsAttachments` - Boolean for attachment support

**Available Operators:**
- `eq` - Equal to
- `ne` - Not equal to
- `gt` - Greater than
- `gte` - Greater than or equal to
- `lt` - Less than
- `lte` - Less than or equal to
- `in` - In array (for array fields)
- `contains` - Array contains value

**Visibility Options:**
- `private` - Only visible to owner
- `team` - Visible to team members (requires teamId)
- `public` - Visible to everyone

---

### FilterList

A complete filter management interface with list, edit, delete, and apply functionality.

**Location:** `components/FilterList.tsx`

**Features:**
- ✅ List all accessible filters
- ✅ Filter by visibility (all, private, team, public)
- ✅ Pagination support
- ✅ Create new filters (opens FilterEditor modal)
- ✅ Edit existing filters (opens FilterEditor modal)
- ✅ Delete filters with confirmation
- ✅ Apply/evaluate filters against model registry
- ✅ View evaluation results in modal
- ✅ Real-time usage stats (usage count, last used date)
- ✅ Rule preview with expand/collapse
- ✅ Loading and error states
- ✅ Empty state with CTA

**Props:**
```typescript
interface FilterListProps {
  onFilterApplied?: (results: EvaluateFilterResponse) => void;
}
```

**Usage:**

```tsx
<FilterList
  onFilterApplied={(results) => {
    console.log(`Found ${results.matchCount} matches`);
    console.log('Matching models:', results.results.filter(r => r.match));
  }}
/>
```

**UI Features:**

1. **Filter Cards** - Each filter shows:
   - Name and description
   - Visibility badge (color-coded)
   - Rule count
   - Usage statistics
   - Expandable rules preview
   - Action buttons (Apply, Edit, Delete)

2. **Modals:**
   - **Editor Modal:** Full-screen FilterEditor for create/edit
   - **Results Modal:** Shows evaluation results with:
     - Match count summary
     - List of matching models
     - Individual model scores
     - Pass/fail details for hard/soft clauses
     - Rationale for each model

3. **Controls:**
   - Visibility filter dropdown
   - Create filter button
   - Pagination controls

**Evaluation Results:**
```typescript
interface EvaluateFilterResponse {
  filterId: string;
  filterName: string;
  results: ModelEvaluationResult[];
  totalEvaluated: number;
  matchCount: number;
}

interface ModelEvaluationResult {
  modelId: string;
  modelName: string;
  match: boolean;              // Did model pass all hard clauses?
  score: number;               // Soft clause score (0-1)
  rationale: string;           // Explanation
  failedHardClauses: number;
  passedSoftClauses: number;
  totalSoftClauses: number;
}
```

---

## Page Implementation

**Location:** `app/filters/page.tsx`

A complete page demonstrating FilterList component.

**Access:** Navigate to `/filters` in the app

**Features:**
- Full-page FilterList component
- Responsive container layout
- Console logging for filter application events

**Usage:**
```tsx
import { FilterList } from '@/components/FilterList';

export default function FiltersPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <FilterList
        onFilterApplied={(results) => {
          // Handle filter application
          console.log('Filter applied:', results);
        }}
      />
    </div>
  );
}
```

---

## API Integration

The components integrate with the following API endpoints:

### GET /api/filters
List filters accessible to user

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)
- `visibility` - Filter by visibility: 'all', 'private', 'team', 'public'

**Response:**
```typescript
{
  filters: SavedFilter[];
  total: number;
  page: number;
  pageSize: number;
}
```

### POST /api/filters
Create a new filter

**Request Body:**
```typescript
{
  name: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
  teamId?: string;
  rules: RuleClause[];
}
```

**Response:** `SavedFilter` object

### GET /api/filters/[id]
Get a specific filter

**Response:** `SavedFilter` object

### PUT /api/filters/[id]
Update a filter (owner only)

**Request Body:** Partial `SavedFilter` (any field can be updated)

**Response:** Updated `SavedFilter` object

### DELETE /api/filters/[id]
Delete a filter (owner only)

**Response:**
```typescript
{ success: boolean }
```

### POST /api/filters/[id]/evaluate
Apply filter and get matching models

**Request Body:**
```typescript
{
  modelIds?: string[];  // Optional: specific models to evaluate
  limit?: number;       // Max results (default: 50, max: 500)
}
```

**Response:** `EvaluateFilterResponse` object

---

## Authentication

Components use the API's authentication system via headers:

**Development Mode:**
- Uses `x-user-id` header for testing
- Uses `x-team-id` header for team membership
- Falls back to default dev user if headers not present

**Production:**
Replace the auth implementation in `app/api/filters/auth.ts` with your auth provider (NextAuth, Clerk, Auth0, etc.)

---

## Styling

Components use **shadcn/ui** components and Tailwind CSS:

**Used Components:**
- `Button` - Action buttons
- `Input` - Text inputs
- `Textarea` - Multi-line text
- `Select` - Dropdowns
- `Dialog` - Modals

**Customization:**
All components use semantic Tailwind classes and can be customized via:
1. Tailwind config (`tailwind.config.ts`)
2. CSS variables (in `app/globals.css`)
3. Component class overrides

**Color Coding:**
- **Private filters:** Blue badge
- **Team filters:** Purple badge
- **Public filters:** Green badge
- **Hard clauses:** Red text
- **Soft clauses:** Blue text

---

## Example Workflows

### Create a Filter

1. User clicks "Create Filter" button
2. FilterEditor modal opens in create mode
3. User fills in:
   - Name: "Budget AI Models"
   - Description: "Models under $5/M tokens"
   - Visibility: Private
   - Rules:
     - `inputCost lte 5` (hard)
     - `capabilities contains reasoning` (soft, weight 0.8)
4. User clicks "Create Filter"
5. API creates filter and returns it
6. Modal closes, filter appears in list

### Apply a Filter

1. User clicks "Apply Filter" on a saved filter
2. Component calls `/api/filters/[id]/evaluate`
3. Backend evaluates all models against filter rules
4. Results modal opens showing:
   - 15 matching models out of 50 evaluated
   - Each match with score, rationale, and details
5. User can browse results or close modal

### Edit a Filter

1. User clicks "Edit" on existing filter
2. FilterEditor modal opens in edit mode
3. Form pre-populated with current values
4. User modifies rules or metadata
5. Clicks "Update Filter"
6. API updates filter
7. Modal closes, updated filter shows in list

---

## TypeScript Types

All components are fully typed. Key interfaces:

```typescript
// Rule clause for filtering
interface RuleClause {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
  type: 'hard' | 'soft';
  weight?: number;  // For soft clauses only (0-1)
}

// Saved filter (full object)
interface SavedFilter {
  id: string;
  ownerId: string;
  teamId: string | null;
  name: string;
  description: string | null;
  visibility: string;
  rules: RuleClause[];
  version: number;
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
  lastUsedAt: string | null;  // ISO 8601
  usageCount: number;
}
```

---

## Error Handling

Components handle errors gracefully:

**FilterEditor:**
- Client-side validation before submission
- Server errors displayed in error banner
- Form remains populated on error

**FilterList:**
- Network errors shown in error banner
- Failed operations show alerts
- List auto-refreshes after successful operations

**Common Errors:**
- `400 Bad Request` - Invalid input (shown to user)
- `401 Unauthorized` - Not authenticated (redirects to login)
- `403 Forbidden` - No permission (shown to user)
- `404 Not Found` - Filter doesn't exist
- `500 Internal Server Error` - Server issue

---

## Testing

### Manual Testing

1. **Create Filter:**
   ```bash
   # Navigate to /filters
   # Click "Create Filter"
   # Fill form and submit
   # Verify filter appears in list
   ```

2. **Apply Filter:**
   ```bash
   # Click "Apply Filter" on any filter
   # Verify results modal shows matching models
   # Check console for evaluation results
   ```

3. **Edit Filter:**
   ```bash
   # Click "Edit" on filter
   # Modify name or rules
   # Save and verify changes appear
   ```

4. **Delete Filter:**
   ```bash
   # Click "Delete" on filter
   # Confirm deletion
   # Verify filter removed from list
   ```

### Automated Tests

See `app/api/filters/*.test.ts` for API route tests (45 tests).

Component tests can be added using Vitest + React Testing Library.

---

## Navigation

The Navbar has been updated with links:
- **Models** (`/`) - Model table view
- **Filters** (`/filters`) - Saved filters management

---

## Troubleshooting

### "Failed to fetch filters"

**Cause:** API endpoint not responding or DATABASE_URL not set

**Fix:**
1. Check dev server is running
2. Verify DATABASE_URL in `.env`
3. Run migrations: `bun run src/scripts/verify-db.ts`

### "teamId required for team visibility"

**Cause:** Trying to create team filter without teamId

**Fix:** Enter a team ID or change visibility to private/public

### Modal not closing after save

**Cause:** `onSave` callback not provided or modal state not updated

**Fix:** Ensure FilterList has proper state management for modal

### Rules not saving

**Cause:** Validation error or empty value

**Fix:** Check that all rules have non-empty values and at least one rule exists

---

## Future Enhancements

Potential improvements:

1. **Filter Templates** - Pre-built filters for common use cases
2. **Filter Sharing** - Share filter via link
3. **Filter Import/Export** - JSON export for backup/sharing
4. **Advanced Rule Builder** - AND/OR logic groups
5. **Filter Analytics** - Track which filters are most used
6. **Bulk Operations** - Apply multiple filters at once
7. **Filter Comparison** - Compare results from different filters
8. **Saved Searches** - Quick access to frequently used filters
9. **Filter History** - Track changes to filters over time
10. **API Rate Limiting** - Prevent abuse of evaluation endpoint

---

## Related Documentation

- [API Routes Documentation](../app/api/filters/README.test.md)
- [Database Setup](../docs/DATABASE_SETUP.md)
- [Filter Evaluator Tests](../tests/filter-evaluator.test.ts)
- [API Routes Tests](../app/api/filters/route.test.ts)
