"use client"

import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useRef, useState } from "react"
import { useModelData } from "../lib/hooks/useModelData"
import { useModelFilters } from "../lib/hooks/useModelFilters"
import type { Model } from "../lib/types"
import { ModelDetails } from "./ModelDetails"
import { createModelTableColumns } from "./ModelTableColumns"
import { ModelTableFilters } from "./ModelTableFilters"
import { Navbar } from "./Navbar"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table"

export function ModelTable() {
	const { models, loading, error } = useModelData()
	const { filteredModels, search, setSearch, filters, setFilters } =
		useModelFilters(models)

	const [sorting, setSorting] = useState<SortingState>([])
	const [selectedModel, setSelectedModel] = useState<Model | null>(null)
	const [detailsOpen, setDetailsOpen] = useState(false)
	const tableContainerRef = useRef<HTMLDivElement>(null)

	// Create virtualizer for the table rows
	const virtualizer = useVirtualizer({
		count: filteredModels.length,
		getScrollElement: () => tableContainerRef.current,
		estimateSize: () => 35, // Estimated row height
		overscan: 10, // Render 10 extra rows for smooth scrolling
	})

	// Get the virtual items
	const virtualItems = virtualizer.getVirtualItems()

	const columns = createModelTableColumns(
		selectedModel,
		setSelectedModel,
		setDetailsOpen,
	)

	const table = useReactTable({
		data: filteredModels,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	})

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
					<p className="mt-4 text-gray-600">Loading models...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="text-red-500 text-xl mb-4">⚠️ Error</div>
					<p className="text-gray-600">{error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-white">
			<Navbar />
			<div className="container mx-auto px-4 py-8">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						AI Model Database
					</h1>
					<p className="text-gray-600">
						Discover and compare {models.length} AI models from leading
						providers
					</p>
				</div>

				{models.length > 0 && (
					<>
						<ModelTableFilters
							models={models}
							filteredModels={filteredModels}
							search={search}
							setSearch={setSearch}
							filters={filters}
							setFilters={setFilters}
						/>

						<div className="mt-6">
							<div className="flex justify-between items-center mb-4">
								<div className="text-sm text-gray-600">
									Showing {filteredModels.length} of {models.length} models
								</div>
							</div>

							<div
								ref={tableContainerRef}
								className="overflow-auto border border-gray-200 rounded-lg"
								style={{ height: "70vh" }}
							>
								<div
									style={{
										height: `${virtualizer.getTotalSize()}px`,
										width: "100%",
										position: "relative",
									}}
								>
									{/* Fixed Header */}
									<Table className="table-compact">
										<TableHeader className="sticky top-0 bg-white z-10">
											{table.getHeaderGroups().map((headerGroup) => (
												<TableRow key={headerGroup.id}>
													{headerGroup.headers.map((header) => (
														<TableHead
															key={header.id}
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
									</Table>

									{/* Virtualized Rows */}
									<div
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
										}}
									>
										<Table className="table-compact">
											<TableBody>
												{virtualItems.map((virtualItem) => {
													const model = filteredModels[virtualItem.index]
													return (
														<TableRow
															key={virtualItem.key}
															data-state=""
															className="!border-b-0"
															style={{ height: `${virtualItem.size}px` }}
														>
															{table.getVisibleFlatColumns().map((column) => {
																const cell = column.accessorFn
																	? column.accessorFn(model, virtualItem.index)
																	: (model as any)[column.id]
																return (
																	<TableCell
																		key={column.id}
																		className="table-data !py-0 !px-1 !text-[8px] !leading-[1]"
																	>
																		{flexRender(column.columnDef.cell, {
																			cell: { getValue: () => cell },
																			row: { original: model },
																			column,
																			table,
																		} as any)}
																	</TableCell>
																)
															})}
														</TableRow>
													)
												})}
											</TableBody>
										</Table>
									</div>
								</div>
							</div>

							<div className="text-center py-2 text-sm text-gray-500">
								Virtualized table rendering {filteredModels?.length ?? 0} models
							</div>
						</div>
					</>
				)}
			</div>

			{selectedModel && (
				<ModelDetails
					model={selectedModel}
					open={detailsOpen}
					onOpenChange={setDetailsOpen}
				/>
			)}
		</div>
	)
}
