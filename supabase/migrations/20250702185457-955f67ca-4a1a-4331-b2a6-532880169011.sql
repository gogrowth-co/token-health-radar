-- Drop the old get_admin_user_data function that doesn't take parameters
DROP FUNCTION IF EXISTS public.get_admin_user_data();

-- Ensure we only have the version that takes _caller_user_id parameter
-- This function already exists from previous migration, but let's make sure it's properly defined
CREATE OR REPLACE FUNCTION public.get_admin_user_data(_caller_user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  name TEXT,
  scans_used INTEGER,
  pro_scan_limit INTEGER,
  plan TEXT,
  role app_role,
  is_admin BOOLEAN,
  status TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  -- Check if the calling user is an admin first
  SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    s.name,
    s.scans_used,
    s.pro_scan_limit,
    s.plan,
    COALESCE(ur.role, 'user'::app_role) as role,
    CASE 
      WHEN ur.role = 'admin' THEN true
      ELSE false
    END as is_admin,
    CASE 
      WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'banned'
      WHEN ur.role = 'admin' THEN 'admin'
      ELSE 'active'
    END as status
  FROM auth.users u
  LEFT JOIN public.subscribers s ON u.id = s.id
  LEFT JOIN public.user_roles ur ON u.id = ur.user_id
  WHERE u.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles caller_role 
      WHERE caller_role.user_id = _caller_user_id 
      AND caller_role.role = 'admin'::app_role
    )
  ORDER BY u.created_at DESC;
$$;