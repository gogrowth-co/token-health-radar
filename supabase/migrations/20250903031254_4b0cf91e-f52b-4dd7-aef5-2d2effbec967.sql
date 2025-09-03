-- Create trigger function for Make.com webhook
CREATE OR REPLACE FUNCTION public.trigger_make_webhook()
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
    RAISE LOG 'Make.com webhook triggered for token_reports record: %', NEW.id;
    
    -- Make async HTTP request to make-webhook edge function
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/make-webhook',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || service_role_key,
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'record', row_to_json(NEW)
        )
    ) INTO request_id;
    
    RAISE LOG 'Make.com webhook request initiated with ID: %', request_id;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the database operation
    RAISE LOG 'Error in Make.com webhook trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create trigger on token_reports table for INSERT and UPDATE
DROP TRIGGER IF EXISTS token_reports_make_webhook_trigger ON public.token_reports;

CREATE TRIGGER token_reports_make_webhook_trigger
    AFTER INSERT OR UPDATE ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_make_webhook();