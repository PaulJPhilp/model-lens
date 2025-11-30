-- Migration: Drop filter-related tables
-- Created: 2025-11-29
-- Purpose: Remove saved_filters and filter_runs tables as project focus shifts to data aggregation only
-- WARNING: This will permanently delete all filter data. Backup first if needed.

-- Drop filter_runs table first (has foreign key dependency)
DROP TABLE IF EXISTS filter_runs CASCADE;

-- Drop saved_filters table
DROP TABLE IF EXISTS saved_filters CASCADE;
