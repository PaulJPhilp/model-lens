'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * Type definitions for filter runs
 */
interface ModelRunResult {
  modelId: string;
  modelName: string;
  matchedAllHard: boolean;
  score: number;
  clauseResults?: Array<{
    field: string;
    matched: boolean;
    reason: string;
  }>;
}

interface FilterSnapshot {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  rules: unknown[];
  version: number;
}

interface FilterRunResponse {
  id: string;
  filterId: string;
  executedBy: string;
  executedAt: string;
  durationMs: number | null;
  filterSnapshot: FilterSnapshot;
  totalEvaluated: number;
  matchCount: number;
  results: ModelRunResult[];
  limitUsed: number | null;
  modelIdsFilter: string[] | null;
  artifacts: Record<string, string> | null;
  createdAt: string;
}

interface FilterRunsListResponse {
  runs: FilterRunResponse[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Props for FilterRunHistory component
 */
interface FilterRunHistoryProps {
  filterId: string;
  onClose?: () => void;
}

/**
 * FilterRunHistory Component
 *
 * Displays historical runs for a specific filter with:
 * - List of past runs
 * - Run details (matches, duration, timestamp)
 * - Detailed view of individual run results
 *
 * @example
 * <FilterRunHistory filterId="filter-uuid" />
 */
export function FilterRunHistory({ filterId, onClose }: FilterRunHistoryProps) {
  // Data state
  const [runs, setRuns] = useState<FilterRunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Detail view state
  const [selectedRun, setSelectedRun] = useState<FilterRunResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  /**
   * Fetch runs from API
   */
  const fetchRuns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      const response = await fetch(`/api/filters/${filterId}/runs?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch runs');
      }

      const data: FilterRunsListResponse = await response.json();
      setRuns(data.runs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * View run details
   */
  const viewRunDetails = (run: FilterRunResponse) => {
    setSelectedRun(run);
    setIsDetailOpen(true);
  };

  /**
   * Load runs on mount and when page changes
   */
  useEffect(() => {
    fetchRuns();
  }, [page, filterId]);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Format duration
   */
  const formatDuration = (ms: number | null) => {
    if (ms === null) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Run History</h2>
          <p className="text-muted-foreground">
            {total} run{total !== 1 ? 's' : ''} found
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading run history...
        </div>
      )}

      {/* Empty state */}
      {!loading && runs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No runs found for this filter</p>
          <p className="text-sm mt-2">Run the filter to see history here</p>
        </div>
      )}

      {/* Runs list */}
      {!loading && runs.length > 0 && (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => viewRunDetails(run)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-lg font-semibold">
                      {run.matchCount}/{run.totalEvaluated} matches
                    </span>
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {((run.matchCount / run.totalEvaluated) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(run.executedAt)}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{formatDuration(run.durationMs)}</div>
                  {run.limitUsed && (
                    <div className="text-xs">Limit: {run.limitUsed}</div>
                  )}
                </div>
              </div>

              {run.modelIdsFilter && run.modelIdsFilter.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Filtered to: {run.modelIdsFilter.join(', ')}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewRunDetails(run);
                  }}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Run Details Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run Details</DialogTitle>
            <DialogDescription>
              {selectedRun && (
                <div>
                  Executed {formatDate(selectedRun.executedAt)} •{' '}
                  {selectedRun.matchCount}/{selectedRun.totalEvaluated} matches •{' '}
                  {formatDuration(selectedRun.durationMs)}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRun && (
            <div className="space-y-4">
              {/* Filter snapshot */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Filter Used</h3>
                <div className="p-3 bg-muted rounded text-sm">
                  <div className="font-medium">{selectedRun.filterSnapshot.name}</div>
                  {selectedRun.filterSnapshot.description && (
                    <div className="text-muted-foreground text-xs mt-1">
                      {selectedRun.filterSnapshot.description}
                    </div>
                  )}
                  <div className="text-xs mt-2">
                    Version: {selectedRun.filterSnapshot.version} •{' '}
                    {selectedRun.filterSnapshot.rules.length} rule(s)
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">{selectedRun.totalEvaluated}</div>
                  <div className="text-xs text-muted-foreground">Evaluated</div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedRun.matchCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Matches</div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-2xl font-bold">
                    {formatDuration(selectedRun.durationMs)}
                  </div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
              </div>

              {/* Matching models */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Matching Models</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedRun.results
                    .filter((r) => r.matchedAllHard)
                    .map((result) => (
                      <div key={result.modelId} className="p-3 border rounded">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{result.modelName}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.modelId}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {(result.score * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                        </div>
                      </div>
                    ))}

                  {selectedRun.results.filter((r) => r.matchedAllHard).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No models matched this filter
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
