
'use client';

import * as React from 'react';
import { 
  ColumnDef, 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  getSortedRowModel, 
  SortingState, 
  getFilteredRowModel 
} from '@tanstack/react-table';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Model } from './types';
import { useRun } from '@effect/experimental/next';
import { createEstimatorEffect } from '@myorg/core/effects';
import { Effect } from 'effect';

export function ClientTable({ initialModels }: { initialModels: Model[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'inputCost', desc: true }]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [providerFilter, setProviderFilter] = React.useState('all');

  const columns: ColumnDef<Model>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'contextWindow', header: 'Context Window' },
    { accessorKey: 'inputCost', header: 'Input Cost' },
    { accessorKey: 'outputCost', header: 'Output Cost' },
    { 
      accessorKey: 'modalities',
      header: 'Modalities',
      cell: ({ row }) => (row.original.modalities.includes('vision') ? '👁️' : '')
    },
    {
      accessorKey: 'preview',
      header: 'Preview',
      cell: ({ row }) => <TokenLensPreview model={row.original} />
    }
  ];

  const table = useReactTable({
    data: initialModels,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
  });

  React.useEffect(() => {
    if (providerFilter !== 'all') {
      table.getColumn('provider')?.setFilterValue(providerFilter);
    } else {
      table.getColumn('provider')?.setFilterValue(undefined);
    }
  }, [providerFilter, table]);

  const providers = ['all', ...Array.from(new Set(initialModels.map(m => m.provider)))];

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter models..."
          value={globalFilter ?? ''}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <Select onValueChange={setProviderFilter} defaultValue="all">
          <SelectTrigger className="w-[180px] ml-4">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
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

function TokenLensPreview({ model }: { model: Model }) {
  const [prompt, setPrompt] = React.useState('Hello, world!');
  // const [runEstimate, { data, isRunning }] = useRun(createEstimatorEffect);

  const handleEstimate = () => {
    // runEstimate(model, prompt);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Preview</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{model.name} - TokenLens</DialogTitle>
        </DialogHeader>
        <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} />
        <Button onClick={handleEstimate}>
          Estimate Tokens/Cost
        </Button>
        {/* {data && (
          <div>
            <p>Tokens: {data.tokens}</p>
            <p>Cost: ${data.cost.toFixed(6)}</p>
          </div>
        )} */}
      </DialogContent>
    </Dialog>
  );
}
