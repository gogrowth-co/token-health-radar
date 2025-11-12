-- Migration: Add performance indexes for security section optimization
-- Created: 2025-11-12
-- Description: Adds indexes to improve query performance on token_security_cache and related tables

-- Index for token_security_cache lookups by token_address and chain_id
-- This is the most common query pattern for loading security data
CREATE INDEX IF NOT EXISTS idx_token_security_cache_token_chain
ON public.token_security_cache (token_address, chain_id);

-- Index for updated_at to enable efficient "recently updated" queries
CREATE INDEX IF NOT EXISTS idx_token_security_cache_updated
ON public.token_security_cache (updated_at DESC);

-- Index for token_data_cache lookups (primary table)
CREATE INDEX IF NOT EXISTS idx_token_data_cache_token_chain
ON public.token_data_cache (token_address, chain_id);

-- Index for token_tokenomics_cache
CREATE INDEX IF NOT EXISTS idx_token_tokenomics_cache_token_chain
ON public.token_tokenomics_cache (token_address, chain_id);

-- Index for token_liquidity_cache
CREATE INDEX IF NOT EXISTS idx_token_liquidity_cache_token_chain
ON public.token_liquidity_cache (token_address, chain_id);

-- Index for token_community_cache
CREATE INDEX IF NOT EXISTS idx_token_community_cache_token_chain
ON public.token_community_cache (token_address, chain_id);

-- Index for token_development_cache
CREATE INDEX IF NOT EXISTS idx_token_development_cache_token_chain
ON public.token_development_cache (token_address, chain_id);

-- Composite index for chain-based queries across security cache
-- Useful for analytics and bulk operations
CREATE INDEX IF NOT EXISTS idx_token_security_cache_chain_score
ON public.token_security_cache (chain_id, score DESC);

-- Log the successful migration
DO $$
BEGIN
  RAISE NOTICE 'Security performance indexes created successfully';
END $$;
