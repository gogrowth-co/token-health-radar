-- Prevent public reads from exposing ip_address on anonymous agent scans
DROP POLICY IF EXISTS "Anonymous agent scans are publicly viewable" ON public.agent_scans;

-- Provide a safe public projection for anonymous agent scan discovery without IP addresses
CREATE OR REPLACE VIEW public.public_agent_scans AS
SELECT
  id,
  chain,
  agent_id,
  agent_name,
  raw_data,
  scores,
  user_id,
  created_at
FROM public.agent_scans
WHERE user_id IS NULL;

REVOKE ALL ON public.public_agent_scans FROM PUBLIC;
GRANT SELECT ON public.public_agent_scans TO anon, authenticated;

-- Restrict browser-visible subscriber columns so Stripe identifiers are server-only
REVOKE SELECT ON TABLE public.subscribers FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  name,
  source,
  created_at,
  updated_at,
  pro_scan_limit,
  scans_used,
  agent_scans_used,
  plan
) ON TABLE public.subscribers TO authenticated;

-- Preserve backend access for billing and scan quota edge functions
GRANT ALL ON TABLE public.subscribers TO service_role;
GRANT ALL ON TABLE public.agent_scans TO service_role;
GRANT ALL ON TABLE public.anonymous_scan_attempts TO service_role;