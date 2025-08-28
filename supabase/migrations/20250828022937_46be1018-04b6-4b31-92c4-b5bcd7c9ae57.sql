-- Enable RLS on hubspot_contact_data table to protect sensitive customer information
ALTER TABLE public.hubspot_contact_data ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only view their own data
CREATE POLICY "Users can view their own hubspot data" 
ON public.hubspot_contact_data 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can only update their own data (for profile updates)
CREATE POLICY "Users can update their own hubspot data" 
ON public.hubspot_contact_data 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy 3: Service role has full access (for backend operations and data sync)
CREATE POLICY "Service role full access to hubspot data" 
ON public.hubspot_contact_data 
FOR ALL 
USING (auth.role() = 'service_role');

-- Policy 4: Admin users can view all data (for customer support and management)
CREATE POLICY "Admins can view all hubspot data" 
ON public.hubspot_contact_data 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Policy 5: Admin users can update all data (for customer support)
CREATE POLICY "Admins can update all hubspot data" 
ON public.hubspot_contact_data 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);

-- Policy 6: Only service role can insert new records (data comes from external sync)
CREATE POLICY "Service role can insert hubspot data" 
ON public.hubspot_contact_data 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');