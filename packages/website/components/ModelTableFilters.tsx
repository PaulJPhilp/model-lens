import { BookOpen, Brain, Video, Volume2, Wrench } from "lucide-react"
import type * as React from "react"
import type { Filters } from "../lib/services/FilterService"
import type { Model } from "../lib/types"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Slider } from "./ui/slider"

interface ModelTableFiltersProps {
	models: Model[]
	filteredModels: Model[]
	search: string
	setSearch: (search: string) => void
	filters: Filters
	setFilters: React.Dispatch<React.SetStateAction<Filters>>
}

export function ModelTableFilters({
	models,
	filteredModels,
	search,
	setSearch,
	filters,
	setFilters,
}: ModelTableFiltersProps) {
	// Extract unique years from models
	const availableYears = Array.from(
		new Set(
			(models || [])
				.map((m) => {
					if (!m.releaseDate) return null
					return new Date(m.releaseDate).getFullYear()
				})
				.filter((year): year is number => year !== null),
		),
	).sort((a, b) => b - a)

	const toggleYear = (year: number) => {
		setFilters((prev) => ({
			...prev,
			years: prev.years.includes(year)
				? prev.years.filter((y) => y !== year)
				: [...prev.years, year],
		}))
	}

	// Extract unique modalities from models
	const availableModalities = Array.from(
		new Set((models || []).flatMap((m) => m.modalities)),
	).sort()

	const toggleModality = (modality: string) => {
		setFilters((prev) => ({
			...prev,
			modalities: prev.modalities.includes(modality)
				? prev.modalities.filter((m) => m !== modality)
				: [...prev.modalities, modality],
		}))
	}

	const modalityIcons: Record<string, React.ReactElement> = {
		text: <span className="text-xs">T</span>,
		image: <span className="text-xs">🖼</span>,
		file: <span className="text-xs">📄</span>,
		video: <Video className="h-4 w-4" />,
		audio: <Volume2 className="h-4 w-4" />,
	}

	// Extract unique capabilities from models
	const availableCapabilities = Array.from(
		new Set((models || []).flatMap((m) => m.capabilities)),
	).sort()

	const toggleCapability = (capability: string) => {
		setFilters((prev) => ({
			...prev,
			capabilities: prev.capabilities.includes(capability)
				? prev.capabilities.filter((c) => c !== capability)
				: [...prev.capabilities, capability],
		}))
	}

	const capabilityIcons: Record<string, React.ReactElement> = {
		tools: <Wrench className="h-4 w-4" />,
		reasoning: <Brain className="h-4 w-4" />,
		knowledge: <BookOpen className="h-4 w-4" />,
	}

	// Provider filtering - extract from actual model data
	const providers = Array.from(
		new Set((models || []).map((m) => m.provider.toLowerCase())),
	).sort()

	const toggleProvider = (provider: string) => {
		setFilters((prev) => ({
			...prev,
			providers: prev.providers.includes(provider)
				? prev.providers.filter((p) => p !== provider)
				: [...prev.providers, provider],
		}))
	}

	const toggleBooleanFilter = (
		key: "openWeights" | "supportsTemperature" | "supportsAttachments",
	) => {
		setFilters((prev) => ({
			...prev,
			[key]: prev[key] === null ? true : prev[key] === true ? false : null,
		}))
	}

	// Calculate unique provider count
	const uniqueProviders = Array.from(
		new Set((models || []).map((m) => m.provider)),
	).length
	const activeProviders = Array.from(
		new Set((filteredModels || []).map((m) => m.provider)),
	).length

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="p-4 border-b border-brand">
				<Input
					type="text"
					placeholder="Search models..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full"
				/>
			</div>

			{/* Provider filters */}
			<div className="border-b border-brand p-2">
				<div className="flex items-center gap-2 mb-2">
					<span className="text-sm font-medium">Providers</span>
					<span className="text-xs text-gray-500">
						({activeProviders}/{uniqueProviders})
					</span>
				</div>
				<div className="flex gap-2 overflow-x-auto">
					{providers.map((provider) => (
						<Button
							key={provider}
							variant={
								filters.providers.includes(provider) ? "default" : "outline"
							}
							size="sm"
							className="text-xs px-2 py-1 h-auto"
							onClick={() => toggleProvider(provider)}
						>
							{provider}
						</Button>
					))}
				</div>
			</div>

			{/* Year filters */}
			<div className="border-b border-brand p-2">
				<div className="flex items-center gap-2 mb-2">
					<span className="text-sm font-medium">Release Years</span>
					<span className="text-xs text-gray-500">
						({filters.years.length}/{availableYears.length})
					</span>
				</div>
				<div className="flex gap-2 overflow-x-auto">
					{availableYears.map((year) => (
						<Button
							key={year}
							variant={filters.years.includes(year) ? "default" : "outline"}
							size="sm"
							className="text-xs px-2 py-1 h-auto"
							onClick={() => toggleYear(year)}
						>
							{year}
						</Button>
					))}
				</div>
			</div>

			{/* Modality filters */}
			<div className="border-b border-brand p-2">
				<div className="flex items-center gap-2 mb-2">
					<span className="text-sm font-medium">Modalities</span>
					<span className="text-xs text-gray-500">
						({filters.modalities.length}/{availableModalities.length})
					</span>
				</div>
				<div className="flex gap-2 overflow-x-auto">
					{availableModalities.map((modality) => (
						<Button
							key={modality}
							variant={
								filters.modalities.includes(modality) ? "default" : "outline"
							}
							size="sm"
							className="px-2 py-1 h-auto"
							onClick={() => toggleModality(modality)}
						>
							{modalityIcons[modality] || modality}
						</Button>
					))}
				</div>
			</div>

			{/* Capability filters */}
			<div className="border-b border-brand p-2">
				<div className="flex items-center gap-2 mb-2">
					<span className="text-sm font-medium">Capabilities</span>
					<span className="text-xs text-gray-500">
						({filters.capabilities.length}/{availableCapabilities.length})
					</span>
				</div>
				<div className="flex gap-2 overflow-x-auto">
					{availableCapabilities.map((capability) => (
						<Button
							key={capability}
							variant={
								filters.capabilities.includes(capability)
									? "default"
									: "outline"
							}
							size="sm"
							className="px-2 py-1 h-auto"
							onClick={() => toggleCapability(capability)}
						>
							{capabilityIcons[capability] || capability}
						</Button>
					))}
				</div>
			</div>

			{/* Boolean filters */}
			<div className="border-b border-brand p-2 flex gap-2 overflow-x-auto">
				<Button
					variant={
						filters.openWeights === null
							? "outline"
							: filters.openWeights
								? "default"
								: "destructive"
					}
					size="sm"
					className="text-xs px-2 py-1 h-auto"
					onClick={() => toggleBooleanFilter("openWeights")}
					title="Open Weights"
				>
					Open Weights
				</Button>
				<Button
					variant={
						filters.supportsTemperature === null
							? "outline"
							: filters.supportsTemperature
								? "default"
								: "destructive"
					}
					size="sm"
					className="text-xs px-2 py-1 h-auto"
					onClick={() => toggleBooleanFilter("supportsTemperature")}
					title="Temperature Support"
				>
					Temperature
				</Button>
				<Button
					variant={
						filters.supportsAttachments === null
							? "outline"
							: filters.supportsAttachments
								? "default"
								: "destructive"
					}
					size="sm"
					className="text-xs px-2 py-1 h-auto"
					onClick={() => toggleBooleanFilter("supportsAttachments")}
					title="Attachments Support"
				>
					Attachments
				</Button>
			</div>

			{/* Cost range filters */}
			<div className="border-b border-brand p-2 flex gap-4 overflow-x-auto items-center">
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">
						Input: ${filters.inputCostRange[0].toFixed(0)}-$
						{filters.inputCostRange[1].toFixed(0)}
					</span>
					<Slider
						value={filters.inputCostRange}
						onValueChange={(value) =>
							setFilters((prev) => ({
								...prev,
								inputCostRange: value as [number, number],
							}))
						}
						max={1000}
						step={1}
						className="w-20"
					/>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">
						Output: ${filters.outputCostRange[0].toFixed(0)}-$
						{filters.outputCostRange[1].toFixed(0)}
					</span>
					<Slider
						value={filters.outputCostRange}
						onValueChange={(value) =>
							setFilters((prev) => ({
								...prev,
								outputCostRange: value as [number, number],
							}))
						}
						max={1000}
						step={1}
						className="w-20"
					/>
				</div>
			</div>

			{/* Cache cost range filters */}
			<div className="border-b border-brand p-2 flex gap-4 overflow-x-auto items-center">
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">
						Cache Read: ${filters.cacheReadCostRange[0].toFixed(0)}-$
						{filters.cacheReadCostRange[1].toFixed(0)}
					</span>
					<Slider
						value={filters.cacheReadCostRange}
						onValueChange={(value) =>
							setFilters((prev) => ({
								...prev,
								cacheReadCostRange: value as [number, number],
							}))
						}
						max={1000}
						step={1}
						className="w-20"
					/>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">
						Cache Write: ${filters.cacheWriteCostRange[0].toFixed(0)}-$
						{filters.cacheWriteCostRange[1].toFixed(0)}
					</span>
					<Slider
						value={filters.cacheWriteCostRange}
						onValueChange={(value) =>
							setFilters((prev) => ({
								...prev,
								cacheWriteCostRange: value as [number, number],
							}))
						}
						max={1000}
						step={1}
						className="w-20"
					/>
				</div>
			</div>
		</div>
	)
}
