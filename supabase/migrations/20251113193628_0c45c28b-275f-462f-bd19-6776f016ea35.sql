-- Phase 1: Add triggers to enforce lowercase token addresses on all future operations
-- This ensures case-insensitive consistency without touching existing data

-- Create a single reusable function to normalize addresses
CREATE OR REPLACE FUNCTION normalize_token_address()
RETURNS TRIGGER AS $$
BEGIN
  NEW.token_address = LOWER(TRIM(NEW.token_address));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to token_data_cache
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_data_cache;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_data_cache
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Apply trigger to token_security_cache  
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_security_cache;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_security_cache
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Apply trigger to token_tokenomics_cache
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_tokenomics_cache;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_tokenomics_cache
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Apply trigger to token_liquidity_cache
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_liquidity_cache;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_liquidity_cache
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Apply trigger to token_community_cache
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_community_cache;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_community_cache
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Apply trigger to token_development_cache
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_development_cache;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_development_cache
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Apply trigger to token_risk_reports
DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_risk_reports;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_risk_reports
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_address();

-- Special function for token_reports (handles both address and symbol)
CREATE OR REPLACE FUNCTION normalize_token_reports_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.token_address = LOWER(TRIM(NEW.token_address));
  NEW.token_symbol = LOWER(TRIM(NEW.token_symbol));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_lowercase_fields ON token_reports;
CREATE TRIGGER enforce_lowercase_fields
  BEFORE INSERT OR UPDATE ON token_reports
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_reports_fields();

-- Special function for token_scans (nullable address)
CREATE OR REPLACE FUNCTION normalize_token_scans_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token_address IS NOT NULL THEN
    NEW.token_address = LOWER(TRIM(NEW.token_address));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_lowercase_address ON token_scans;
CREATE TRIGGER enforce_lowercase_address
  BEFORE INSERT OR UPDATE ON token_scans
  FOR EACH ROW
  EXECUTE FUNCTION normalize_token_scans_address();