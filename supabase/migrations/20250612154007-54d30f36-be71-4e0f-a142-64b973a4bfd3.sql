
-- Add missing service role policies to fix edge function access

-- Add service role policy for subscribers table
CREATE POLICY "Service role full access to subscribers" 
ON public.subscribers 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Add service role policy for token_scans table  
CREATE POLICY "Service role full access to token_scans"
ON public.token_scans 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Ensure both tables have RLS enabled (should already be enabled but double-checking)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_scans ENABLE ROW LEVEL SECURITY;
