-- Add Webacy security fields to token_security_cache table
ALTER TABLE public.token_security_cache 
ADD COLUMN IF NOT EXISTS webacy_risk_score integer,
ADD COLUMN IF NOT EXISTS webacy_severity text,
ADD COLUMN IF NOT EXISTS webacy_flags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_proxy boolean,
ADD COLUMN IF NOT EXISTS is_blacklisted boolean,
ADD COLUMN IF NOT EXISTS access_control boolean,
ADD COLUMN IF NOT EXISTS contract_verified boolean;

-- Add comments for documentation
COMMENT ON COLUMN public.token_security_cache.webacy_risk_score IS 'Webacy risk score (0-100, where 0 is safest)';
COMMENT ON COLUMN public.token_security_cache.webacy_severity IS 'Overall risk severity from Webacy (critical, high, medium, low)';
COMMENT ON COLUMN public.token_security_cache.webacy_flags IS 'Array of Webacy risk flags with details';
COMMENT ON COLUMN public.token_security_cache.is_proxy IS 'Whether the contract is a proxy contract';
COMMENT ON COLUMN public.token_security_cache.is_blacklisted IS 'Whether the contract has blacklisting functionality';
COMMENT ON COLUMN public.token_security_cache.access_control IS 'Whether the contract has access control mechanisms';
COMMENT ON COLUMN public.token_security_cache.contract_verified IS 'Whether the contract source is verified and open';