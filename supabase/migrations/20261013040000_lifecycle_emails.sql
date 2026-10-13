-- Welcome series (lifecycle-emails edge function).
-- One row per user per email; the function reads who is due from lifecycle_due().
-- Every subscriber that exists at launch is backfilled as 'skipped' for welcome
-- and day3, so only new signups get those. Existing free users still get the PRO
-- email when they upgrade.

CREATE TABLE IF NOT EXISTS public.lifecycle_emails (
  user_id    uuid        NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  email_key  text        NOT NULL CHECK (email_key IN ('welcome', 'day3', 'pro')),
  status     text        NOT NULL CHECK (status IN ('sent', 'skipped', 'retry', 'failed')),
  attempts   int         NOT NULL DEFAULT 0,
  resend_id  text,
  error      text,
  sent_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, email_key)
);
-- RLS on with no policies: only the service role reads or writes it.
ALTER TABLE public.lifecycle_emails ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;

-- 'pro' is skipped only for people already on PRO (or admin); everyone else
-- still gets the PRO email if they upgrade later.
INSERT INTO public.lifecycle_emails (user_id, email_key, status)
SELECT s.id, k.key, 'skipped'
FROM public.subscribers s
CROSS JOIN (VALUES ('welcome'), ('day3'), ('pro')) AS k(key)
WHERE k.key <> 'pro' OR s.plan IN ('pro', 'admin')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.lifecycle_due(p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, email text, email_key text, attempts int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT s.id, u.email::text, k.key, COALESCE(l.attempts, 0)
  FROM public.subscribers s
  JOIN auth.users u ON u.id = s.id
  CROSS JOIN (VALUES ('welcome'), ('day3'), ('pro')) AS k(key)
  LEFT JOIN public.lifecycle_emails l ON l.user_id = s.id AND l.email_key = k.key
  WHERE u.email IS NOT NULL
    AND (l.user_id IS NULL OR l.status = 'retry')
    AND (
      k.key = 'welcome'
      OR (k.key = 'day3' AND s.plan = 'free' AND NOT s.email_opt_out
          AND s.created_at <= now() - interval '3 days'
          AND s.created_at >  now() - interval '7 days')
      OR (k.key = 'pro' AND s.plan = 'pro')
    )
  ORDER BY s.created_at
  LIMIT p_limit;
$$;
REVOKE ALL ON FUNCTION public.lifecycle_due(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifecycle_due(int) TO service_role;

-- Cron: every 10 minutes. The secret lives in Vault ('lifecycle_cron_secret'),
-- created out of band with the same value as the LIFECYCLE_CRON_SECRET function secret.
SELECT cron.unschedule('lifecycle-emails') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lifecycle-emails');
SELECT cron.schedule(
  'lifecycle-emails',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/lifecycle-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lifecycle_cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
