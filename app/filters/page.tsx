'use client';

import { FilterList } from '@/components/FilterList';
import Link from 'next/link';

/**
 * Saved Filters Page
 *
 * Demonstrates the FilterList component which includes:
 * - List of saved filters with visibility filtering
 * - Create new filter (opens FilterEditor modal)
 * - Edit existing filter
 * - Delete filter
 * - Apply/evaluate filter
 * - View evaluation results
 */
export default function FiltersPage() {
  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">
          <Link href="/" className="hover:underline">
            🚀 ModelLens - AI Model Explorer v0.1.0
          </Link>
        </h1>
        <p className="text-blue-700 dark:text-blue-300">
          Manage and apply your saved filters to explore AI models.
        </p>
      </div>
      <div className="container mx-auto py-8 px-4">
        <FilterList
          onFilterApplied={(results) => {
            console.log('Filter applied:', results);
            console.log(`Found ${results.matchCount} matches`);
          }}
        />
      </div>
    </div>
  );
}
