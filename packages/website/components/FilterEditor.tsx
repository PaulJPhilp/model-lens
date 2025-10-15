"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { RuleClause } from "@/src/db/schema"

/**
 * Type definitions for API requests/responses
 */
interface SavedFilterCreate {
	name: string
	description?: string
	visibility?: "private" | "team" | "public"
	teamId?: string
	rules: RuleClause[]
}

interface SavedFilterUpdate {
	name?: string
	description?: string
	visibility?: "private" | "team" | "public"
	teamId?: string
	rules?: RuleClause[]
}

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

/**
 * Props for FilterEditor component
 */
interface FilterEditorProps {
	/** Existing filter to edit (undefined = create mode) */
	filter?: SavedFilter
	/** Callback when save completes successfully */
	onSave?: (filter: SavedFilter) => void
	/** Callback when cancel is clicked */
	onCancel?: () => void
}

/**
 * Available model fields for filtering
 */
const MODEL_FIELDS = [
	"provider",
	"inputCost",
	"outputCost",
	"cacheReadCost",
	"cacheWriteCost",
	"contextWindow",
	"capabilities",
	"modalities",
	"releaseDate",
	"openWeights",
	"supportsTemperature",
	"supportsAttachments",
] as const

/**
 * Available operators for filtering
 */
const OPERATORS: RuleClause["operator"][] = [
	"eq",
	"ne",
	"gt",
	"gte",
	"lt",
	"lte",
	"in",
	"contains",
]

/**
 * FilterEditor Component
 *
 * UI to create or edit a saved filter with rule rows.
 * Each rule has: field, operator, value, type (hard/soft), and optional weight.
 *
 * @example
 * // Create mode
 * <FilterEditor onSave={(filter) => console.log('Created:', filter)} />
 *
 * // Edit mode
 * <FilterEditor
 *   filter={existingFilter}
 *   onSave={(filter) => console.log('Updated:', filter)}
 *   onCancel={() => console.log('Cancelled')}
 * />
 */
