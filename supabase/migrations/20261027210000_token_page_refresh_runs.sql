-- One row per refresh-token-page call (2026-10-27): started when the call begins, finished with its result. Monitoring (the V4
-- preflight) matches each cron run to its own row, so a call that never answered shows as missing instead of hiding behind another
-- run's answer. Service role only.
create table if not exists public.token_page_refresh_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null,          -- 'due' (the cron) or 'tokens' (a caller naming tokens)
  ok boolean,
  results jsonb
);
create index if not exists token_page_refresh_runs_started on public.token_page_refresh_runs (started_at desc);
alter table public.token_page_refresh_runs enable row level security;
