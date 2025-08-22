-- CRITICAL SECURITY FIX: Secure hubspot_contact_data view
-- This view contains sensitive customer information (emails, names, subscription data)
-- and is currently publicly accessible, creating a serious data breach risk.

-- Step 1: Revoke all public access to the hubspot_contact_data view
REVOKE ALL ON hubspot_contact_data FROM PUBLIC;
REVOKE ALL ON hubspot_contact_data FROM anon;
REVOKE ALL ON hubspot_contact_data FROM authenticated;

-- Step 2: Grant access only to service_role (for backend operations like HubSpot sync)
GRANT SELECT ON hubspot_contact_data TO service_role;

-- Step 3: Enable security_invoker to ensure the view runs with the caller's permissions
-- This prevents privilege escalation through the view
ALTER VIEW hubspot_contact_data SET (security_invoker = on);

-- Step 4: Create a security definer function for authorized access patterns
-- This allows controlled access for specific legitimate use cases
CREATE OR REPLACE FUNCTION get_user_hubspot_data(target_user_id uuid)
RETURNS TABLE(
    user_id uuid,
    email text,
    name text,
    signup_date timestamp with time zone,
    scan_credits_remaining integer,
    pro_subscriber boolean,
    last_scan_date timestamp with time zone,
    plan text,
    scans_used integer,
    pro_scan_limit integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
    -- Only allow users to access their own data, or service_role to access any data
    SELECT hcd.*
    FROM hubspot_contact_data hcd
    WHERE hcd.user_id = target_user_id
    AND (auth.uid() = target_user_id OR auth.role() = 'service_role');
$$;

-- Step 5: Create admin function for administrative access (admins only)
CREATE OR REPLACE FUNCTION get_admin_hubspot_data()
RETURNS TABLE(
    user_id uuid,
    email text,
    name text,
    signup_date timestamp with time zone,
    scan_credits_remaining integer,
    pro_subscriber boolean,
    last_scan_date timestamp with time zone,
    plan text,
    scans_used integer,
    pro_scan_limit integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
    -- Only allow admin users to access all data
    SELECT hcd.*
    FROM hubspot_contact_data hcd
    WHERE EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'::app_role
    );
$$;

-- Step 6: Grant execute permissions on the security functions
GRANT EXECUTE ON FUNCTION get_user_hubspot_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_hubspot_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_hubspot_data(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_hubspot_data() TO service_role;