-- Clear cached sitemap and force regeneration
DO $$
DECLARE
    delete_result RECORD;
    request_id BIGINT;
BEGIN
    -- Delete existing cached sitemap from storage
    DELETE FROM storage.objects 
    WHERE bucket_id = 'sitemaps' AND name = 'sitemap.xml';
    
    GET DIAGNOSTICS delete_result = ROW_COUNT;
    RAISE LOG 'Deleted % cached sitemap files', delete_result;
    
    -- Force immediate regeneration
    SELECT net.http_post(
        'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/generate-sitemap',
        jsonb_build_object(
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY',
            'Content-Type', 'application/json'
        ),
        '{}'::jsonb
    ) INTO request_id;
    
    RAISE LOG 'Forced sitemap regeneration after cache clear, request ID: %', request_id;
END $$;

-- Update the trigger function to always clear cache before regenerating
CREATE OR REPLACE FUNCTION public.trigger_sitemap_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY';
BEGIN
    RAISE LOG 'Sitemap update triggered for token: %', NEW.token_symbol;
    
    BEGIN
        -- First, clear any existing cached sitemap
        DELETE FROM storage.objects 
        WHERE bucket_id = 'sitemaps' AND name = 'sitemap.xml';
        
        RAISE LOG 'Cleared cached sitemap before regeneration';
        
        -- Then generate fresh sitemap
        SELECT net.http_post(
            url := supabase_url || '/functions/v1/generate-sitemap',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || service_role_key,
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object()
        ) INTO request_id;
        
        RAISE LOG 'Fresh sitemap generation request initiated with ID: %', request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error in sitemap trigger: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;