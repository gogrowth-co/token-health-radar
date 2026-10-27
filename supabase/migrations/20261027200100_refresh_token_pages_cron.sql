-- Token pages follow their latest complete scan (2026-10-27): every 2 minutes (see the end) the oldest due token (latest scan past 20 h, or one that
-- lost inputs to a provider failure) is rescanned and its report, score card and page rebuilt by refresh-token-page. 288 slots a day for
-- 54 tokens. It replaces weekly-token-refresh (scans only, 6-day cycle, 110 s budget: LDO went unscored for weeks) and the GitHub
-- workflow fresh-token-page.yml. The job authenticates with the service key the database already keeps in Supabase Vault for its edge
-- function calls ('hubspot_sync_service_key'), read at run time and never written in the job.
do $$ begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'hubspot_sync_service_key') then
    raise exception 'Vault has no hubspot_sync_service_key (the database''s bearer for edge function calls)';
  end if;
end $$;

select cron.schedule('refresh-token-pages', '*/5 * * * *', $job$
  select net.http_post(
    url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/refresh-token-page',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hubspot_sync_service_key')),
    body := '{"due": true, "limit": 1, "max_age_hours": 20}'::jsonb,
    timeout_milliseconds := 150000
  );
$job$);

-- the old weekly scan-only job: its scans are now part of the refresh above
select cron.unschedule(jobid) from cron.job where command like '%functions/v1/weekly-token-refresh%';

-- every 2 minutes (applied 2026-10-27 19:55): 54 tokens catch up in under two hours after a backlog; a run with nothing due returns at once
select cron.alter_job((select jobid from cron.job where jobname = 'refresh-token-pages'), schedule := '*/2 * * * *');
