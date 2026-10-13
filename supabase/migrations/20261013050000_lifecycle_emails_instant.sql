-- Welcome and PRO emails go out within seconds instead of on the next 10-minute cron.
-- A trigger on subscribers calls lifecycle-emails right after a signup or a plan
-- change to 'pro'. The cron stays as the safety net (retries, day3).
-- Because the trigger and the cron can now run at the same time, sends are claimed
-- first (status 'sending'), so a user is never emailed twice.

ALTER TABLE public.lifecycle_emails DROP CONSTRAINT IF EXISTS lifecycle_emails_status_check;
ALTER TABLE public.lifecycle_emails ADD CONSTRAINT lifecycle_emails_status_check
  CHECK (status IN ('sent', 'skipped', 'retry', 'failed', 'sending'));
ALTER TABLE public.lifecycle_emails ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- A claim older than 15 minutes means that run died; it becomes due again.
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
    AND (l.user_id IS NULL
         OR l.status = 'retry'
         OR (l.status = 'sending' AND l.claimed_at < now() - interval '15 minutes'))
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

-- Atomically marks due rows as 'sending' and returns only the rows this caller won.
CREATE OR REPLACE FUNCTION public.lifecycle_claim(p_limit int DEFAULT 50)
RETURNS TABLE (user_id uuid, email text, email_key text, attempts int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT * FROM public.lifecycle_due(p_limit)
  ), claimed AS (
    INSERT INTO public.lifecycle_emails AS l (user_id, email_key, status, attempts, claimed_at)
    SELECT d.user_id, d.email_key, 'sending', d.attempts, now() FROM due d
    ON CONFLICT (user_id, email_key) DO UPDATE
      SET status = 'sending', claimed_at = now()
      WHERE l.status = 'retry'
         OR (l.status = 'sending' AND l.claimed_at < now() - interval '15 minutes')
    RETURNING l.user_id, l.email_key
  )
  SELECT d.user_id, d.email, d.email_key, d.attempts
  FROM due d JOIN claimed c ON c.user_id = d.user_id AND c.email_key = d.email_key;
END;
$$;
REVOKE ALL ON FUNCTION public.lifecycle_claim(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifecycle_claim(int) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_lifecycle_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (NEW.plan = 'pro' AND OLD.plan IS DISTINCT FROM 'pro') THEN
    -- pg_net sends after the transaction commits, so the function sees this row.
    -- Never let an email problem block a signup or an upgrade: the cron catches up.
    BEGIN
    PERFORM net.http_post(
      url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/lifecycle-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lifecycle_cron_secret' LIMIT 1)
      ),
      body := '{"trigger": true}'::jsonb
    );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'lifecycle-emails trigger failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lifecycle_emails_on_subscriber ON public.subscribers;
CREATE TRIGGER lifecycle_emails_on_subscriber
  AFTER INSERT OR UPDATE OF plan ON public.subscribers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_lifecycle_emails();
