-- Add additional GitHub metrics to token_development_cache table
ALTER TABLE token_development_cache
ADD COLUMN IF NOT EXISTS stars INTEGER,
ADD COLUMN IF NOT EXISTS forks INTEGER,
ADD COLUMN IF NOT EXISTS open_issues INTEGER,
ADD COLUMN IF NOT EXISTS language VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS repo_created_at TIMESTAMPTZ;

-- Add comment to explain the new columns
COMMENT ON COLUMN token_development_cache.stars IS 'GitHub repository star count';
COMMENT ON COLUMN token_development_cache.forks IS 'GitHub repository fork count';
COMMENT ON COLUMN token_development_cache.open_issues IS 'Number of open issues on GitHub';
COMMENT ON COLUMN token_development_cache.language IS 'Primary programming language of the repository';
COMMENT ON COLUMN token_development_cache.is_archived IS 'Whether the repository is archived (read-only)';
COMMENT ON COLUMN token_development_cache.repo_created_at IS 'When the GitHub repository was created';
