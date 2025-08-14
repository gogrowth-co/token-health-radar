-- Fix critical security issue: Enable RLS and restrict access to hubspot_contact_data table

-- Enable Row Level Security on the hubspot_contact_data table
ALTER TABLE public.hubspot_contact_data ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow service role full access (needed for HubSpot sync functions)
CREATE POLICY "Service role full access to hubspot_contact_data"
ON public.hubspot_contact_data
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: Allow users to view only their own data
CREATE POLICY "Users can view their own hubspot contact data"
ON public.hubspot_contact_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Allow admin users to view all data (for admin dashboard functionality)
CREATE POLICY "Admins can view all hubspot contact data"
ON public.hubspot_contact_data
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Policy 4: Only service role can insert/update data (HubSpot sync should handle this)
CREATE POLICY "Service role can modify hubspot_contact_data"
ON public.hubspot_contact_data
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update hubspot_contact_data"
ON public.hubspot_contact_data
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);