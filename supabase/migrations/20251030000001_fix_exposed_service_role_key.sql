-- CRITICAL SECURITY FIX: Remove hardcoded service role key from trigger function
-- This migration replaces the exposed service role key with Supabase Vault integration

-- Enable the Vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vault;

-- Create a secure way to store the service role key in vault
-- Note: This needs to be populated manually via Supabase CLI or Dashboard
-- Command: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here

-- Create improved trigger function that uses vault for sensitive data
CREATE OR REPLACE FUNCTION public.trigger_sitemap_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
    request_id BIGINT;
    supabase_url TEXT;
    service_role_key TEXT;
    operation_type TEXT;
BEGIN
    -- Get Supabase URL from current_setting (safer than hardcoding)
    BEGIN
        supabase_url := current_setting('app.settings.supabase_url', true);
        IF supabase_url IS NULL OR supabase_url = '' THEN
            supabase_url := 'https://qaqebpcqespvzbfwawlp.supabase.co';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        supabase_url := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    END;

    -- Retrieve service role key from vault
    -- If vault is not set up, log error and skip sitemap update
    BEGIN
        service_role_key := vault.decrypted_secret('SUPABASE_SERVICE_ROLE_KEY');

        IF service_role_key IS NULL THEN
            RAISE WARNING 'Service role key not found in vault. Skipping sitemap update. Please run: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your_key>';
            RETURN COALESCE(NEW, OLD);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error accessing vault for service role key: %. Skipping sitemap update.', SQLERRM;
        RETURN COALESCE(NEW, OLD);
    END;

    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        operation_type := 'INSERT';
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        operation_type := 'DELETE';
    ELSE
        operation_type := 'UNKNOWN';
    END IF;

    -- Log the trigger activation (excluding sensitive data)
    RAISE LOG 'Sitemap update triggered for % operation on token: % (ID: %)',
        operation_type, COALESCE(NEW.token_symbol, OLD.token_symbol), COALESCE(NEW.id, OLD.id);

    -- Make async HTTP request to regenerate sitemap with better error handling
    BEGIN
        SELECT net.http_post(
            url := supabase_url || '/functions/v1/generate-sitemap',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || service_role_key,
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object(
                'trigger_source', 'database_trigger',
                'operation', operation_type,
                'token_symbol', COALESCE(NEW.token_symbol, OLD.token_symbol),
                'timestamp', now()
            )
        ) INTO request_id;

        RAISE LOG 'Sitemap regeneration request successful - ID: %, Operation: %, Token: %',
            request_id, operation_type, COALESCE(NEW.token_symbol, OLD.token_symbol);

    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'ERROR in sitemap trigger for token %: % (SQLSTATE: %)',
            COALESCE(NEW.token_symbol, OLD.token_symbol), SQLERRM, SQLSTATE;
        -- Don't fail the main operation, just log the error
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.trigger_sitemap_update() IS
'Trigger function to regenerate sitemap when token_reports changes.
SECURITY: Uses Supabase Vault for service role key storage instead of hardcoding.
Setup: Run `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your_key>` to configure.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_sitemap_update() TO postgres;
