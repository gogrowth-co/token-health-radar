
-- Improve the trigger function with better error handling and logging
CREATE OR REPLACE FUNCTION public.trigger_hubspot_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY';
    response_status INTEGER;
    response_content TEXT;
BEGIN
    -- Get the user's email from auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = COALESCE(NEW.id, OLD.id);
    
    -- Log the trigger for debugging
    RAISE LOG 'HubSpot sync triggered for user: % (ID: %)', user_email, COALESCE(NEW.id, OLD.id);
    
    -- Make async HTTP request to HubSpot sync edge function with error handling
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
            body := jsonb_build_object(
                'user_id', COALESCE(NEW.id, OLD.id)
            )
        );
        
        RAISE LOG 'HubSpot sync HTTP response - Status: %, Content: %', response_status, response_content;
        
        IF response_status >= 400 THEN
            RAISE WARNING 'HubSpot sync failed with status %: %', response_status, response_content;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'HubSpot sync HTTP request failed: %', SQLERRM;
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create a safer bulk sync function with better error handling
CREATE OR REPLACE FUNCTION public.sync_all_users_to_hubspot_debug()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
