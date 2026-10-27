-- Scan quotas kept in the database (2026-10-27). The Upstash-based limiter in _shared/rateLimit.ts was never configured on this
-- project (no UPSTASH_* secrets), so it allowed every request: anonymous scans were unlimited. run-token-scan now takes a slot here
-- per caller per window (anonymous: per IP per hour, and one shared daily cap; signed-in users: per user per hour). Service role only.
create table if not exists public.scan_quota (
  bucket text not null,
  window_start timestamptz not null,
  used integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.scan_quota enable row level security;   -- no policies: only the service role reads or writes

create or replace function public.scan_quota_take(p_bucket text, p_window_seconds integer, p_limit integer)
returns table (allowed boolean, used integer)
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  u integer;
begin
  insert into scan_quota as q (bucket, window_start, used) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set used = q.used + 1
  returning q.used into u;
  if random() < 0.01 then delete from scan_quota where window_start < now() - interval '3 days'; end if;
  return query select u <= p_limit, u;
end $$;

revoke all on function public.scan_quota_take(text, integer, integer) from public, anon, authenticated;
grant execute on function public.scan_quota_take(text, integer, integer) to service_role;
