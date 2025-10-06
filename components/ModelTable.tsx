"use client"

import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table"
import { Effect } from "effect"
import {
	BookOpen,
	Brain,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown,
	FileText,
	Image,
	Type,
	Video,
	Volume2,
	Wrench,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { AppLayer } from "../lib/layers"
import { FilterService, type Filters } from "../lib/services/FilterService"
import { ModelService } from "../lib/services/ModelService"
import type { Model } from "../lib/types"
import { ModelDetails } from "./ModelDetails"
import { Navbar } from "./Navbar"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Slider } from "./ui/slider"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table"

function runEffect<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A> {
	return Effect.runPromise(
		effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, E, never>,
	)
}

export function ModelTable() {
	const [models, setModels] = useState<Model[]>([])
	const [filteredModels, setFilteredModels] = useState<Model[]>([])
	const [displayedModels, setDisplayedModels] = useState<Model[]>([])
	const [displayCount, setDisplayCount] = useState(50)
	const [search, setSearch] = useState("")
	const [filters, setFilters] = useState<Filters>({
		providers: [],
		inputCostRange: [0, 1000],
		outputCostRange: [0, 1000],
		cacheReadCostRange: [0, 1000],
		cacheWriteCostRange: [0, 1000],
		modalities: [],
		capabilities: [],
		years: [],
		openWeights: null,
		supportsTemperature: null,
		supportsAttachments: null,
	})
	const [sorting, setSorting] = useState<SortingState>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedModel, setSelectedModel] = useState<Model | null>(null)
	const [detailsOpen, setDetailsOpen] = useState(false)
	const tableContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const fetchModels = async () => {
			setLoading(true)
			setError(null)
			try {
				const result = await runEffect(
					Effect.gen(function* () {
						const service = yield* ModelService
						return yield* service.fetchModels
					}),
				)
				setModels(result)
				setFilteredModels(result)
			} catch (error) {
				console.error("Failed to fetch models:", error)
				setError("Failed to load models. Please try again later.")
			} finally {
				setLoading(false)
			}
		}
		fetchModels()
	}, [])

	useEffect(() => {
		const applyFilters = async () => {
			try {
				const result = await runEffect(
					Effect.gen(function* () {
						const service = yield* FilterService
						return yield* service.applyFilters(models, search, filters)
					}),
				)
				setFilteredModels(result)
				setDisplayCount(50) // Reset display count when filters change
			} catch (error) {
				console.error(error)
			}
		}
		applyFilters()
	}, [models, search, filters])

	// Update displayed models when filtered models or display count changes
	useEffect(() => {
		setDisplayedModels((filteredModels || []).slice(0, displayCount))
	}, [filteredModels, displayCount])

	// Infinite scroll handler
	useEffect(() => {
		const handleScroll = () => {
			const scrollableDiv = tableContainerRef.current
			if (!scrollableDiv) return

			const { scrollTop, scrollHeight, clientHeight } = scrollableDiv
			if (scrollHeight - scrollTop <= clientHeight * 1.5) {
				if (displayCount < filteredModels.length) {
					setDisplayCount((prev) => Math.min(prev + 50, filteredModels.length))
				}
			}
		}

		const scrollableDiv = tableContainerRef.current
		scrollableDiv?.addEventListener("scroll", handleScroll)
		return () => scrollableDiv?.removeEventListener("scroll", handleScroll)
	}, [displayCount, filteredModels.length])

	const columns: ColumnDef<Model>[] = [
		{
			accessorKey: "provider",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Provider
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const provider = getValue() as string
				return <div className="font-medium text-xs">{provider}</div>
			},
		},
		{
			accessorKey: "new",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						New
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const isNew = getValue() as boolean
				return isNew ? <span className="text-green-600 font-bold">✓</span> : ""
			},
		},
		{
			accessorKey: "name",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Model Name
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const name = getValue() as string
				return (
					<div className="font-mono text-xs max-w-xs truncate" title={name}>
						{name}
					</div>
				)
			},
		},
		{
			accessorKey: "contextWindow",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Context
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const tokens = getValue() as number
				return (
					<div className="text-xs tabular-nums">
						{tokens > 0 ? tokens.toLocaleString() : "-"}
					</div>
				)
			},
		},
		{
			accessorKey: "inputCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Input
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number
				return <div className="text-xs tabular-nums">${cost.toFixed(2)}</div>
			},
		},
		{
			accessorKey: "outputCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Output
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number
				return <div className="text-xs tabular-nums">${cost.toFixed(2)}</div>
			},
		},
		{
			accessorKey: "cacheReadCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Cache R
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number
				return <div className="text-xs tabular-nums">${cost.toFixed(2)}</div>
			},
		},
		{
			accessorKey: "cacheWriteCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Cache W
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number
				return <div className="text-xs tabular-nums">${cost.toFixed(2)}</div>
			},
		},
		{
			accessorKey: "maxOutputTokens",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Max Out
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const tokens = getValue() as number
				return (
					<div className="text-xs tabular-nums">
						{tokens > 0 ? tokens.toLocaleString() : "-"}
					</div>
				)
			},
		},
		{
			accessorKey: "modalities",
			header: () => <span className="text-xs font-semibold">Modalities</span>,
			cell: ({ getValue }) => {
				const modalities = getValue() as string[]
				const iconMap: Record<string, JSX.Element> = {
					text: <Type className="h-3 w-3" />,
					image: <Image className="h-3 w-3" />,
					pdf: <FileText className="h-3 w-3" />,
					video: <Video className="h-3 w-3" />,
					audio: <Volume2 className="h-3 w-3" />,
				}
				return (
					<div className="flex gap-1.5">
						{modalities.map((modality) => (
							<span
								key={modality}
								title={modality}
								className="text-muted-foreground"
							>
								{iconMap[modality] || modality}
							</span>
						))}
					</div>
				)
			},
		},
		{
			accessorKey: "capabilities",
			header: () => <span className="text-xs font-semibold">Capabilities</span>,
			cell: ({ getValue }) => {
				const capabilities = getValue() as string[]
				const iconMap: Record<string, JSX.Element> = {
					tools: <Wrench className="h-3 w-3" />,
					reasoning: <Brain className="h-3 w-3" />,
					knowledge: <BookOpen className="h-3 w-3" />,
				}
				return (
					<div className="flex gap-1.5">
						{capabilities.map((capability) => (
							<span
								key={capability}
								title={capability}
								className="text-muted-foreground"
							>
								{iconMap[capability] || capability}
							</span>
						))}
					</div>
				)
			},
		},
		{
			accessorKey: "openWeights",
			header: () => <span className="text-xs font-semibold">Open</span>,
			cell: ({ getValue }) => {
				const value = getValue() as boolean
				return <div className="text-xs">{value ? "✓" : "–"}</div>
			},
		},
		{
			accessorKey: "supportsTemperature",
			header: () => <span className="text-xs font-semibold">Temp</span>,
			cell: ({ getValue }) => {
				const value = getValue() as boolean
				return <div className="text-xs">{value ? "✓" : "–"}</div>
			},
		},
		{
			accessorKey: "supportsAttachments",
			header: () => <span className="text-xs font-semibold">Attach</span>,
			cell: ({ getValue }) => {
				const value = getValue() as boolean
				return <div className="text-xs">{value ? "✓" : "–"}</div>
			},
		},
		{
			accessorKey: "releaseDate",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Release
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const date = getValue() as string
				return <div className="text-xs">{date || "-"}</div>
			},
		},
		{
			accessorKey: "lastUpdated",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Updated
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const date = getValue() as string
				return <div className="text-xs">{date || "-"}</div>
			},
		},
		{
			accessorKey: "knowledge",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-xs font-semibold hover:bg-transparent"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Knowledge
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-1 h-3 w-3" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-1 h-3 w-3" />
						) : (
							<ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
						)}
					</Button>
				)
			},
			cell: ({ getValue }) => {
				const knowledge = getValue() as string
				return <div className="text-xs">{knowledge || "-"}</div>
			},
		},
		{
			id: "actions",
			header: () => <span className="text-xs font-semibold">Actions</span>,
			cell: ({ row }) => (
				<Button
					variant="outline"
					size="sm"
					className="h-7 px-3 text-xs"
					onClick={() => {
						setSelectedModel(row.original)
						setDetailsOpen(true)
					}}
				>
					Details
				</Button>
			),
		},
	]

	const table = useReactTable({
		data: displayedModels,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	})

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

	const modalityIcons: Record<string, JSX.Element> = {
		text: <Type className="h-4 w-4" />,
		image: <Image className="h-4 w-4" />,
		pdf: <FileText className="h-4 w-4" />,
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

	const capabilityIcons: Record<string, JSX.Element> = {
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
		<div>
			<Navbar
				providerCount={uniqueProviders}
				modelCount={(models || []).length}
				activeProviderCount={activeProviders}
				activeModelCount={(filteredModels || []).length}
			/>

			{/* Provider Filter Buttons */}
			<div className="border-b border-brand p-3 flex gap-2 overflow-x-auto">
				{providers.map((provider) => (
					<Button
						key={provider}
						variant={
							filters.providers.includes(provider) ? "default" : "outline"
						}
						size="sm"
						className="text-xs px-3 py-1.5 h-auto font-medium"
						onClick={() => toggleProvider(provider)}
					>
						{provider.charAt(0).toUpperCase() + provider.slice(1)}
					</Button>
				))}
			</div>

			{/* Year Filter Buttons */}
			<div className="border-b border-brand p-3 flex gap-2 overflow-x-auto">
				{availableYears.map((year) => (
					<Button
						key={year}
						variant={filters.years.includes(year) ? "default" : "outline"}
						size="sm"
						className="text-xs px-3 py-1.5 h-auto font-medium"
						onClick={() => toggleYear(year)}
					>
						{year}
					</Button>
				))}
			</div>

			{/* Modality Filter Buttons */}
			<div className="border-b border-brand p-3 flex gap-2 overflow-x-auto">
				{availableModalities.map((modality) => (
					<Button
						key={modality}
						variant={
							filters.modalities.includes(modality) ? "default" : "outline"
						}
						size="sm"
						className="px-3 py-1.5 h-auto"
						onClick={() => toggleModality(modality)}
						title={modality}
					>
						{modalityIcons[modality] || modality}
					</Button>
				))}
			</div>

			{/* Capability Filter Buttons */}
			<div className="border-b border-brand p-3 flex gap-2 overflow-x-auto">
				{availableCapabilities.map((capability) => (
					<Button
						key={capability}
						variant={
							filters.capabilities.includes(capability) ? "default" : "outline"
						}
						size="sm"
						className="px-3 py-1.5 h-auto"
						onClick={() => toggleCapability(capability)}
						title={capability}
					>
						{capabilityIcons[capability] || capability}
					</Button>
				))}
			</div>

			{/* Boolean Feature Filter Buttons */}
			<div className="border-b border-brand p-3 flex gap-2 overflow-x-auto">
				<Button
					variant={
						filters.openWeights === null
							? "outline"
							: filters.openWeights
								? "default"
								: "destructive"
					}
					size="sm"
					className="text-xs px-3 py-1.5 h-auto font-medium"
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
					className="text-xs px-3 py-1.5 h-auto font-medium"
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
					className="text-xs px-3 py-1.5 h-auto font-medium"
					onClick={() => toggleBooleanFilter("supportsAttachments")}
					title="Attachments Support"
				>
					Attachments
				</Button>
			</div>

			{/* Input/Output Cost Filter Sliders */}
			<div className="border-b border-brand p-3 flex gap-6 overflow-x-auto items-center">
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium whitespace-nowrap min-w-[120px]">
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
						min={0}
						step={10}
						className="w-40"
					/>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium whitespace-nowrap min-w-[120px]">
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
						min={0}
						step={10}
						className="w-40"
					/>
				</div>
			</div>

			{/* Cache Cost Filter Sliders */}
			<div className="border-b border-brand p-3 flex gap-6 overflow-x-auto items-center">
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium whitespace-nowrap min-w-[140px]">
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
						min={0}
						step={10}
						className="w-40"
					/>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-xs font-medium whitespace-nowrap min-w-[140px]">
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
						min={0}
						step={10}
						className="w-40"
					/>
				</div>
			</div>

			<ModelDetails
				model={selectedModel}
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
			/>

			{loading ? (
				<div className="p-4 text-center">Loading models...</div>
			) : error ? (
				<div className="p-4 text-center text-red-500">
					<p>{error}</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
					>
						Retry
					</button>
				</div>
			) : (
				<>
					<div className="p-4">
						<Input
							placeholder="Search models..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="max-w-md"
						/>

						<div
							ref={tableContainerRef}
							className="overflow-x-auto overflow-y-auto mt-4 max-h-[70vh] rounded-lg border border-brand bg-background shadow-sm"
						>
							<Table>
								<TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow
											key={headerGroup.id}
											className="border-b-2 border-brand hover:bg-transparent"
										>
											{headerGroup.headers.map((header) => (
												<TableHead
													key={header.id}
													style={{ width: header.getSize() || "auto" }}
													className="h-10 px-3 py-2"
												>
													{header.isPlaceholder
														? null
														: flexRender(
																header.column.columnDef.header,
																header.getContext(),
															)}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{table.getRowModel().rows?.length ? (
										table.getRowModel().rows.map((row) => (
											<TableRow
												key={row.id}
												data-state={row.getIsSelected() && "selected"}
												className="hover:bg-muted/50 transition-colors border-b border-brand/50"
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell key={cell.id} className="px-3 py-2.5">
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</TableCell>
												))}
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell
												colSpan={columns.length}
												className="h-24 text-center text-muted-foreground"
											>
												No results.
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					</div>

					{displayCount < (filteredModels?.length ?? 0) && (
						<div className="text-center py-3 px-4 text-sm text-muted-foreground bg-muted/30 border-t border-brand">
							Showing {displayCount} of {filteredModels?.length ?? 0} models •
							Scroll for more
						</div>
					)}
				</>
			)}
		</div>
	)
}
