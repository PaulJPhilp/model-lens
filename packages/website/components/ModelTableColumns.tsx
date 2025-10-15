import type { ColumnDef } from "@tanstack/react-table"
import {
	BookOpen,
	Brain,
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	FileText,
	Image,
	Type,
	Video,
	Volume2,
	Wrench,
} from "lucide-react"
import type * as React from "react"
import type { Model } from "../lib/types"
import { Button } from "./ui/button"

export const createModelTableColumns = (
	_selectedModel: Model | null,
	setSelectedModel: (model: Model) => void,
	setDetailsOpen: (open: boolean) => void,
): ColumnDef<Model>[] => [
	{
		accessorKey: "id",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Model
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
	},
	{
		accessorKey: "provider",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Provider
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
	},
	{
		accessorKey: "new",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					New
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
		cell: ({ getValue }) => {
			const isNew = getValue() as boolean
			return isNew ? "✓" : ""
		},
	},
	{
		accessorKey: "inputCost",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Input
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
		cell: ({ getValue }) => {
			const cost = getValue() as number
			return `$${cost.toFixed(2)}`
		},
	},
	{
		accessorKey: "outputCost",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Output
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
		cell: ({ getValue }) => {
			const cost = getValue() as number
			return `$${cost.toFixed(2)}`
		},
	},
	{
		accessorKey: "cacheReadCost",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Cache Read
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
		cell: ({ getValue }) => {
			const cost = getValue() as number
			return `$${cost.toFixed(2)}`
		},
	},
	{
		accessorKey: "cacheWriteCost",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Cache Write
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
		cell: ({ getValue }) => {
			const cost = getValue() as number
			return `$${cost.toFixed(2)}`
		},
	},
	{
		accessorKey: "contextWindow",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Context
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
		cell: ({ getValue }) => {
			const tokens = getValue() as number
			return tokens > 0 ? tokens.toLocaleString() : "-"
		},
	},
	{
		accessorKey: "modalities",
		header: "Modalities",
		cell: ({ getValue }) => {
			const modalities = getValue() as string[]
			const iconMap: Record<string, React.ReactElement> = {
				text: <Type className="h-2 w-2" />,
				image: <Image className="h-2 w-2" />,
				file: <FileText className="h-2 w-2" />,
				video: <Video className="h-2 w-2" />,
				audio: <Volume2 className="h-2 w-2" />,
			}
			return (
				<div className="flex gap-1">
					{modalities.map((modality, idx) => (
						<span key={idx} title={modality}>
							{iconMap[modality] || modality}
						</span>
					))}
				</div>
			)
		},
	},
	{
		accessorKey: "capabilities",
		header: "Capabilities",
		cell: ({ getValue }) => {
			const capabilities = getValue() as string[]
			const iconMap: Record<string, React.ReactElement> = {
				tools: <Wrench className="h-2 w-2" />,
				reasoning: <Brain className="h-2 w-2" />,
				knowledge: <BookOpen className="h-2 w-2" />,
			}
			return (
				<div className="flex gap-1">
					{capabilities.map((capability, idx) => (
						<span key={idx} title={capability}>
							{iconMap[capability] || capability}
						</span>
					))}
				</div>
			)
		},
	},
	{
		accessorKey: "openWeights",
		header: "Open Weights",
		cell: ({ getValue }) => ((getValue() as boolean) ? "Yes" : "No"),
	},
	{
		accessorKey: "supportsTemperature",
		header: "Temperature",
		cell: ({ getValue }) => ((getValue() as boolean) ? "Yes" : "No"),
	},
	{
		accessorKey: "supportsAttachments",
		header: "Attachments",
		cell: ({ getValue }) => ((getValue() as boolean) ? "Yes" : "No"),
	},
	{
		accessorKey: "releaseDate",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Release
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
	},
	{
		accessorKey: "lastUpdated",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="h-auto p-0 text-[8px] font-bold"
				>
					Updated
					{column.getIsSorted() === "asc" ? (
						<ChevronUp className="ml-1 h-2 w-2" />
					) : column.getIsSorted() === "desc" ? (
						<ChevronDown className="ml-1 h-2 w-2" />
					) : (
						<ChevronsUpDown className="ml-1 h-2 w-2" />
					)}
				</Button>
			)
		},
	},
	{
		id: "actions",
		header: "Actions",
		cell: ({ row }) => (
			<Button
				size="sm"
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
