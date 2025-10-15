-- Create model_snapshots table for storing historical model data
CREATE TABLE IF NOT EXISTS model_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id UUID NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create model_syncs table for tracking sync operations
CREATE TABLE IF NOT EXISTS model_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  total_fetched INTEGER,
  total_stored INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_snapshots_sync_id ON model_snapshots(sync_id);
CREATE INDEX IF NOT EXISTS idx_model_snapshots_synced_at ON model_snapshots(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_snapshots_model_id ON model_snapshots USING gin ((model_data->>'id'));
CREATE INDEX IF NOT EXISTS idx_model_snapshots_provider ON model_snapshots USING gin ((model_data->>'provider'));

CREATE INDEX IF NOT EXISTS idx_model_syncs_started_at ON model_syncs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_syncs_status ON model_syncs(status);

-- Add comments for documentation
COMMENT ON TABLE model_snapshots IS 'Stores historical snapshots of model data from external APIs';
COMMENT ON TABLE model_syncs IS 'Tracks model data synchronization operations';
COMMENT ON COLUMN model_snapshots.sync_id IS 'Groups models from the same sync operation';
COMMENT ON COLUMN model_snapshots.model_data IS 'Complete model information stored as JSONB';
