-- Enable Row Level Security on hubspot_contact_data view
ALTER TABLE hubspot_contact_data ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only view their own contact data
CREATE POLICY "Users can view their own contact data" 
ON hubspot_contact_data 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Service role needs full access for HubSpot sync operations
CREATE POLICY "Service role full access to hubspot contact data" 
ON hubspot_contact_data 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Policy 3: Admins can view all contact data for management purposes
CREATE POLICY "Admins can view all hubspot contact data" 
ON hubspot_contact_data 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'::app_role
));