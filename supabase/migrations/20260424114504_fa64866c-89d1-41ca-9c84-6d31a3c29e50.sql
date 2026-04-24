-- Remove the temporary view to avoid security-definer-view warnings
DROP VIEW IF EXISTS public.public_agent_scans;

-- Restore anonymous public reads for agent scan discovery, while relying on column grants to block IP addresses
CREATE POLICY "Anonymous agent scans are publicly viewable"
ON public.agent_scans
FOR SELECT
TO anon, authenticated
USING (user_id IS NULL);

-- Remove broad browser SELECT grants and grant only non-sensitive columns
REVOKE SELECT ON TABLE public.agent_scans FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  chain,
  agent_id,
  agent_name,
  raw_data,
  scores,
  user_id,
  created_at
) ON TABLE public.agent_scans TO anon, authenticated;

-- Preserve backend access for edge functions and SEO jobs
GRANT ALL ON TABLE public.agent_scans TO service_role;