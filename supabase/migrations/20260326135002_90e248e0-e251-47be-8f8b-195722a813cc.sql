ALTER TABLE token_community_cache
  ADD COLUMN IF NOT EXISTS social_dominance numeric,
  ADD COLUMN IF NOT EXISTS trend text;