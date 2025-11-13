-- Fix security warnings: Set search_path for all trigger functions

-- Update normalize_token_address function with search_path
CREATE OR REPLACE FUNCTION normalize_token_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.token_address = LOWER(TRIM(NEW.token_address));
  RETURN NEW;
END;
$$;

-- Update normalize_token_reports_fields function with search_path
CREATE OR REPLACE FUNCTION normalize_token_reports_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.token_address = LOWER(TRIM(NEW.token_address));
  NEW.token_symbol = LOWER(TRIM(NEW.token_symbol));
  RETURN NEW;
END;
$$;

-- Update normalize_token_scans_address function with search_path
CREATE OR REPLACE FUNCTION normalize_token_scans_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.token_address IS NOT NULL THEN
    NEW.token_address = LOWER(TRIM(NEW.token_address));
  END IF;
  RETURN NEW;
END;
$$;