-- A. Subscribers: remove user UPDATE + INSERT (backend-only writes)
DROP POLICY IF EXISTS "Users can update their own subscriber data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscriber data" ON public.subscribers;

-- B. Agent scans: restrict INSERT to caller
DROP POLICY IF EXISTS "Anyone can insert agent scans" ON public.agent_scans;
CREATE POLICY "Users can insert their own agent scans"
  ON public.agent_scans
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- C. Anonymous scan attempts: remove anon INSERT (service role only)
DROP POLICY IF EXISTS "Anonymous users can insert scan attempts" ON public.anonymous_scan_attempts;

-- D. upsert_subscriber_by_email: require service role
CREATE OR REPLACE FUNCTION public.upsert_subscriber_by_email(
  user_email text,
  user_name text DEFAULT NULL::text,
  user_plan text DEFAULT 'lifetime'::text,
  user_source text DEFAULT 'kiwify'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id UUID;
    subscriber_exists BOOLEAN;
BEGIN
    -- HARDENING: only allow backend (service_role) callers
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized: upsert_subscriber_by_email may only be called by service_role';
    END IF;

    SELECT id INTO user_id FROM auth.users WHERE email = user_email;

    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.subscribers WHERE id = user_id) INTO subscriber_exists;

    IF subscriber_exists THEN
        UPDATE public.subscribers
        SET plan = user_plan,
            source = user_source,
            name = COALESCE(user_name, name),
            updated_at = now()
        WHERE id = user_id;
    ELSE
        INSERT INTO public.subscribers (id, plan, source, name, scans_used, pro_scan_limit)
        VALUES (user_id, user_plan, user_source, user_name, 0, 999999);
    END IF;

    RETURN user_id;
END;
$function$;

-- E. search_path hardening on functions missing it
ALTER FUNCTION public.update_token_reports_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_all_users_to_hubspot() SET search_path = public;
ALTER FUNCTION public.trigger_make_webhook() SET search_path = public;
ALTER FUNCTION public.trigger_airtable_sync() SET search_path = public;
ALTER FUNCTION public.trigger_sitemap_update() SET search_path = public;
ALTER FUNCTION public.trigger_hubspot_sync() SET search_path = public;