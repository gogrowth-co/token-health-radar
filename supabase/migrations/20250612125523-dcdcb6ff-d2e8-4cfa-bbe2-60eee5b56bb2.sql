
-- Enable pg_net extension for making HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Update the trigger function to actually call the HubSpot sync edge function
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
BEGIN
    -- Get the user's email from auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = COALESCE(NEW.id, OLD.id);
    
    -- Log the trigger for debugging
    RAISE LOG 'HubSpot sync triggered for user: %', user_email;
    
    -- Make async HTTP request to HubSpot sync edge function
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/hubspot-sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_role_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'user_id', COALESCE(NEW.id, OLD.id)
        )
    ) INTO request_id;
    
    RAISE LOG 'HubSpot sync request initiated with ID: %', request_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create a function to sync all existing users to HubSpot
CREATE OR REPLACE FUNCTION public.sync_all_users_to_hubspot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY';
BEGIN
    -- Make HTTP request to sync all users
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/hubspot-sync',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_role_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object()
    ) INTO request_id;
    
    RAISE LOG 'Bulk HubSpot sync request initiated with ID: %', request_id;
END;
$$;

-- Execute the bulk sync for all existing users
SELECT public.sync_all_users_to_hubspot();
