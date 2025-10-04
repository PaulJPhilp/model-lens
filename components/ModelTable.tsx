"use client";

import { Effect } from "effect";
import { useEffect, useState, useRef } from "react";

import { AppLayer } from "../lib/layers";
import { FilterService, type Filters } from "../lib/services/FilterService";
import { ModelService } from "../lib/services/ModelService";
import type { Model } from "../lib/types";

import { Navbar } from "./Navbar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";

import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, Type, Image, FileText, Video, Volume2, Wrench, Brain, BookOpen } from "lucide-react";

import { ModelDetails } from "./ModelDetails";

function runEffect<A, E>(effect: Effect.Effect<A, E, unknown>): Promise<A> {
	return Effect.runPromise(
		effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, E, never>
	)
}

export function ModelTable() {
	const [models, setModels] = useState<Model[]>([]);
	const [filteredModels, setFilteredModels] = useState<Model[]>([]);
	const [displayedModels, setDisplayedModels] = useState<Model[]>([]);
	const [displayCount, setDisplayCount] = useState(50);
	const [search, setSearch] = useState("");
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
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [loading, setLoading] = useState(false);
	const [selectedModel, setSelectedModel] = useState<Model | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const fetchModels = async () => {
			setLoading(true);
			try {
				const result = await runEffect(
					Effect.gen(function* () {
						const service = yield* ModelService;
						return yield* service.fetchModels;
					}),
				);
				setModels(result);
				setFilteredModels(result);
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};
		fetchModels();
	}, []);

	useEffect(() => {
		const applyFilters = async () => {
			try {
				const result = await runEffect(
					Effect.gen(function* () {
						const service = yield* FilterService;
						return yield* service.applyFilters(models, search, filters);
					}),
				);
				setFilteredModels(result);
				setDisplayCount(50); // Reset display count when filters change
			} catch (error) {
				console.error(error);
			}
		};
		applyFilters();
	}, [models, search, filters]);

	// Update displayed models when filtered models or display count changes
	useEffect(() => {
		setDisplayedModels(filteredModels.slice(0, displayCount));
	}, [filteredModels, displayCount]);

	// Infinite scroll handler
	useEffect(() => {
		const handleScroll = () => {
			const scrollableDiv = tableContainerRef.current;
			if (!scrollableDiv) return;

			const { scrollTop, scrollHeight, clientHeight } = scrollableDiv;
			if (scrollHeight - scrollTop <= clientHeight * 1.5) {
				if (displayCount < filteredModels.length) {
					setDisplayCount(prev => Math.min(prev + 50, filteredModels.length));
				}
			}
		};

		const scrollableDiv = tableContainerRef.current;
		scrollableDiv?.addEventListener('scroll', handleScroll);
		return () => scrollableDiv?.removeEventListener('scroll', handleScroll);
	}, [displayCount, filteredModels.length]);

	const columns: ColumnDef<Model>[] = [
		{
			accessorKey: "provider",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Provider
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
		},
		{
			accessorKey: "new",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						New
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
			cell: ({ getValue }) => {
				const isNew = getValue() as boolean;
				return isNew ? "✓" : "";
			},
		},
		{
			accessorKey: "name",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Model Name
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
		},
		{
			accessorKey: "contextWindow",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Context Window
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
		},
		{
			accessorKey: "inputCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Input Cost
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number;
				return cost > 0 ? `$${cost.toFixed(2)}` : "-";
			},
		},
		{
			accessorKey: "outputCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Output Cost
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number;
				return cost > 0 ? `$${cost.toFixed(2)}` : "-";
			},
		},
		{
			accessorKey: "cacheReadCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Cache Read
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number;
				return cost > 0 ? `$${cost.toFixed(2)}` : "-";
			},
		},
		{
			accessorKey: "cacheWriteCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Cache Write
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
			cell: ({ getValue }) => {
				const cost = getValue() as number;
				return cost > 0 ? `$${cost.toFixed(2)}` : "-";
			},
		},
		{
			accessorKey: "maxOutputTokens",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Max Output
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
			cell: ({ getValue }) => {
				const tokens = getValue() as number;
				return tokens > 0 ? tokens.toLocaleString() : "-";
			},
		},
		{
			accessorKey: "modalities",
			header: "Modalities",
			cell: ({ getValue }) => {
				const modalities = getValue() as string[];
				const iconMap: Record<string, JSX.Element> = {
					text: <Type className="h-2 w-2" />,
					image: <Image className="h-2 w-2" />,
					pdf: <FileText className="h-2 w-2" />,
					video: <Video className="h-2 w-2" />,
					audio: <Volume2 className="h-2 w-2" />,
				};
				return (
					<div className="flex gap-1">
						{modalities.map((modality, idx) => (
							<span key={idx} title={modality}>{iconMap[modality] || modality}</span>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: "capabilities",
			header: "Capabilities",
			cell: ({ getValue }) => {
				const capabilities = getValue() as string[];
				const iconMap: Record<string, JSX.Element> = {
					tools: <Wrench className="h-2 w-2" />,
					reasoning: <Brain className="h-2 w-2" />,
					knowledge: <BookOpen className="h-2 w-2" />,
				};
				return (
					<div className="flex gap-1">
						{capabilities.map((capability, idx) => (
							<span key={idx} title={capability}>{iconMap[capability] || capability}</span>
						))}
					</div>
				);
			},
		},
		{
			accessorKey: "openWeights",
			header: "Open Weights",
			cell: ({ getValue }) => (getValue() as boolean ? "Yes" : "No"),
		},
		{
			accessorKey: "supportsTemperature",
			header: "Temperature",
			cell: ({ getValue }) => (getValue() as boolean ? "Yes" : "No"),
		},
		{
			accessorKey: "supportsAttachments",
			header: "Attachments",
			cell: ({ getValue }) => (getValue() as boolean ? "Yes" : "No"),
		},
		{
			accessorKey: "releaseDate",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Release Date
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
		},
		{
			accessorKey: "lastUpdated",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Last Updated
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
		},
		{
			accessorKey: "knowledge",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-[8px]"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Knowledge
						{column.getIsSorted() === "asc" ? (
							<ChevronUp className="ml-0 !h-2 !w-2" />
						) : column.getIsSorted() === "desc" ? (
							<ChevronDown className="ml-0 !h-2 !w-2" />
						) : (
							<ChevronsUpDown className="ml-0 !h-2 !w-2" />
						)}
					</Button>
				);
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => (
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						setSelectedModel(row.original);
						setDetailsOpen(true);
					}}
				>
					Details
				</Button>
			),
		},
	];

	const table = useReactTable({
		data: displayedModels,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	});

	// Extract unique years from models
	const availableYears = Array.from(
		new Set(
			models
				.map((m) => {
					if (!m.releaseDate) return null;
					return new Date(m.releaseDate).getFullYear();
				})
				.filter((year): year is number => year !== null)
		)
	).sort((a, b) => b - a);

	const toggleYear = (year: number) => {
		setFilters((prev) => ({
			...prev,
			years: prev.years.includes(year)
				? prev.years.filter((y) => y !== year)
				: [...prev.years, year],
		}));
	};

	// Extract unique modalities from models
	const availableModalities = Array.from(
		new Set(models.flatMap((m) => m.modalities))
	).sort();

	const toggleModality = (modality: string) => {
		setFilters((prev) => ({
			...prev,
			modalities: prev.modalities.includes(modality)
				? prev.modalities.filter((m) => m !== modality)
				: [...prev.modalities, modality],
		}));
	};

	const modalityIcons: Record<string, JSX.Element> = {
		text: <Type className="h-4 w-4" />,
		image: <Image className="h-4 w-4" />,
		pdf: <FileText className="h-4 w-4" />,
		video: <Video className="h-4 w-4" />,
		audio: <Volume2 className="h-4 w-4" />,
	};

	// Extract unique capabilities from models
	const availableCapabilities = Array.from(
		new Set(models.flatMap((m) => m.capabilities))
	).sort();

	const toggleCapability = (capability: string) => {
		setFilters((prev) => ({
			...prev,
			capabilities: prev.capabilities.includes(capability)
				? prev.capabilities.filter((c) => c !== capability)
				: [...prev.capabilities, capability],
		}));
	};

	const capabilityIcons: Record<string, JSX.Element> = {
		tools: <Wrench className="h-4 w-4" />,
		reasoning: <Brain className="h-4 w-4" />,
		knowledge: <BookOpen className="h-4 w-4" />,
	};

	// Provider filtering
	const providers = ['openai', 'anthropic', 'google', 'grok', 'deepseek', 'kimi'];

	const toggleProvider = (provider: string) => {
		setFilters((prev) => ({
			...prev,
			providers: prev.providers.includes(provider)
				? prev.providers.filter((p) => p !== provider)
				: [...prev.providers, provider],
		}));
	};

	const toggleBooleanFilter = (key: 'openWeights' | 'supportsTemperature' | 'supportsAttachments') => {
		setFilters((prev) => ({
			...prev,
			[key]: prev[key] === null ? true : prev[key] === true ? false : null,
		}));
	};

	// Calculate unique provider count
	const uniqueProviders = Array.from(new Set(models.map(m => m.provider))).length;
	const activeProviders = Array.from(new Set(filteredModels.map(m => m.provider))).length;

	return (
		<div>
			<Navbar
				providerCount={uniqueProviders}
				modelCount={models.length}
				activeProviderCount={activeProviders}
				activeModelCount={filteredModels.length}
			/>

			{/* Provider Filter Buttons */}
			<div className="border-b border-brand p-2 flex gap-2 overflow-x-auto">
				{providers.map((provider) => (
					<Button
						key={provider}
						variant={filters.providers.includes(provider) ? "default" : "outline"}
						size="sm"
						className="text-xs px-2 py-1 h-auto"
						onClick={() => toggleProvider(provider)}
					>
						{provider.charAt(0).toUpperCase() + provider.slice(1)}
					</Button>
				))}
			</div>

			{/* Year Filter Buttons */}
			<div className="border-b border-brand p-2 flex gap-2 overflow-x-auto">
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

			{/* Modality Filter Buttons */}
			<div className="border-b border-brand p-2 flex gap-2 overflow-x-auto">
				{availableModalities.map((modality) => (
					<Button
						key={modality}
						variant={filters.modalities.includes(modality) ? "default" : "outline"}
						size="sm"
						className="px-2 py-1 h-auto"
						onClick={() => toggleModality(modality)}
						title={modality}
					>
						{modalityIcons[modality] || modality}
					</Button>
				))}
			</div>

			{/* Capability Filter Buttons */}
			<div className="border-b border-brand p-2 flex gap-2 overflow-x-auto">
				{availableCapabilities.map((capability) => (
					<Button
						key={capability}
						variant={filters.capabilities.includes(capability) ? "default" : "outline"}
						size="sm"
						className="px-2 py-1 h-auto"
						onClick={() => toggleCapability(capability)}
						title={capability}
					>
						{capabilityIcons[capability] || capability}
					</Button>
				))}
			</div>

			{/* Boolean Feature Filter Buttons */}
			<div className="border-b border-brand p-2 flex gap-2 overflow-x-auto">
				<Button
					variant={filters.openWeights === null ? "outline" : filters.openWeights ? "default" : "destructive"}
					size="sm"
					className="text-xs px-2 py-1 h-auto"
					onClick={() => toggleBooleanFilter('openWeights')}
					title="Open Weights"
				>
					Open Weights
				</Button>
				<Button
					variant={filters.supportsTemperature === null ? "outline" : filters.supportsTemperature ? "default" : "destructive"}
					size="sm"
					className="text-xs px-2 py-1 h-auto"
					onClick={() => toggleBooleanFilter('supportsTemperature')}
					title="Temperature Support"
				>
					Temperature
				</Button>
				<Button
					variant={filters.supportsAttachments === null ? "outline" : filters.supportsAttachments ? "default" : "destructive"}
					size="sm"
					className="text-xs px-2 py-1 h-auto"
					onClick={() => toggleBooleanFilter('supportsAttachments')}
					title="Attachments Support"
				>
					Attachments
				</Button>
			</div>

			{/* Input/Output Cost Filter Sliders */}
			<div className="border-b border-brand p-2 flex gap-4 overflow-x-auto items-center">
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">Input: ${filters.inputCostRange[0].toFixed(0)}-${filters.inputCostRange[1].toFixed(0)}</span>
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
						className="w-32"
					/>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">Output: ${filters.outputCostRange[0].toFixed(0)}-${filters.outputCostRange[1].toFixed(0)}</span>
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
						className="w-32"
					/>
				</div>
			</div>

			{/* Cache Cost Filter Sliders */}
			<div className="border-b border-brand p-2 flex gap-4 overflow-x-auto items-center">
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">Cache Read: ${filters.cacheReadCostRange[0].toFixed(0)}-${filters.cacheReadCostRange[1].toFixed(0)}</span>
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
						className="w-32"
					/>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs whitespace-nowrap">Cache Write: ${filters.cacheWriteCostRange[0].toFixed(0)}-${filters.cacheWriteCostRange[1].toFixed(0)}</span>
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
						className="w-32"
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
			) : (
				<>
					<div className="p-4">
						<Input
							placeholder="Search models..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>

						<div ref={tableContainerRef} className="overflow-x-auto overflow-y-auto mt-4 max-h-[70vh]">
							<Table className="table-compact">
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												style={{ width: header.getSize() || "auto" }}
												className="!h-5 !py-0 !px-1 !text-[8px] !leading-[1]"
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
											className="!border-b-0"
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell
													key={cell.id}
													className="table-data !py-0 !px-1 !text-[8px] !leading-[1]"
												>
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
											className="h-24 text-center"
										>
											No results.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
						</div>
					</div>

					{displayCount < filteredModels.length && (
						<div className="text-center py-2 text-sm text-gray-500">
							Showing {displayCount} of {filteredModels.length} models
						</div>
					)}
				</>
			)}
		</div>
	);
}
