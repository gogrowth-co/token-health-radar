-- Phase 1: Add new tokenomics fields to support enhanced data collection
ALTER TABLE token_tokenomics_cache 
ADD COLUMN IF NOT EXISTS actual_circulating_supply numeric,
ADD COLUMN IF NOT EXISTS total_supply numeric,
ADD COLUMN IF NOT EXISTS inflation_rate numeric,
ADD COLUMN IF NOT EXISTS dex_liquidity_usd numeric,
ADD COLUMN IF NOT EXISTS major_dex_pairs jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS burn_events_detected boolean,
ADD COLUMN IF NOT EXISTS burn_addresses_found text[],
ADD COLUMN IF NOT EXISTS top_holders_count integer,
ADD COLUMN IF NOT EXISTS distribution_gini_coefficient numeric,
ADD COLUMN IF NOT EXISTS holder_concentration_risk text,
ADD COLUMN IF NOT EXISTS treasury_addresses text[],
ADD COLUMN IF NOT EXISTS data_confidence_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_holder_analysis timestamp with time zone;