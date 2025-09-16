-- Enable Row Level Security on hubspot_contact_data table
ALTER TABLE public.hubspot_contact_data ENABLE ROW LEVEL SECURITY;

-- Policy 1: Service role has full access (for system operations)
CREATE POLICY "Service role full access to hubspot contact data" 
ON public.hubspot_contact_data 
FOR ALL 
USING (auth.role() = 'service_role');

-- Policy 2: Users can only view their own contact data
CREATE POLICY "Users can view their own hubspot contact data" 
ON public.hubspot_contact_data 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 3: Admins can view all hubspot contact data
CREATE POLICY "Admins can view all hubspot contact data" 
ON public.hubspot_contact_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'::app_role
  )
);

-- Policy 4: Only service role can insert/update hubspot contact data
-- (This data is typically synced from external systems)
CREATE POLICY "Service role can manage hubspot contact data" 
ON public.hubspot_contact_data 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update hubspot contact data" 
ON public.hubspot_contact_data 
FOR UPDATE 
USING (auth.role() = 'service_role');