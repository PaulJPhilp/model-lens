import type { RuleClause } from '@/src/db/schema';

/**
 * Request body for creating a new filter
 */
export interface CreateFilterRequest {
  name: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
  teamId?: string;
  rules: RuleClause[];
}

/**
 * Request body for updating a filter
 */
export interface UpdateFilterRequest {
  name?: string;
  description?: string;
  visibility?: 'private' | 'team' | 'public';
  teamId?: string;
  rules?: RuleClause[];
}

/**
 * Request body for evaluating a filter against models
 */
export interface EvaluateFilterRequest {
  modelIds?: string[]; // Optional: specific models to test
  limit?: number; // Max results to return
}

/**
 * Response for a single filter
 */
export interface FilterResponse {
  id: string;
  ownerId: string;
  teamId: string | null;
  name: string;
  description: string | null;
  visibility: string;
  rules: RuleClause[];
  version: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  usageCount: number;
}

/**
 * Response for list of filters
 */
export interface FiltersListResponse {
  filters: FilterResponse[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Evaluation result for a single model
 */
export interface ModelEvaluationResult {
  modelId: string;
  modelName: string;
  match: boolean;
  score: number;
  rationale: string;
  failedHardClauses: number;
  passedSoftClauses: number;
  totalSoftClauses: number;
}

/**
 * Response for filter evaluation
 */
export interface EvaluateFilterResponse {
  filterId: string;
  filterName: string;
  results: ModelEvaluationResult[];
  totalEvaluated: number;
  matchCount: number;
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}
