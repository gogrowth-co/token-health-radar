-- 1. Restrict get_user_email_for_hubspot to service_role, the user themselves, or admins, and revoke direct client execution.
CREATE OR REPLACE FUNCTION public.get_user_email_for_hubspot(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT u.email
  FROM auth.users u
  WHERE u.id = user_id
    AND (
      auth.role() = 'service_role'
      OR auth.uid() = user_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
$function$;

REVOKE ALL ON FUNCTION public.get_user_email_for_hubspot(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email_for_hubspot(uuid) TO service_role;

-- 2. Restrict get_admin_user_data to verify the actual authenticated caller's admin role (or service_role) instead of trusting _caller_user_id.
CREATE OR REPLACE FUNCTION public.get_admin_user_data(_caller_user_id uuid)
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  name text,
  scans_used integer,
  pro_scan_limit integer,
  plan text,
  role app_role,
  is_admin boolean,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    s.name,
    s.scans_used,
    s.pro_scan_limit,
    s.plan,
    COALESCE(ur.role, 'user'::app_role) AS role,
    CASE
      WHEN ur.role = 'admin' THEN true
      ELSE false
    END AS is_admin,
    CASE
      WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'banned'
      WHEN ur.role = 'admin' THEN 'admin'
      ELSE 'active'
    END AS status
  FROM auth.users u
  LEFT JOIN public.subscribers s ON u.id = s.id
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  WHERE u.deleted_at IS NULL
    AND (
      auth.role() = 'service_role'
      OR (
        auth.uid() IS NOT NULL
        AND (_caller_user_id IS NULL OR _caller_user_id = auth.uid())
        AND public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  ORDER BY u.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_user_data(uuid) TO authenticated, service_role;

-- 3. Prevent direct client writes to agent_scans so fabricated trust scores cannot be inserted; only service_role (scan-agent) writes rows.
DROP POLICY IF EXISTS "Users can insert their own agent scans" ON public.agent_scans;
REVOKE INSERT, UPDATE, DELETE ON public.agent_scans FROM anon, authenticated;

-- 4. Replace tautological USING (true) policy on agent_tokens with a concrete predicate for listed catalog entries.
DROP POLICY IF EXISTS "Public read access to agent_tokens" ON public.agent_tokens;
CREATE POLICY "Public can read listed agent tokens"
  ON public.agent_tokens
  FOR SELECT
  TO anon, authenticated
  USING (coingecko_id <> '' AND name <> '' AND symbol <> '');