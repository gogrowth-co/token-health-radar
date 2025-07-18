-- Fix chain_id NULL constraint violation and webacy_risk_score data type issues

-- 1. Update existing NULL chain_id values in token_scans table
UPDATE token_scans 
SET chain_id = '0x1' 
WHERE chain_id IS NULL;

-- 2. Change webacy_risk_score from integer to numeric to accommodate decimal values from Webacy API
ALTER TABLE token_security_cache 
ALTER COLUMN webacy_risk_score TYPE numeric USING webacy_risk_score::numeric;

-- 3. Add comment for documentation
COMMENT ON COLUMN token_security_cache.webacy_risk_score IS 'Webacy risk score (decimal values, where 0 is safest)';