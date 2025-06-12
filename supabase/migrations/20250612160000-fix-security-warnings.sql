
-- Fix security warnings from Supabase Security Advisor

-- Fix search_path issues for all functions
-- Drop and recreate functions with proper SECURITY DEFINER and search_path settings

-- 1. Fix sync_all_users_to_hubspot function
DROP FUNCTION IF EXISTS public.sync_all_users_to_hubspot();
CREATE OR REPLACE FUNCTION public.sync_all_users_to_hubspot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- 2. Fix get_user_email_for_hubspot function
DROP FUNCTION IF EXISTS public.get_user_email_for_hubspot(uuid);
CREATE OR REPLACE FUNCTION public.get_user_email_for_hubspot(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$;

-- 3. Fix upsert_subscriber_by_email function
DROP FUNCTION IF EXISTS public.upsert_subscriber_by_email(text, text, text, text);
CREATE OR REPLACE FUNCTION public.upsert_subscriber_by_email(
    user_email text, 
    user_name text DEFAULT NULL::text, 
    user_plan text DEFAULT 'lifetime'::text, 
    user_source text DEFAULT 'kiwify'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_id UUID;
    subscriber_exists BOOLEAN;
BEGIN
    -- Find user by email in auth.users
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        -- User doesn't exist in auth, we'll return NULL
        -- The webhook will handle this case
        RETURN NULL;
    END IF;
    
    -- Check if subscriber record exists
    SELECT EXISTS(SELECT 1 FROM public.subscribers WHERE id = user_id) INTO subscriber_exists;
    
    IF subscriber_exists THEN
        -- Update existing subscriber
        UPDATE public.subscribers 
        SET 
            plan = user_plan,
            source = user_source,
            name = COALESCE(user_name, name),
            updated_at = now()
        WHERE id = user_id;
    ELSE
        -- Insert new subscriber record
        INSERT INTO public.subscribers (id, plan, source, name, scans_used, pro_scan_limit)
        VALUES (user_id, user_plan, user_source, user_name, 0, 999999);
    END IF;
    
    RETURN user_id;
END;
$$;

-- 4. Fix trigger_hubspot_sync function
DROP FUNCTION IF EXISTS public.trigger_hubspot_sync();
CREATE OR REPLACE FUNCTION public.trigger_hubspot_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.sync_all_users_to_hubspot() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_email_for_hubspot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_subscriber_by_email(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_hubspot_sync() TO service_role;

-- Note: The "Extension in Public" and "Leaked Password Protection Disabled" warnings 
-- are configuration-level issues that need to be addressed in the Supabase dashboard:
-- 1. pg_net extension in public schema is expected for HTTP requests from functions
-- 2. Password protection should be enabled in Auth settings if not already done

