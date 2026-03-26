ALTER TABLE token_community_cache
  ADD COLUMN IF NOT EXISTS galaxy_score numeric,
  ADD COLUMN IF NOT EXISTS alt_rank integer,
  ADD COLUMN IF NOT EXISTS sentiment numeric,
  ADD COLUMN IF NOT EXISTS interactions_24h bigint,
  ADD COLUMN IF NOT EXISTS posts_active integer,
  ADD COLUMN IF NOT EXISTS contributors_active integer,
  ADD COLUMN IF NOT EXISTS lunarcrush_fetched_at timestamptz;