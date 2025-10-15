# Saved Filters API Routes

Complete API documentation for the saved filters feature.

## Base URL

All endpoints are under `/api/filters`

## Authentication

All endpoints require authentication. See [Authentication](#authentication-1)
section for implementation details.

**Development Mode:**
- Requests use a default dev user ID when `NODE_ENV=development`
- Custom user can be set via `x-user-id` and `x-team-id` headers

**Production Mode:**
- Implement actual auth in `app/api/filters/auth.ts`
- See examples for NextAuth, JWT, etc.

---

## Endpoints

### 1. List Filters

**GET** `/api/filters`

Get all filters accessible to the current user.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page (max: 100) |
| visibility | string | 'all' | Filter by visibility: 'all', 'private', 'team', 'public' |

#### Response

```typescript
{
  filters: FilterResponse[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### Example

```bash
curl http://localhost:3000/api/filters?page=1&pageSize=20&visibility=all \
  -H "x-user-id: user-123"
```

```json
{
  "filters": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ownerId": "user-123",
      "teamId": null,
      "name": "Budget AI Models",
      "description": "Models under $5/M tokens",
      "visibility": "private",
      "rules": [
        {
          "field": "inputCost",
          "operator": "lte",
          "value": 5,
          "type": "hard"
        }
      ],
      "version": 1,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z",
      "lastUsedAt": null,
      "usageCount": 0
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

---

### 2. Create Filter

**POST** `/api/filters`

Create a new saved filter.

#### Request Body

```typescript
{
  name: string;                // Required
  description?: string;
  visibility?: 'private' | 'team' | 'public';  // Default: 'private'
  teamId?: string;             // Required if visibility='team'
  rules: RuleClause[];         // Required, must be non-empty
}
```

#### Response

`201 Created` with FilterResponse body

#### Example

```bash
curl -X POST http://localhost:3000/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "name": "High-performance Reasoning Models",
    "description": "Fast models with reasoning capability",
    "visibility": "private",
    "rules": [
      {
        "field": "capabilities",
        "operator": "contains",
        "value": "reasoning",
        "type": "hard"
      },
      {
        "field": "inputCost",
        "operator": "lte",
        "value": 10,
        "type": "soft",
        "weight": 0.7
      }
    ]
  }'
```

#### Validation

- `name` and `rules` are required
- `rules` must be non-empty array
- `teamId` required when `visibility='team'`

---

### 3. Get Filter

**GET** `/api/filters/[id]`

Get a specific filter by ID.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Filter ID |

#### Response

FilterResponse object

#### Access Control

User can access filter if:
- They own the filter, OR
- Filter is public, OR
- Filter is team-visible and user is in that team

#### Example

```bash
curl http://localhost:3000/api/filters/550e8400-e29b-41d4-a716-446655440000 \
  -H "x-user-id: user-123"
```

---

### 4. Update Filter

**PUT** `/api/filters/[id]`

Update a filter (owner only).

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Filter ID |

#### Request Body

All fields optional - only provided fields will be updated:

```typescript
{
  name?: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
  teamId?: string;
  rules?: RuleClause[];
}
```

#### Response

FilterResponse object with updated values

#### Access Control

Only the filter owner can update it.

#### Example

```bash
curl -X PUT \
  http://localhost:3000/api/filters/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "name": "Updated Filter Name",
    "description": "New description"
  }'
```

---

### 5. Delete Filter

**DELETE** `/api/filters/[id]`

Delete a filter (owner only).

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Filter ID |

#### Response

```json
{
  "success": true
}
```

#### Access Control

Only the filter owner can delete it.

#### Example

```bash
curl -X DELETE \
  http://localhost:3000/api/filters/550e8400-e29b-41d4-a716-446655440000 \
  -H "x-user-id: user-123"
```

---

### 6. Evaluate Filter

**POST** `/api/filters/[id]/evaluate`

Evaluate a filter against models and get matches.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Filter ID |

#### Request Body

```typescript
{
  modelIds?: string[];  // Optional: specific models to test
  limit?: number;       // Max results (default: 50, max: 500)
}
```

#### Response

```typescript
{
  filterId: string;
  filterName: string;
  results: ModelEvaluationResult[];
  totalEvaluated: number;
  matchCount: number;
}

interface ModelEvaluationResult {
  modelId: string;
  modelName: string;
  match: boolean;                 // All hard clauses passed
  score: number;                  // Soft clause score (0-1)
  rationale: string;              // Explanation
  failedHardClauses: number;
  passedSoftClauses: number;
  totalSoftClauses: number;
}
```

#### Side Effects

- Updates `lastUsedAt` timestamp
- Increments `usageCount`

#### Example

```bash
curl -X POST \
  http://localhost:3000/api/filters/550e8400-e29b-41d4-a716-446655440000/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "limit": 10
  }'
```

```json
{
  "filterId": "550e8400-e29b-41d4-a716-446655440000",
  "filterName": "Budget AI Models",
  "results": [
    {
      "modelId": "gpt-3.5-turbo",
      "modelName": "GPT-3.5 Turbo",
      "match": true,
      "score": 1.0,
      "rationale": "All criteria passed",
      "failedHardClauses": 0,
      "passedSoftClauses": 2,
      "totalSoftClauses": 2
    }
  ],
  "totalEvaluated": 10,
  "matchCount": 5
}
```

---

## Data Types

### FilterResponse

```typescript
interface FilterResponse {
  id: string;
  ownerId: string;
  teamId: string | null;
  name: string;
  description: string | null;
  visibility: string;
  rules: RuleClause[];
  version: number;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  lastUsedAt: string | null; // ISO 8601
  usageCount: number;
}
```

### RuleClause

```typescript
interface RuleClause {
  field: string;           // Model field (e.g., "inputCost")
  operator:
    | 'eq'      // Equal
    | 'ne'      // Not equal
    | 'gt'      // Greater than
    | 'gte'     // Greater than or equal
    | 'lt'      // Less than
    | 'lte'     // Less than or equal
    | 'in'      // In array
    | 'contains'; // Array contains value
  value: any;              // Comparison value
  type: 'hard' | 'soft';   // Hard = must pass, Soft = scoring
  weight?: number;         // Weight for soft clauses (0-1)
}
```

### Example Rules

```typescript
// Hard clause: Provider must be OpenAI or Anthropic
{
  field: 'provider',
  operator: 'in',
  value: ['openai', 'anthropic'],
  type: 'hard'
}

// Soft clause: Prefer models under $10 (60% weight)
{
  field: 'inputCost',
  operator: 'lte',
  value: 10,
  type: 'soft',
  weight: 0.6
}

// Hard clause: Must have reasoning capability
{
  field: 'capabilities',
  operator: 'contains',
  value: 'reasoning',
  type: 'hard'
}
```

---

## Error Responses

All endpoints return standard error format:

```typescript
{
  error: string;
  code?: string;
  details?: any;
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET, PUT successful |
| 201 | Created | POST successful |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized for resource |
| 404 | Not Found | Filter doesn't exist |
| 500 | Server Error | Internal error |

---

## Authentication

### Development Setup

In `app/api/filters/auth.ts`, the stub implementation allows:

1. **Custom user via headers:**
   ```bash
   curl -H "x-user-id: user-123" -H "x-team-id: team-456" ...
   ```

2. **Default dev user:**
   - Automatically uses `00000000-0000-0000-0000-000000000001`
   - Only in `NODE_ENV=development`

### Production Implementation

Replace `getAuthContext()` in `app/api/filters/auth.ts`:

#### NextAuth Example

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return {
    userId: session.user.id,
    teamId: session.user.teamId,
    isAuthenticated: true,
  };
}
```

#### JWT Example

```typescript
import { jwtVerify } from 'jose';

export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  const token = request.headers
    .get('authorization')
    ?.split(' ')[1];

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    return {
      userId: payload.sub!,
      teamId: payload.teamId as string | undefined,
      isAuthenticated: true,
    };
  } catch {
    return null;
  }
}
```

---

## Access Control

### Filter Visibility Rules

| Visibility | Who Can Access | Who Can Modify |
|------------|----------------|----------------|
| **private** | Owner only | Owner only |
| **team** | Team members | Owner only |
| **public** | Everyone | Owner only |

### Implementation

Access control is enforced by:
- `canAccessFilter()` - Read access
- `canModifyFilter()` - Write access

Both in `app/api/filters/auth.ts`

---

## Rate Limiting

**Not implemented** - Add in production:

```typescript
// Example with upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  const { success } = await ratelimit.limit(auth.userId);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

---

## Testing

### Manual Testing

```bash
# Set env var
export BASE_URL=http://localhost:3000
export USER_ID=test-user-123

# Create filter
FILTER_ID=$(curl -X POST $BASE_URL/api/filters \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "name": "Test Filter",
    "rules": [{
      "field": "provider",
      "operator": "eq",
      "value": "openai",
      "type": "hard"
    }]
  }' | jq -r '.id')

# Get filter
curl $BASE_URL/api/filters/$FILTER_ID \
  -H "x-user-id: $USER_ID"

# List filters
curl "$BASE_URL/api/filters?page=1&pageSize=10" \
  -H "x-user-id: $USER_ID"

# Evaluate filter
curl -X POST $BASE_URL/api/filters/$FILTER_ID/evaluate \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"limit": 5}'

# Update filter
curl -X PUT $BASE_URL/api/filters/$FILTER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"name": "Updated Name"}'

# Delete filter
curl -X DELETE $BASE_URL/api/filters/$FILTER_ID \
  -H "x-user-id: $USER_ID"
```

---

## File Structure

```
app/api/filters/
├── route.ts                      # POST (create), GET (list)
├── [id]/
│   ├── route.ts                  # GET, PUT, DELETE
│   └── evaluate/
│       └── route.ts              # POST (evaluate)
├── auth.ts                       # Auth helpers
└── types.ts                      # TypeScript types
```

---

## Next Steps

1. **Implement real authentication** in `auth.ts`
2. **Add rate limiting** for production
3. **Add pagination** for large result sets
4. **Add search/filtering** to list endpoint
5. **Add webhooks** for filter events
6. **Add analytics** endpoints for usage stats
7. **Add bulk operations** (evaluate multiple filters)

---

## References

- [Database Setup](./DATABASE_SETUP.md)
- [Filter Evaluator](../src/lib/filters.ts)
- [Drizzle Schema](../src/db/schema.ts)
