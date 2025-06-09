
-- Drop the existing view first
DROP VIEW IF EXISTS public.hubspot_contact_data;

-- Create a security definer function to safely get user emails
CREATE OR REPLACE FUNCTION public.get_user_email_for_hubspot(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Recreate the hubspot_contact_data view with better security
CREATE VIEW public.hubspot_contact_data AS
SELECT 
    s.id as user_id,
    public.get_user_email_for_hubspot(s.id) as email,
    COALESCE(s.name, split_part(public.get_user_email_for_hubspot(s.id), '@', 1)) as name,
    s.created_at as signup_date,
    COALESCE(s.pro_scan_limit - s.scans_used, 0) as scan_credits_remaining,
    (s.plan != 'free' AND s.plan IS NOT NULL) as pro_subscriber,
    (SELECT MAX(scanned_at) FROM public.token_scans WHERE user_id = s.id) as last_scan_date,
    s.plan,
    s.scans_used,
    s.pro_scan_limit
FROM public.subscribers s
WHERE public.get_user_email_for_hubspot(s.id) IS NOT NULL;

-- Enable RLS on the view
ALTER VIEW public.hubspot_contact_data SET (security_invoker = on);

-- Grant necessary permissions for the view to work with edge functions
GRANT SELECT ON public.hubspot_contact_data TO service_role;
