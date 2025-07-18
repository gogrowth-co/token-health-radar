-- Create function to trigger sitemap regeneration
CREATE OR REPLACE FUNCTION public.trigger_sitemap_update()
RETURNS TRIGGER AS $$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY';
BEGIN
    -- Log the trigger for debugging
    RAISE LOG 'Sitemap update triggered for token: %', NEW.token_symbol;
    
    -- Make async HTTP request to regenerate sitemap
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/generate-sitemap',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_role_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object()
    ) INTO request_id;
    
    RAISE LOG 'Sitemap regeneration request initiated with ID: %', request_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on token_reports table
CREATE TRIGGER trigger_sitemap_update_on_new_report
    AFTER INSERT ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_sitemap_update();