-- Secure hubspot_contact_data view to prevent public data leakage of emails/names
-- Note: hubspot_contact_data is a VIEW; RLS does not apply to views, so we lock it down via privileges.

DO $$
BEGIN
  -- Ensure the view exists before applying grants/revokes
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'hubspot_contact_data'
  ) THEN
    -- Revoke any public/anon/authenticated access
    REVOKE ALL ON VIEW public.hubspot_contact_data FROM PUBLIC;
    REVOKE ALL ON VIEW public.hubspot_contact_data FROM anon;
    REVOKE ALL ON VIEW public.hubspot_contact_data FROM authenticated;

    -- Grant read access only to the service_role (used by Edge Functions)
    GRANT SELECT ON VIEW public.hubspot_contact_data TO service_role;

    -- Prefer invoker's rights for the view (extra safety)
    ALTER VIEW public.hubspot_contact_data SET (security_invoker = on);
  END IF;
END $$;

-- Optional hardening: explicitly restrict function execution to admins if you later expose wrappers
-- (No changes to existing functions here to avoid breaking behavior)
