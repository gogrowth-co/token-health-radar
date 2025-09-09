-- Manually call the sitemap generation function
SELECT net.http_post(
  url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/generate-sitemap',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzc4OTE3MSwiZXhwIjoyMDYzMzY1MTcxfQ.VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('manual_trigger', true)
) as request_id;