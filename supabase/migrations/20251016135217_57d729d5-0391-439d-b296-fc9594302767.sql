-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly token refresh every Monday at 8:00 AM UTC
SELECT cron.schedule(
  'weekly-token-refresh-monday-8am',
  '0 8 * * 1', -- Every Monday at 8:00 AM UTC
  $$
  SELECT
    net.http_post(
        url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/weekly-token-refresh',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{"scheduled": true, "trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);