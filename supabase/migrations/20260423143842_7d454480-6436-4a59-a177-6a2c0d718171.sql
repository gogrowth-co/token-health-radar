-- Restrict agent_scans SELECT: hide user_id linkage from the public.
-- Anonymous scans (user_id IS NULL) remain publicly viewable; authenticated
-- users see their own scans; service role retains full access.
DROP POLICY IF EXISTS "Anyone can read agent scans" ON public.agent_scans;

CREATE POLICY "Anonymous agent scans are publicly viewable"
ON public.agent_scans
FOR SELECT
TO anon, authenticated
USING (user_id IS NULL);

CREATE POLICY "Users can view their own agent scans"
ON public.agent_scans
FOR SELECT
TO authenticated
USING (user_id = auth.uid());