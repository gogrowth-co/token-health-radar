
-- Table 1: agent_scans (cached scan results)
CREATE TABLE public.agent_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  raw_data JSONB,
  scores JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cache lookups
CREATE INDEX idx_agent_scans_lookup ON public.agent_scans (chain, agent_id, created_at DESC);

-- RLS
ALTER TABLE public.agent_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert agent scans" ON public.agent_scans FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read agent scans" ON public.agent_scans FOR SELECT USING (true);
CREATE POLICY "Service role full access agent_scans" ON public.agent_scans FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Table 2: agent_directory_cache
CREATE TABLE public.agent_directory_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agents_data JSONB,
  chain_filter TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_directory_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for directory cache" ON public.agent_directory_cache FOR SELECT USING (true);
CREATE POLICY "Service role full access directory cache" ON public.agent_directory_cache FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Add agent scan counter to subscribers (independent from token scans)
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS agent_scans_used INTEGER DEFAULT 0;
