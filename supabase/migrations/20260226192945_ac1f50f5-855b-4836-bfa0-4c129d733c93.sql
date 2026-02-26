
-- Create agent_tokens table
CREATE TABLE public.agent_tokens (
  coingecko_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  token_address TEXT,
  chain_id TEXT,
  image_url TEXT,
  current_price_usd NUMERIC,
  market_cap_usd NUMERIC,
  volume_24h_usd NUMERIC,
  price_change_24h_pct NUMERIC,
  market_cap_rank INTEGER,
  category TEXT DEFAULT 'ai-agent',
  agent_framework TEXT DEFAULT 'unknown',
  description TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 999,
  last_synced_at TIMESTAMPTZ,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_tokens ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access to agent_tokens"
  ON public.agent_tokens FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access to agent_tokens"
  ON public.agent_tokens FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Auto-update updated_at trigger
CREATE TRIGGER update_agent_tokens_updated_at
  BEFORE UPDATE ON public.agent_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.agent_tokens (coingecko_id, name, symbol, token_address, chain_id, category, agent_framework, is_featured, display_order, description) VALUES
  ('virtual-protocol', 'Virtuals Protocol', 'VIRTUAL', '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b', '0x2105', 'ai-launchpad', 'virtuals', true, 1, 'AI agent launchpad on Base enabling tokenized autonomous agents with the GAME framework.'),
  ('artificial-superintelligence-alliance', 'ASI Alliance', 'FET', '0xaea46a60368a7bd060eec7df8cba43b7ef41ad85', '0x1', 'ai-agent', 'fetch', true, 2, 'Merger of Fetch.ai, SingularityNET and Ocean Protocol building decentralized AGI.'),
  ('bittensor', 'Bittensor', 'TAO', '0x77e06c9eccef2e797fd462a92b6d7642ef85b0a4', '0x1', 'ai-infrastructure', 'bittensor', true, 3, 'Decentralized machine learning network where AI models compete and earn rewards.'),
  ('render-token', 'Render', 'RNDR', '0x6de037ef9ad2725eb40118bb1702ebb27e4aeb24', '0x1', 'ai-infrastructure', 'unknown', true, 4, 'Decentralized GPU rendering network powering AI model training and generative AI.'),
  ('origintrail', 'OriginTrail', 'TRAC', '0xaa7a9ca87d3694b5755f213b5d04094b8d0f0a6f', '0x1', 'ai-infrastructure', 'unknown', true, 5, 'Decentralized knowledge graph powering AI with verifiable real-world data.'),
  ('aixbt-by-virtuals', 'aixbt by Virtuals', 'AIXBT', '0x4f9fd6be4a90f2620860d680c0d4d5fb53d1a825', '0x2105', 'ai-agent', 'virtuals', true, 6, 'AI market intelligence agent analyzing crypto sentiment and narratives on X.'),
  ('autonolas', 'Autonolas', 'OLAS', '0x0001a500a6b18995b03f44bb040a5ffc28e45cb0', '0x1', 'ai-framework', 'olas', true, 7, 'Open platform for creating and co-owning autonomous AI agents.'),
  ('ai16z', 'ai16z', 'AI16Z', 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', 'solana', 'ai-agent', 'elizaos', true, 8, 'AI agent DAO on Solana built on ElizaOS framework for modular agent swarms.'),
  ('iexec-rlc', 'iExec RLC', 'RLC', '0x607f4c5bb672230e8672085532f7e901544a7375', '0x1', 'ai-infrastructure', 'unknown', false, 9, 'Decentralized cloud computing marketplace for confidential AI workloads.'),
  ('clanker', 'Clanker', 'CLANKER', '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb', '0x2105', 'ai-agent', 'unknown', false, 10, 'Autonomous token deployment bot on Base launching tokens from social commands.')
ON CONFLICT (coingecko_id) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  token_address = EXCLUDED.token_address,
  chain_id = EXCLUDED.chain_id,
  updated_at = now();
