-- Token pages follow their latest complete scan (2026-10-27): every 5 minutes the oldest due token (latest scan past 20 h, or one that
-- lost inputs to a provider failure) is rescanned and its report, score card and page rebuilt by refresh-token-page. 288 slots a day for
-- 54 tokens. It replaces weekly-token-refresh (scans only, 6-day cycle, 110 s budget: LDO went unscored for weeks) and the GitHub
-- workflow fresh-token-page.yml. The secret is read from Supabase Vault ('token_page_refresh_secret'), never written in the job.
do $$ begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'token_page_refresh_secret') then
    raise exception 'store the refresh secret first: select vault.create_secret(''<value>'', ''token_page_refresh_secret'')';
  end if;
end $$;

select cron.schedule('refresh-token-pages', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/refresh-token-page',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-refresh-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'token_page_refresh_secret')),
    body := '{"due": true, "limit": 1, "max_age_hours": 20}'::jsonb,
    timeout_milliseconds := 150000
  );
$job$);

-- the old weekly scan-only job: its scans are now part of the refresh above
select cron.unschedule(jobid) from cron.job where command like '%functions/v1/weekly-token-refresh%';
