-- Enable UUID extension (pgcrypto is widely available)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create saved_filters table
CREATE TABLE IF NOT EXISTS saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  team_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  rules JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count BIGINT NOT NULL DEFAULT 0
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_saved_filters_owner_id
  ON saved_filters(owner_id);

CREATE INDEX IF NOT EXISTS idx_saved_filters_team_visibility
  ON saved_filters(team_id, visibility);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_saved_filters_updated_at
  ON saved_filters;

CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
