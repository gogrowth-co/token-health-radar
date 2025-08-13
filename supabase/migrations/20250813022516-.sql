-- Lock down public.hubspot_contact_data (it's a VIEW) to prevent public access to emails/names
-- RLS does not apply to views; we use privileges instead.

-- Revoke any default/public grants
REVOKE ALL ON TABLE public.hubspot_contact_data FROM PUBLIC;
REVOKE ALL ON TABLE public.hubspot_contact_data FROM anon;
REVOKE ALL ON TABLE public.hubspot_contact_data FROM authenticated;

-- Allow only the service_role (used by Edge Functions and secure server contexts)
GRANT SELECT ON TABLE public.hubspot_contact_data TO service_role;

-- Ensure invoker's rights (helps when called through different roles)
ALTER VIEW public.hubspot_contact_data SET (security_invoker = on);
