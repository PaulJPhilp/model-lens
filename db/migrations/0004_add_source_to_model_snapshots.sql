-- Add source column to model_snapshots table
ALTER TABLE model_snapshots ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'models.dev';

-- Create index for the new source column
CREATE INDEX IF NOT EXISTS idx_model_snapshots_source ON model_snapshots(source);

-- Update comment for the table
COMMENT ON COLUMN model_snapshots.source IS 'Data source for the model data (models.dev or openrouter)';