export function FilterEditor({ filter, onSave, onCancel }: FilterEditorProps) {
	const isEditMode = !!filter

	// Form state
	const [name, setName] = useState(filter?.name ?? "")
	const [description, setDescription] = useState(filter?.description ?? "")
	const [visibility, setVisibility] = useState<"private" | "team" | "public">(
		(filter?.visibility as "private" | "team" | "public") ?? "private",
	)
	const [teamId, setTeamId] = useState(filter?.teamId ?? "")
	const [rules, setRules] = useState<RuleClause[]>(
		filter?.rules ?? [
			{
				field: "provider",
				operator: "eq",
				value: "",
				type: "hard",
			},
		],
	)

	// UI state
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	/**
	 * Add a new empty rule
	 */
	const addRule = () => {
		setRules([
			...rules,
			{
				field: "provider",
				operator: "eq",
				value: "",
				type: "hard",
			},
		])
	}

	/**
	 * Remove a rule by index
	 */
	const removeRule = (index: number) => {
		setRules(rules.filter((_, i) => i !== index))
	}

	/**
	 * Update a specific rule field
	 */
	const updateRule = (index: number, updates: Partial<RuleClause>) => {
		setRules(
			rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule)),
		)
	}

	/**
	 * Validate form before submission
	 */
	const validate = (): string | null => {
		if (!name.trim()) {
			return "Filter name is required"
		}
		if (rules.length === 0) {
			return "At least one rule is required"
		}
		for (const rule of rules) {
			if (!rule.value && rule.value !== 0) {
				return "All rules must have a value"
			}
		}
		if (visibility === "team" && !teamId) {
			return "Team ID is required for team visibility"
		}
		return null
	}

	/**
	 * Handle form submission (create or update)
	 */
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)

		const validationError = validate()
		if (validationError) {
			setError(validationError)
			return
		}

		setLoading(true)

		try {
			if (isEditMode) {
				// Update existing filter
				const body: SavedFilterUpdate = {
					name,
					description: description || undefined,
					visibility,
					teamId: visibility === "team" ? teamId : undefined,
					rules,
				}

				const response = await fetch(`/api/filters/${filter.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || "Failed to update filter")
				}

				const updatedFilter: SavedFilter = await response.json()
				onSave?.(updatedFilter)
			} else {
				// Create new filter
				const body: SavedFilterCreate = {
					name,
					description: description || undefined,
					visibility,
					teamId: visibility === "team" ? teamId : undefined,
					rules,
				}

				const response = await fetch("/api/filters", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				})

				if (!response.ok) {
					const errorData = await response.json()
					throw new Error(errorData.error || "Failed to create filter")
				}

				const newFilter: SavedFilter = await response.json()
				onSave?.(newFilter)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred")
		} finally {
			setLoading(false)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Filter name */}
			<div>
				<label htmlFor="filter-name" className="block text-sm font-medium mb-2">
					Filter Name *
				</label>
				<Input
					id="filter-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g., Budget AI Models"
					required
				/>
			</div>

			{/* Description */}
			<div>
				<label
					htmlFor="filter-description"
					className="block text-sm font-medium mb-2"
				>
					Description
				</label>
				<Textarea
					id="filter-description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional description of what this filter does"
					rows={3}
				/>
			</div>

			{/* Visibility */}
			<div>
				<label
					htmlFor="filter-visibility"
					className="block text-sm font-medium mb-2"
				>
					Visibility
				</label>
				<Select
					value={visibility}
					onValueChange={(v) => setVisibility(v as any)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="private">Private (only you)</SelectItem>
						<SelectItem value="team">Team</SelectItem>
						<SelectItem value="public">Public (everyone)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Team ID (only if team visibility) */}
			{visibility === "team" && (
				<div>
					<label
						htmlFor="filter-teamId"
						className="block text-sm font-medium mb-2"
					>
						Team ID *
					</label>
					<Input
						id="filter-teamId"
						type="text"
						value={teamId}
						onChange={(e) => setTeamId(e.target.value)}
						placeholder="team-123"
						required
					/>
				</div>
			)}

			{/* Rules */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<label className="block text-sm font-medium">Rules *</label>
					<Button type="button" onClick={addRule} variant="outline" size="sm">
						+ Add Rule
					</Button>
				</div>

				<div className="space-y-3">
					{rules.map((rule, index) => (
						<div
							key={index}
							className="p-4 border rounded-lg space-y-3 bg-card"
						>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								{/* Field */}
								<div>
									<label className="block text-xs font-medium mb-1">
										Field
									</label>
									<Select
										value={rule.field}
										onValueChange={(field) => updateRule(index, { field })}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MODEL_FIELDS.map((field) => (
												<SelectItem key={field} value={field}>
													{field}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Operator */}
								<div>
									<label className="block text-xs font-medium mb-1">
										Operator
									</label>
									<Select
										value={rule.operator}
										onValueChange={(operator) =>
											updateRule(index, {
												operator: operator as RuleClause["operator"],
											})
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{OPERATORS.map((op) => (
												<SelectItem key={op} value={op}>
													{op}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Value */}
								<div>
									<label className="block text-xs font-medium mb-1">
										Value
									</label>
									<Input
										type="text"
										value={String(rule.value)}
										onChange={(e) => {
											// Try to parse as number if it looks numeric
											const val = e.target.value
											const numVal = Number(val)
											updateRule(index, {
												value:
													!Number.isNaN(numVal) && val !== "" ? numVal : val,
											})
										}}
										placeholder="e.g., openai or 10"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								{/* Type */}
								<div>
									<label className="block text-xs font-medium mb-1">Type</label>
									<Select
										value={rule.type}
										onValueChange={(type) =>
											updateRule(index, { type: type as "hard" | "soft" })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="hard">Hard (must match)</SelectItem>
											<SelectItem value="soft">
												Soft (weighted score)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Weight (only for soft clauses) */}
								{rule.type === "soft" && (
									<div>
										<label className="block text-xs font-medium mb-1">
											Weight
										</label>
										<Input
											type="number"
											min="0"
											max="1"
											step="0.1"
											value={rule.weight ?? 1}
											onChange={(e) =>
												updateRule(index, { weight: Number(e.target.value) })
											}
											placeholder="0.0 - 1.0"
										/>
									</div>
								)}

								{/* Remove button */}
								<div className="flex items-end">
									<Button
										type="button"
										variant="destructive"
										size="sm"
										onClick={() => removeRule(index)}
										disabled={rules.length === 1}
										className="w-full"
									>
										Remove
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Error message */}
			{error && (
				<div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
					{error}
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-3">
				<Button type="submit" disabled={loading} className="flex-1">
					{loading
						? "Saving..."
						: isEditMode
							? "Update Filter"
							: "Create Filter"}
				</Button>
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
			</div>
		</form>
	)
}
