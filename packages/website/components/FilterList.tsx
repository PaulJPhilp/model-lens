"use client"

import { useEffect, useState } from "react"

import type { RuleClause } from "@/src/db/schema"
import { FilterEditor } from "./FilterEditor"
import { FilterRunHistory } from "./FilterRunHistory"

/**
 * Type definitions for API responses
 */
interface SavedFilter {
	id: string
	ownerId: string
	teamId: string | null
	name: string
	description: string | null
	visibility: string
	rules: RuleClause[]
	version: number
	createdAt: string
	updatedAt: string
	lastUsedAt: string | null
	usageCount: number
}

interface FiltersListResponse {
	filters: SavedFilter[]
	total: number
	page: number
	pageSize: number
}

interface ModelEvaluationResult {
	modelId: string
	modelName: string
	match: boolean
	score: number
	rationale: string
	failedHardClauses: number
	passedSoftClauses: number
	totalSoftClauses: number
}

interface EvaluateFilterResponse {
	filterId: string
	filterName: string
	results: ModelEvaluationResult[]
	totalEvaluated: number
	matchCount: number
}

/**
 * Props for FilterList component
 */
interface FilterListProps {
	/** Optional callback when a filter is applied */
	onFilterApplied?: (results: EvaluateFilterResponse) => void
}

/**
 * FilterList Component
 *
 * Lists saved filters with ability to:
 * - View filter details
 * - Edit filter (opens FilterEditor in modal)
 * - Delete filter
 * - Apply/evaluate filter
 * - Create new filter
 *
 * @example
 * <FilterList onFilterApplied={(results) => console.log('Matches:', results.matchCount)} />
 */
