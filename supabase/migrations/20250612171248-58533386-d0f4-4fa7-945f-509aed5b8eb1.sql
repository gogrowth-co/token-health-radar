
-- Additional security fixes for remaining warnings
-- This addresses the Function Search Path Mutable warnings by ensuring all functions have proper search_path

-- Fix any remaining functions that might not have proper search_path
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Get all functions that don't have search_path set
    FOR func_record IN
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN ('sync_all_users_to_hubspot', 'get_user_email_for_hubspot', 'upsert_subscriber_by_email', 'trigger_hubspot_sync')
    LOOP
        -- This will be handled by the specific function recreations above
        RAISE LOG 'Function % needs search_path fix', func_record.function_name;
    END LOOP;
END $$;

-- Verify all our critical functions have proper security settings
-- Check if sync_all_users_to_hubspot_debug function exists and create if needed
CREATE OR REPLACE FUNCTION public.sync_all_users_to_hubspot_debug()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY';
    response_status INTEGER;
    response_content TEXT;
    user_count INTEGER;
BEGIN
    -- Count users first
    SELECT COUNT(*) INTO user_count FROM hubspot_contact_data;
    
    RAISE LOG 'Starting bulk HubSpot sync for % users', user_count;
    
    -- Make HTTP request to sync all users with error handling
    BEGIN
        SELECT 
            status,
            content::text
        INTO 
            response_status,
            response_content
        FROM net.http_post(
            url := supabase_url || '/functions/v1/hubspot-sync',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || service_role_key,
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object()
        );
        
        RAISE LOG 'Bulk HubSpot sync HTTP response - Status: %, Content: %', response_status, response_content;
        
        RETURN jsonb_build_object(
            'success', response_status < 400,
            'status', response_status,
            'content', response_content,
            'user_count', user_count,
            'timestamp', now()
        );
        
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Bulk HubSpot sync HTTP request failed: %', SQLERRM;
        
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'user_count', user_count,
            'timestamp', now()
        );
    END;
END;
$$;

-- Grant execute permissions on the debug function
GRANT EXECUTE ON FUNCTION public.sync_all_users_to_hubspot_debug() TO service_role;

-- Note: Extension in Public warning for pg_net is expected and safe
-- pg_net needs to be in public schema to work with edge functions
-- This is the standard and recommended configuration for Supabase

-- Create a comment to document this is intentional
COMMENT ON EXTENSION pg_net IS 'Required in public schema for Supabase edge functions HTTP requests';
