-- First, let's remove the duplicate triggers and keep only one optimized trigger
DROP TRIGGER IF EXISTS trigger_sitemap_update_on_token_reports ON token_reports;
DROP TRIGGER IF EXISTS sitemap_update_trigger ON token_reports;
DROP TRIGGER IF EXISTS token_reports_sitemap_trigger ON token_reports;

-- Update the trigger function with better error handling and logging
CREATE OR REPLACE FUNCTION public.trigger_sitemap_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY';
    operation_type TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        operation_type := 'INSERT';
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
    ELSE
        operation_type := 'UNKNOWN';
    END IF;

    -- Log the trigger activation
    RAISE LOG 'Sitemap update triggered for % operation on token: % (ID: %)', 
        operation_type, NEW.token_symbol, NEW.id;
    
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
                'token_symbol', NEW.token_symbol,
                'timestamp', now()
            )
        ) INTO request_id;
        
        RAISE LOG 'Sitemap regeneration request successful - ID: %, Operation: %, Token: %', 
            request_id, operation_type, NEW.token_symbol;
            
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'ERROR in sitemap trigger for token %: % (SQLSTATE: %)', 
            NEW.token_symbol, SQLERRM, SQLSTATE;
        -- Don't fail the main operation, just log the error
    END;
    
    RETURN NEW;
END;
$function$;

-- Create the single optimized trigger
CREATE TRIGGER trigger_sitemap_update_on_token_reports
    AFTER INSERT OR UPDATE ON token_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sitemap_update();