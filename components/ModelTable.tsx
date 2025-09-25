import { useEffect, useState } from 'react';

import { Effect } from 'effect';

import { ModelService } from '../lib/services/ModelService';

import { ModelServiceLive } from '../lib/services/ModelServiceLive';

import { FilterService, type Filters } from '../lib/services/FilterService';

import { FilterServiceLive } from '../lib/services/FilterServiceLive';

import { AppLayer } from '../lib/layers';

import type { Model } from '../lib/types';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { Input } from './ui/input';

import { Button } from './ui/button';

import { Navbar } from './Navbar';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { Slider } from './ui/slider';

import { useReactTable, getCoreRowModel, getSortedRowModel, type ColumnDef, flexRender, type SortingState } from '@tanstack/react-table';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const runEffect = <A, E>(effect: Effect.Effect<A, E, any>) => Effect.runPromise(effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, E, never>);

export function ModelTable() {

  const [models, setModels] = useState<Model[]>([]);

  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState<Filters>({ provider: null, costRange: [0, 10], modalities: [], capabilities: [] });

  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {

    const fetchModels = async () => {

      try {

        const result = await runEffect(

          Effect.gen(function* () {

            const service = yield* ModelService;

            return yield* service.fetchModels;

          })

        );

        setModels(result);

        setFilteredModels(result);

      } catch (error) {

        console.error(error);

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

          })

        );

        setFilteredModels(result);

      } catch (error) {

        console.error(error);

      }

    };

    applyFilters();

  }, [models, search, filters]);

  const columns: ColumnDef<Model>[] = [

    {

      accessorKey: 'name',

      header: ({ column }) => {

        return (

          <Button

            variant="ghost"

            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}

          >

            Model Name

            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> :

             column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> :

             <ChevronsUpDown className="ml-2 h-4 w-4" />}

          </Button>

        )

      },

    },

    {

      accessorKey: 'provider',

      header: ({ column }) => {

        return (

          <Button

            variant="ghost"

            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}

          >

            Provider

            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> :

             column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> :

             <ChevronsUpDown className="ml-2 h-4 w-4" />}

          </Button>

        )

      },

    },

    {

      accessorKey: 'contextWindow',

      header: ({ column }) => {

        return (

          <Button

            variant="ghost"

            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}

          >

            Context Window

            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> :

             column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> :

             <ChevronsUpDown className="ml-2 h-4 w-4" />}

          </Button>

        )

      },

    },

    {

      accessorKey: 'inputCost',

      header: ({ column }) => {

        return (

          <Button

            variant="ghost"

            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}

          >

            Input Cost

            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> :

             column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> :

             <ChevronsUpDown className="ml-2 h-4 w-4" />}

          </Button>

        )

      },

    },

    {

      accessorKey: 'modalities',

      header: 'Modalities',

      cell: ({ getValue }) => (getValue() as string[]).join(', '),

    },

    {

      accessorKey: 'capabilities',

      header: 'Capabilities',

      cell: ({ getValue }) => (getValue() as string[]).join(', '),

    },

    {

      accessorKey: 'releaseDate',

      header: ({ column }) => {

        return (

          <Button

            variant="ghost"

            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}

          >

            Release Date

            {column.getIsSorted() === "asc" ? <ChevronUp className="ml-2 h-4 w-4" /> :

             column.getIsSorted() === "desc" ? <ChevronDown className="ml-2 h-4 w-4" /> :

             <ChevronsUpDown className="ml-2 h-4 w-4" />}

          </Button>

        )

      },

    },

  ];

  const table = useReactTable({

    data: filteredModels,

    columns,

    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),

    onSortingChange: setSorting,

    state: {

      sorting,

    },

  });

  return (

    <div>

      <Navbar />

      <div className="p-4">

        <Input

          placeholder="Search models..."

          value={search}

          onChange={(e) => setSearch(e.target.value)}

        />
        {/* Filters */}

        <div className="flex gap-4 mt-4">
          <Select value={filters.provider || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, provider: value || null }))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {[...new Set(models.map(m => m.provider))].map(provider => (
                <SelectItem key={provider} value={provider}>{provider}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">

            <span>Cost: ${filters.costRange[0]} - ${filters.costRange[1]}</span>
            <Slider

              value={filters.costRange}

              onValueChange={(value) => setFilters(prev => ({ ...prev, costRange: value as [number, number] }))}

              max={10}

              min={0}

              step={0.1}

              className="w-32"

            />

          </div>

          <Input

            placeholder="Modalities (comma separated)"

            value={filters.modalities.join(', ')}

            onChange={(e) => setFilters(prev => ({ ...prev, modalities: e.target.value.split(',').map(s => s.trim()) }))}

          />

          <Input

            placeholder="Capabilities (comma separated)"

            value={filters.capabilities.join(', ')}

            onChange={(e) => setFilters(prev => ({ ...prev, capabilities: e.target.value.split(',').map(s => s.trim()) }))}

          />

        </div>

        <Table>

          <TableHeader>

            {table.getHeaderGroups().map((headerGroup) => (

              <TableRow key={headerGroup.id}>

                {headerGroup.headers.map((header) => (

                  <TableHead key={header.id} style={{ width: header.getSize() || 'auto' }}>

                    {header.isPlaceholder

                      ? null

                      : flexRender(

                          header.column.columnDef.header,

                          header.getContext()

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

                >

                  {row.getVisibleCells().map((cell) => (

                    <TableCell key={cell.id}>

                      {flexRender(cell.column.columnDef.cell, cell.getContext())}

                    </TableCell>

                  ))}

                </TableRow>

              ))

            ) : (

              <TableRow>

                <TableCell colSpan={columns.length} className="h-24 text-center">

                  No results.

                </TableCell>

              </TableRow>

            )}

          </TableBody>

        </Table>

      </div>

    </div>

  );

}
