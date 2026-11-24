ALTER POLICY "Service role full access to agent_tokens" ON public.agent_tokens TO service_role;

-- Regression assertions: these only simulate claims inside this transaction and restore them.
DO $test$
DECLARE
  admin_id uuid;
  member_id uuid;
  saved_claims text := current_setting('request.jwt.claims', true);
  saved_role text := current_setting('request.jwt.claim.role', true);
  saved_sub text := current_setting('request.jwt.claim.sub', true);
BEGIN
  SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  SELECT u.id INTO member_id FROM auth.users u WHERE NOT public.has_role(u.id, 'admin'::public.app_role) LIMIT 1;

  IF has_function_privilege('anon', 'public.get_user_email_for_hubspot(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_user_email_for_hubspot(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Email lookup still allows direct client execution';
  END IF;
  IF has_function_privilege('anon', 'public.get_admin_user_data(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Admin list still allows anonymous execution';
  END IF;
  IF has_table_privilege('anon', 'public.agent_scans', 'INSERT')
     OR has_table_privilege('authenticated', 'public.agent_scans', 'INSERT') THEN
    RAISE EXCEPTION 'Client can still fabricate agent scores';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.agent_scans', 'INSERT') THEN
    RAISE EXCEPTION 'Server scanner lost scan write access';
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  IF EXISTS (SELECT 1 FROM public.get_admin_user_data(admin_id)) THEN
    RAISE EXCEPTION 'Anonymous caller can impersonate administrator';
  END IF;
  IF public.get_user_email_for_hubspot(admin_id) IS NOT NULL THEN
    RAISE EXCEPTION 'Anonymous caller can read another email';
  END IF;

  IF member_id IS NOT NULL AND admin_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', member_id::text, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'sub', member_id)::text, true);
    IF EXISTS (SELECT 1 FROM public.get_admin_user_data(admin_id)) THEN
      RAISE EXCEPTION 'Ordinary member can impersonate administrator';
    END IF;
    IF public.get_user_email_for_hubspot(admin_id) IS NOT NULL THEN
      RAISE EXCEPTION 'Ordinary member can read another email';
    END IF;

    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'sub', admin_id)::text, true);
    IF NOT EXISTS (SELECT 1 FROM public.get_admin_user_data(admin_id)) THEN
      RAISE EXCEPTION 'Verified administrator lost user-list access';
    END IF;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  IF admin_id IS NOT NULL AND public.get_user_email_for_hubspot(admin_id) IS NULL THEN
    RAISE EXCEPTION 'Trusted automation lost contact email access';
  END IF;

  PERFORM set_config('request.jwt.claims', COALESCE(saved_claims, ''), true);
  PERFORM set_config('request.jwt.claim.role', COALESCE(saved_role, ''), true);
  PERFORM set_config('request.jwt.claim.sub', COALESCE(saved_sub, ''), true);
END;
$test$;