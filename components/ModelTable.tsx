'use client';

import { useEffect, useState } from 'react';

import { useRun } from '@effect/experimental';

import { Effect } from 'effect';

import { ModelService, ModelServiceLive } from '../lib/services/ModelService';

import { FilterService, FilterServiceLive } from '../lib/services/FilterService';

import { AppLayer } from '../lib/layers';

import { Model } from '../lib/types';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { Input } from './ui/input';

import { Select } from './ui/select';

import { Slider } from './ui/slider';

import { Button } from './ui/button';

import { Navbar } from './Navbar';

export function ModelTable() {

  const [models, setModels] = useState<Model[]>([]);

  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState({ provider: [], costRange: [0, 10], modalities: [], capabilities: [] });

  const run = useRun();

  useEffect(() => {

    const fetchModels = async () => {

      try {

        const result = await run(

          Effect.gen(function* () {

            const service = yield* ModelService;

            return yield* service.fetchModels;

          }).pipe(Effect.provide(ModelServiceLive))

        );

        setModels(result);

        setFilteredModels(result);

      } catch (error) {

        console.error(error);

      }

    };

    fetchModels();

  }, [run]);

  useEffect(() => {

    const applyFilters = async () => {

      try {

        const result = await run(

          Effect.gen(function* () {

            const service = yield* FilterService;

            return yield* service.applyFilters(models, search, filters);

          }).pipe(Effect.provide(FilterServiceLive))

        );

        setFilteredModels(result);

      } catch (error) {

        console.error(error);

      }

    };

    applyFilters();

  }, [models, search, filters, run]);

  // Add UI for search, filters

  return (

    <div>

      <Navbar />

      <div className="p-4">

        <Input

          placeholder="Search models..."

          value={search}

          onChange={(e) => setSearch(e.target.value)}

        />

        {/* Add filters UI */}

        <Table>

          <TableHeader>

            <TableRow>

              <TableHead style={{ width: '200px' }}>Model Name</TableHead>

              <TableHead style={{ width: '100px' }}>Provider</TableHead>

              <TableHead style={{ width: '120px' }}>Context Window</TableHead>

              <TableHead style={{ width: '100px' }}>Input Cost</TableHead>

              <TableHead style={{ width: '100px' }}>Modalities</TableHead>

              <TableHead style={{ width: '120px' }}>Capabilities</TableHead>

              <TableHead style={{ width: '100px' }}>Release Date</TableHead>

            </TableRow>

          </TableHeader>

          <TableBody>

            {filteredModels.map((model) => (

              <TableRow key={model.name}>

                <TableCell>{model.name}</TableCell>

                <TableCell>{model.provider}</TableCell>

                <TableCell>{model.contextWindow}</TableCell>

                <TableCell>${model.inputCost}</TableCell>

                <TableCell>{model.modalities.join(', ')}</TableCell>

                <TableCell>{model.capabilities.join(', ')}</TableCell>

                <TableCell>{model.releaseDate}</TableCell>

              </TableRow>

            ))}

          </TableBody>

        </Table>

      </div>

    </div>

  );

}
