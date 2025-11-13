-- Add missing columns to token_development_cache for GitHub repository details
-- These columns store additional metadata from GitHub API that's used in Development scoring

ALTER TABLE token_development_cache
ADD COLUMN IF NOT EXISTS stars INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS forks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS open_issues INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS language VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS repo_created_at TIMESTAMPTZ;

-- Add helpful comment
COMMENT ON COLUMN token_development_cache.stars IS 'Number of GitHub stars for the repository';
COMMENT ON COLUMN token_development_cache.forks IS 'Number of GitHub forks for the repository';
COMMENT ON COLUMN token_development_cache.open_issues IS 'Number of open issues on GitHub';
COMMENT ON COLUMN token_development_cache.language IS 'Primary programming language used in the repository';
COMMENT ON COLUMN token_development_cache.is_archived IS 'Whether the GitHub repository is archived';
COMMENT ON COLUMN token_development_cache.repo_created_at IS 'When the GitHub repository was created';