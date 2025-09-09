-- Recreate the sitemap trigger that was accidentally dropped
CREATE TRIGGER trigger_sitemap_update_on_token_reports
  AFTER INSERT OR UPDATE ON public.token_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sitemap_update();

-- Manually trigger sitemap generation right now
SELECT net.http_post(
  url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/generate-sitemap',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'manual_trigger', true,
    'timestamp', now()
  )
) as request_id;