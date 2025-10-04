'use client';

import { FilterList } from '@/components/FilterList';

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
    <div className="container mx-auto py-8 px-4">
      <FilterList
        onFilterApplied={(results) => {
          console.log('Filter applied:', results);
          console.log(`Found ${results.matchCount} matches`);
        }}
      />
    </div>
  );
}
