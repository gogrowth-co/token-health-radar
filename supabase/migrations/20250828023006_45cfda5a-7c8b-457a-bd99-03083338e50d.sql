-- The hubspot_contact_data is a view that exposes sensitive data
-- We need to restrict access to this view by creating a security definer function
-- that enforces proper access control

-- Drop the existing view
DROP VIEW IF EXISTS public.hubspot_contact_data;

-- Create a more secure view with built-in access control
-- This view will only show data to users who should have access
CREATE VIEW public.hubspot_contact_data 
WITH (security_invoker=true) AS 
SELECT 
    s.id AS user_id,
    CASE 
        -- Users can see their own email
        WHEN auth.uid() = s.id THEN get_user_email_for_hubspot(s.id)
        -- Admins can see all emails
        WHEN EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'::app_role
        ) THEN get_user_email_for_hubspot(s.id)
        -- Service role can see all emails
        WHEN auth.role() = 'service_role' THEN get_user_email_for_hubspot(s.id)
        -- Others see redacted email
        ELSE '[REDACTED]'
    END AS email,
    CASE 
        -- Users can see their own name
        WHEN auth.uid() = s.id THEN COALESCE(s.name, split_part(get_user_email_for_hubspot(s.id), '@', 1))
        -- Admins can see all names
        WHEN EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'::app_role
        ) THEN COALESCE(s.name, split_part(get_user_email_for_hubspot(s.id), '@', 1))
        -- Service role can see all names
        WHEN auth.role() = 'service_role' THEN COALESCE(s.name, split_part(get_user_email_for_hubspot(s.id), '@', 1))
        -- Others see redacted name
        ELSE '[REDACTED]'
    END AS name,
    s.created_at AS signup_date,
    COALESCE((s.pro_scan_limit - s.scans_used), 0) AS scan_credits_remaining,
    ((s.plan <> 'free') AND (s.plan IS NOT NULL)) AS pro_subscriber,
    (
        SELECT max(token_scans.scanned_at) 
        FROM token_scans
        WHERE token_scans.user_id = s.id
    ) AS last_scan_date,
    s.plan,
    s.scans_used,
    s.pro_scan_limit
FROM subscribers s
WHERE 
    -- Only show records the user should have access to
    (
        -- Users can see their own data
        auth.uid() = s.id
        OR 
        -- Admins can see all data
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'::app_role
        )
        OR 
        -- Service role can see all data
        auth.role() = 'service_role'
    )
    AND get_user_email_for_hubspot(s.id) IS NOT NULL;