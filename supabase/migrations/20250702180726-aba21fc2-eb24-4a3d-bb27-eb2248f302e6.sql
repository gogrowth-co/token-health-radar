-- Fix infinite recursion in user_roles RLS policies
-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can access all user data" ON public.user_roles;

-- Create clean, non-recursive policies
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access" ON public.user_roles
FOR ALL USING (auth.role() = 'service_role');

-- Update the get_admin_user_data function to use auth.uid() directly
CREATE OR REPLACE FUNCTION public.get_admin_user_data()
RETURNS TABLE(
  id uuid, 
  email text, 
  created_at timestamp with time zone, 
  last_sign_in_at timestamp with time zone, 
  name text, 
  scans_used integer, 
  pro_scan_limit integer, 
  plan text, 
  role app_role, 
  is_admin boolean, 
  status text
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  -- Use SECURITY DEFINER to bypass RLS and check admin status
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
      WHERE caller_role.user_id = auth.uid() 
      AND caller_role.role = 'admin'::app_role
    )
  ORDER BY u.created_at DESC;
$$;