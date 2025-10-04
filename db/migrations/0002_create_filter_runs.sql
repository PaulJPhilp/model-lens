-- Migration: Create filter_runs table
-- Purpose: Persist filter evaluation runs for history tracking and analytics
-- Author: Claude Code
-- Date: 2025-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create filter_runs table
CREATE TABLE IF NOT EXISTS filter_runs (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_id UUID NOT NULL,

  -- Execution metadata
  executed_by UUID NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_ms INTEGER,

  -- Filter snapshot (denormalized for history)
  filter_snapshot JSONB NOT NULL,

  -- Input parameters
  model_list JSONB,  -- Compact list of models evaluated (optional, can be large)
  limit_used INTEGER,
  model_ids_filter TEXT[],  -- Array of modelIds if filtering was used

  -- Results
  total_evaluated INTEGER NOT NULL,
  match_count INTEGER NOT NULL,
  results JSONB NOT NULL,  -- Array of evaluation results per model

  -- Artifacts (optional - for large outputs)
  artifacts JSONB,  -- { "fullResults": "s3://...", "modelList": "s3://..." }

  -- Indexing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_filter_runs_filter_id ON filter_runs(filter_id);
CREATE INDEX IF NOT EXISTS idx_filter_runs_executed_by ON filter_runs(executed_by);
CREATE INDEX IF NOT EXISTS idx_filter_runs_executed_at ON filter_runs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_filter_runs_filter_executed ON filter_runs(filter_id, executed_at DESC);

-- Add foreign key constraint (optional - can be removed if filter deletion should preserve runs)
-- ALTER TABLE filter_runs
--   ADD CONSTRAINT fk_filter_runs_filter_id
--   FOREIGN KEY (filter_id)
--   REFERENCES saved_filters(id)
--   ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE filter_runs IS 'Stores historical filter evaluation runs';
COMMENT ON COLUMN filter_runs.id IS 'Unique identifier for the run';
COMMENT ON COLUMN filter_runs.filter_id IS 'Reference to the filter that was executed';
COMMENT ON COLUMN filter_runs.executed_by IS 'User ID who executed the filter';
COMMENT ON COLUMN filter_runs.executed_at IS 'Timestamp when the filter was executed';
COMMENT ON COLUMN filter_runs.duration_ms IS 'Execution duration in milliseconds';
COMMENT ON COLUMN filter_runs.filter_snapshot IS 'Snapshot of filter rules at execution time';
COMMENT ON COLUMN filter_runs.model_list IS 'Compact list of models that were evaluated (optional)';
COMMENT ON COLUMN filter_runs.limit_used IS 'Limit parameter used for evaluation';
COMMENT ON COLUMN filter_runs.model_ids_filter IS 'Array of model IDs if filtering was applied';
COMMENT ON COLUMN filter_runs.total_evaluated IS 'Total number of models evaluated';
COMMENT ON COLUMN filter_runs.match_count IS 'Number of models that matched';
COMMENT ON COLUMN filter_runs.results IS 'Array of per-model evaluation results';
COMMENT ON COLUMN filter_runs.artifacts IS 'References to external storage for large outputs';

-- Grant permissions (adjust based on your setup)
-- GRANT SELECT, INSERT ON filter_runs TO your_app_role;
