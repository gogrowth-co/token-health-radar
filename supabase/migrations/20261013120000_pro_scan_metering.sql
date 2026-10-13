-- Pro scan metering. Nothing had incremented subscribers.scans_used since
-- 2025-07, so free accounts never hit their 3 lifetime Pro scans and PRO
-- unlocked nothing extra. A Pro scan is now spent the first time a user opens
-- the full result for a token; reopening the same token is free.

-- Start of the current monthly allowance for pro / lifetime plans. Annual
-- PRO is billed once a year, so the 10-per-month window cannot rely on
-- invoice.paid alone.
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS scans_period_start timestamptz NOT NULL DEFAULT now();

-- Tokens a user has already spent a Pro scan on.
CREATE TABLE IF NOT EXISTS public.pro_scan_unlocks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id text NOT NULL,
  token_address text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chain_id, token_address)
);

ALTER TABLE public.pro_scan_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pro scan unlocks" ON public.pro_scan_unlocks;
CREATE POLICY "Users can view their own pro scan unlocks"
  ON public.pro_scan_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.pro_scan_unlocks FROM anon, authenticated;
GRANT SELECT ON public.pro_scan_unlocks TO authenticated;

-- Spend (or reuse) a Pro scan for one token. Called by check-scan-access with
-- the service role. Row lock makes concurrent calls count once.
CREATE OR REPLACE FUNCTION public.consume_pro_scan(p_user_id uuid, p_chain_id text, p_token_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sub public.subscribers%ROWTYPE;
  scan_limit integer;
  already boolean;
  v_chain text := lower(btrim(p_chain_id));
  -- Same key the scan cache uses (ScanResult lowercases every address).
  v_address text := lower(btrim(p_token_address));
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: consume_pro_scan may only be called by service_role';
  END IF;

  SELECT * INTO sub FROM public.subscribers WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('hasPro', false, 'consumed', false, 'plan', 'free', 'scansUsed', 0, 'scanLimit', 3);
  END IF;

  -- Monthly allowance for paid plans.
  IF sub.plan IN ('pro', 'lifetime') AND sub.scans_period_start < now() - interval '1 month' THEN
    UPDATE public.subscribers
      SET scans_used = 0, scans_period_start = now(), updated_at = now()
      WHERE id = p_user_id;
    sub.scans_used := 0;
  END IF;

  scan_limit := CASE WHEN sub.plan = 'free' THEN 3 ELSE COALESCE(sub.pro_scan_limit, 3) END;

  SELECT EXISTS (
    SELECT 1 FROM public.pro_scan_unlocks
    WHERE user_id = p_user_id AND chain_id = v_chain AND token_address = v_address
  ) INTO already;

  IF already THEN
    RETURN jsonb_build_object('hasPro', true, 'consumed', false, 'plan', sub.plan,
      'scansUsed', COALESCE(sub.scans_used, 0), 'scanLimit', scan_limit);
  END IF;

  IF COALESCE(sub.scans_used, 0) >= scan_limit THEN
    RETURN jsonb_build_object('hasPro', false, 'consumed', false, 'plan', sub.plan,
      'scansUsed', COALESCE(sub.scans_used, 0), 'scanLimit', scan_limit);
  END IF;

  INSERT INTO public.pro_scan_unlocks (user_id, chain_id, token_address)
    VALUES (p_user_id, v_chain, v_address);
  UPDATE public.subscribers
    SET scans_used = COALESCE(scans_used, 0) + 1, updated_at = now()
    WHERE id = p_user_id;

  RETURN jsonb_build_object('hasPro', true, 'consumed', true, 'plan', sub.plan,
    'scansUsed', COALESCE(sub.scans_used, 0) + 1, 'scanLimit', scan_limit);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_pro_scan(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_pro_scan(uuid, text, text) TO service_role;
