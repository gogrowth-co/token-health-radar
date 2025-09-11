-- Add database triggers to automatically regenerate sitemap when token_reports table changes

-- First, make sure we have the trigger function for sitemap updates
CREATE OR REPLACE FUNCTION public.trigger_sitemap_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    ELSIF TG_OP = 'DELETE' THEN
        operation_type := 'DELETE';
    ELSE
        operation_type := 'UNKNOWN';
    END IF;

    -- Log the trigger activation
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

-- Create triggers for INSERT, UPDATE, and DELETE operations on token_reports table
DROP TRIGGER IF EXISTS token_reports_sitemap_trigger_insert ON public.token_reports;
DROP TRIGGER IF EXISTS token_reports_sitemap_trigger_update ON public.token_reports;
DROP TRIGGER IF EXISTS token_reports_sitemap_trigger_delete ON public.token_reports;

CREATE TRIGGER token_reports_sitemap_trigger_insert
    AFTER INSERT ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sitemap_update();

CREATE TRIGGER token_reports_sitemap_trigger_update
    AFTER UPDATE ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sitemap_update();

CREATE TRIGGER token_reports_sitemap_trigger_delete
    AFTER DELETE ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sitemap_update();