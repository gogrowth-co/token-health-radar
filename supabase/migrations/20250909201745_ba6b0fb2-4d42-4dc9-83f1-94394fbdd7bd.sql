-- Force regenerate sitemap immediately and fix triggers
SELECT net.http_post(
    'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/generate-sitemap',
    jsonb_build_object(
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY',
        'Content-Type', 'application/json'
    ),
    '{}'::jsonb
);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS token_reports_sitemap_trigger ON token_reports;

-- Create new trigger that fires AFTER INSERT and UPDATE
CREATE TRIGGER token_reports_sitemap_trigger
    AFTER INSERT OR UPDATE ON token_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sitemap_update();

-- Ensure the trigger function is optimized
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
    -- Log the trigger for debugging
    RAISE LOG 'Sitemap update triggered for token: %', NEW.token_symbol;
    
    -- Make async HTTP request to regenerate sitemap with proper error handling
    BEGIN
        SELECT net.http_post(
            url := supabase_url || '/functions/v1/generate-sitemap',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || service_role_key,
                'Content-Type', 'application/json'
            ),
            body := jsonb_build_object()
        ) INTO request_id;
        
        RAISE LOG 'Sitemap regeneration request initiated with ID: %', request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error in sitemap trigger: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;