export function FilterList({ onFilterApplied }: FilterListProps) {
	// Data state
	const [filters, setFilters] = useState<SavedFilter[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Pagination state
	const [page, setPage] = useState(1)
	const [pageSize, _setPageSize] = useState(20)
	const [total, setTotal] = useState(0)

	// Filter state
	const [visibility, setVisibility] = useState<string>("all")
	const [searchQuery, setSearchQuery] = useState<string>("")

	// Modal state
	const [isEditorOpen, setIsEditorOpen] = useState(false)
	const [editingFilter, setEditingFilter] = useState<SavedFilter | undefined>(
		undefined,
	)
	const [isResultsOpen, setIsResultsOpen] = useState(false)
	const [evaluationResults, setEvaluationResults] =
		useState<EvaluateFilterResponse | null>(null)
	const [isHistoryOpen, setIsHistoryOpen] = useState(false)
	const [historyFilterId, setHistoryFilterId] = useState<string | null>(null)

	// Action state
	const [applyingId, setApplyingId] = useState<string | null>(null)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	/**
	 * Fetch filters from API
	 */
	const fetchFilters = async () => {
		setLoading(true)
		setError(null)

		try {
			const params = new URLSearchParams({
				page: String(page),
				pageSize: String(pageSize),
				visibility,
				search: searchQuery,
			})

			const response = await fetch(`/api/filters?${params}`)

			if (!response.ok) {
				throw new Error("Failed to fetch filters")
			}

			const data: FiltersListResponse = await response.json()
			setFilters(data.filters)
			setTotal(data.total)
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred")
		} finally {
			setLoading(false)
		}
	}

	/**
	 * Delete a filter
	 */
	const deleteFilter = async (id: string) => {
		if (!confirm("Are you sure you want to delete this filter?")) {
			return
		}

		setDeletingId(id)

		try {
			const response = await fetch(`/api/filters/${id}`, {
				method: "DELETE",
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || "Failed to delete filter")
			}

			// Remove from list
			setFilters(filters.filter((f) => f.id !== id))
			setTotal(total - 1)
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete filter")
		} finally {
			setDeletingId(null)
		}
	}

	/**
	 * Apply/evaluate a filter
	 */
	const applyFilter = async (id: string, limit: number = 50) => {
		setApplyingId(id)

		try {
			const response = await fetch(`/api/filters/${id}/evaluate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ limit }),
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || "Failed to apply filter")
			}

			const results: EvaluateFilterResponse = await response.json()
			setEvaluationResults(results)
			setIsResultsOpen(true)
			onFilterApplied?.(results)

			// Refresh filters to update usage stats
			fetchFilters()
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to apply filter")
		} finally {
			setApplyingId(null)
		}
	}

	/**
	 * Open editor for creating new filter
	 */
	const createFilter = () => {
		setEditingFilter(undefined)
		setIsEditorOpen(true)
	}

	/**
	 * Open editor for editing existing filter
	 */
	const editFilter = (filter: SavedFilter) => {
		setEditingFilter(filter)
		setIsEditorOpen(true)
	}

	/**
	 * View run history for a filter
	 */
	const viewHistory = (filterId: string) => {
		setHistoryFilterId(filterId)
		setIsHistoryOpen(true)
	}

	/**
	 * Handle save from FilterEditor
	 */
	const handleSave = (savedFilter: SavedFilter) => {
		if (editingFilter) {
			// Update existing filter in list
			setFilters(
				filters.map((f) => (f.id === savedFilter.id ? savedFilter : f)),
			)
		} else {
			// Add new filter to list
			setFilters([savedFilter, ...filters])
			setTotal(total + 1)
		}
		setIsEditorOpen(false)
	}

	/**
	 * Load filters on mount and when filters change
	 */
	useEffect(() => {
		fetchFilters()
	}, [fetchFilters])

	/**
	 * Format date for display
	 */
	const formatDate = (dateString: string | null) => {
		if (!dateString) return "Never"
		return new Date(dateString).toLocaleDateString()
	}

	/**
	 * Get visibility badge color
	 */
	const getVisibilityColor = (vis: string) => {
		switch (vis) {
			case "private":
				return "bg-blue-100 text-blue-800"
			case "team":
				return "bg-purple-100 text-purple-800"
			case "public":
				return "bg-green-100 text-green-800"
			default:
				return "bg-gray-100 text-gray-800"
		}
	}

	return (
		<div className="space-y-6 min-h-screen">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Saved Filters</h2>
					<p className="text-muted-foreground">
						{total} filter{total !== 1 ? "s" : ""} found
					</p>
				</div>
				<button onClick={createFilter}>Create Filter</button>
			</div>

			{/* Controls */}
			<div className="flex gap-4">
				<div className="w-48">
					<select
						value={visibility}
						onChange={(e) => setVisibility(e.target.value)}
					>
						<option value="all">All Filters</option>
						<option value="private">Private Only</option>
						<option value="team">Team Only</option>
						<option value="public">Public Only</option>
					</select>
				</div>
				<div className="flex-1 max-w-sm">
					<input
						placeholder="Search filters..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
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
					Loading filters...
				</div>
			)}

			{/* Empty state */}
			{!loading && filters.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					<p className="mb-4">No filters found</p>
					<button onClick={createFilter}>Create Your First Filter</button>
				</div>
			)}

			{/* Filters list */}
			{!loading && filters.length > 0 && (
				<div className="space-y-4">
					{filters.map((filter) => (
						<div
							key={filter.id}
							className="p-6 border rounded-lg bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="flex-1">
									<div className="flex items-center gap-3 mb-2">
										<h3 className="text-xl font-semibold">{filter.name}</h3>
										<span
											className={`px-2 py-1 text-xs rounded-full ${getVisibilityColor(
												filter.visibility,
											)}`}
										>
											{filter.visibility}
										</span>
									</div>
									{filter.description && (
										<p className="text-muted-foreground">
											{filter.description}
										</p>
									)}
								</div>
							</div>

							{/* Stats */}
							<div className="grid grid-cols-3 gap-4 mb-4 text-sm">
								<div>
									<span className="text-muted-foreground">Rules:</span>{" "}
									<span className="font-medium">{filter.rules.length}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Used:</span>{" "}
									<span className="font-medium">{filter.usageCount} times</span>
								</div>
								<div>
									<span className="text-muted-foreground">Last used:</span>{" "}
									<span className="font-medium">
										{formatDate(filter.lastUsedAt)}
									</span>
								</div>
							</div>

							{/* Rules preview */}
							<div className="mb-4">
								<details className="text-sm">
									<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
										View {filter.rules.length} rule
										{filter.rules.length !== 1 ? "s" : ""}
									</summary>
									<div className="mt-2 space-y-2 pl-4">
										{filter.rules.map((rule, idx) => (
											<div
												key={idx}
												className="p-2 bg-muted rounded text-xs font-mono"
											>
												<span className="font-semibold">{rule.field}</span>{" "}
												{rule.operator}{" "}
												<span className="text-primary">
													{String(rule.value)}
												</span>{" "}
												<span
													className={
														rule.type === "hard"
															? "text-red-600 font-semibold"
															: "text-blue-600"
													}
												>
													[{rule.type}
													{rule.type === "soft" && rule.weight
														? ` w=${rule.weight}`
														: ""}
													]
												</span>
											</div>
										))}
									</div>
								</details>
							</div>

							{/* Actions */}
							<div className="flex gap-2">
								<button
									onClick={() => applyFilter(filter.id)}
									disabled={applyingId === filter.id}
								>
									{applyingId === filter.id ? "Applying..." : "Apply Filter"}
								</button>
								<button onClick={() => viewHistory(filter.id)}>History</button>
								<button onClick={() => editFilter(filter)}>Edit</button>
								<button
									onClick={() => deleteFilter(filter.id)}
									disabled={deletingId === filter.id}
								>
									{deletingId === filter.id ? "Deleting..." : "Delete"}
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{!loading && total > pageSize && (
				<div className="flex items-center justify-between">
					<button onClick={() => setPage(page - 1)} disabled={page === 1}>
						Previous
					</button>
					<span className="text-sm text-muted-foreground">
						Showing {(page - 1) * pageSize + 1}-
						{Math.min(page * pageSize, total)} of {total}
					</span>
					<button
						onClick={() => setPage(page + 1)}
						disabled={page >= Math.ceil(total / pageSize)}
					>
						Next
					</button>
				</div>
			)}

			{/* Filter Editor Modal */}
			<div className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<div>
					<h2>{editingFilter ? "Edit Filter" : "Create New Filter"}</h2>
					<p>
						{editingFilter
							? "Update your filter settings and rules"
							: "Create a new filter to save your search criteria"}
					</p>
				</div>
				<FilterEditor
					filter={editingFilter}
					onSave={handleSave}
					onCancel={() => setIsEditorOpen(false)}
				/>
			</div>

			{/* Evaluation Results Modal */}
			<div className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<div>
					<h2>{evaluationResults?.filterName} - Results</h2>
					<p>
						Found {evaluationResults?.matchCount} matching models out of{" "}
						{evaluationResults?.totalEvaluated} evaluated
					</p>
				</div>

				{evaluationResults && (
					<div className="space-y-3">
						{evaluationResults.results
							.filter((r) => r.match)
							.map((result, idx) => (
								<div
									key={`${result.modelId}-${idx}`}
									className="p-4 border rounded-lg"
								>
									<div className="flex items-start justify-between mb-2">
										<div>
											<h4 className="font-semibold">{result.modelName}</h4>
											<p className="text-xs text-muted-foreground">
												{result.modelId}
											</p>
										</div>
										<div className="text-right">
											<div className="text-2xl font-bold text-primary">
												{(result.score * 100).toFixed(0)}%
											</div>
											<div className="text-xs text-muted-foreground">Score</div>
										</div>
									</div>

									<p className="text-sm mb-2">{result.rationale}</p>

									<div className="grid grid-cols-3 gap-2 text-xs">
										<div>
											<span className="text-muted-foreground">
												Failed Hard:
											</span>{" "}
											<span className="font-medium">
												{result.failedHardClauses}
											</span>
										</div>
										<div>
											<span className="text-muted-foreground">
												Passed Soft:
											</span>{" "}
											<span className="font-medium">
												{result.passedSoftClauses}/{result.totalSoftClauses}
											</span>
										</div>
										<div>
											<span
												className={
													result.match
														? "text-green-600 font-semibold"
														: "text-red-600"
												}
											>
												{result.match ? "✓ Match" : "✗ No Match"}
											</span>
										</div>
									</div>
								</div>
							))}

						{evaluationResults.matchCount === 0 && (
							<div className="text-center py-8 text-muted-foreground">
								No models matched this filter
							</div>
						)}
					</div>
				)}
			</div>

			{/* Run History Modal */}
			<div className="max-w-6xl max-h-[90vh] overflow-y-auto">
				{historyFilterId && (
					<FilterRunHistory
						filterId={historyFilterId}
						onClose={() => setIsHistoryOpen(false)}
					/>
				)}
			</div>
		</div>
	)
}
