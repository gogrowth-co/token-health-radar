-- Enable required extensions for HTTP requests and cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to trigger Airtable sync
CREATE OR REPLACE FUNCTION public.trigger_airtable_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    operation_type TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        operation_type := 'INSERT';
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'UPDATE';
    ELSE
        RETURN NULL;
    END IF;

    -- Log the trigger for debugging
    RAISE LOG 'Airtable sync triggered for % operation on token_reports record: %', operation_type, COALESCE(NEW.id, OLD.id);
    
    -- Make async HTTP request to airtable-sync edge function
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/airtable-sync',
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'operation', operation_type,
            'record', row_to_json(NEW)
        )
    ) INTO request_id;
    
    RAISE LOG 'Airtable sync request initiated with ID: % for operation: %', request_id, operation_type;
    
    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the database operation
    RAISE LOG 'Error in airtable sync trigger: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create triggers on token_reports table
DROP TRIGGER IF EXISTS trigger_airtable_sync_insert ON public.token_reports;
DROP TRIGGER IF EXISTS trigger_airtable_sync_update ON public.token_reports;

CREATE TRIGGER trigger_airtable_sync_insert
    AFTER INSERT ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_airtable_sync();

CREATE TRIGGER trigger_airtable_sync_update
    AFTER UPDATE ON public.token_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_airtable_sync();

-- Schedule full sync to run daily at 2 AM UTC for recovery/backup
SELECT cron.schedule(
    'airtable-full-sync-daily',
    '0 2 * * *', -- Daily at 2 AM UTC
    $$
    SELECT net.http_post(
        url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/airtable-full-sync',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
    ) as request_id;
    $$
);