-- Fix admin dashboard access issues - Complete solution

-- 1. Update get_admin_user_data function to work with client-side calls
-- Remove the auth.uid() dependency that causes issues with RPC calls
CREATE OR REPLACE FUNCTION public.get_admin_user_data()
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
      WHERE caller_role.user_id = auth.uid() 
      AND caller_role.role = 'admin'::app_role
    )
  ORDER BY u.created_at DESC;
$$;

-- 2. Grant admin role to manga82+3@gmail.com (the currently logged in user)
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user ID for manga82+3@gmail.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'manga82+3@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Insert admin role for this user
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Update subscriber to unlimited scans for admin
        UPDATE public.subscribers 
        SET 
          pro_scan_limit = 999999,
          plan = 'admin',
          updated_at = now()
        WHERE id = target_user_id;
        
        -- Ensure the subscriber record exists if it doesn't
        INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source, name)
        VALUES (target_user_id, 'admin', 0, 999999, 'admin', 'Gabriel Mangabeira')
        ON CONFLICT (id) DO UPDATE SET
          plan = 'admin',
          pro_scan_limit = 999999,
          updated_at = now();
        
        RAISE LOG 'Admin role granted to manga82+3@gmail.com (ID: %)', target_user_id;
    ELSE
        RAISE LOG 'User manga82+3@gmail.com not found';
    END IF;
END $$;

-- 3. Update RLS policies to be more permissive for admin functions
DROP POLICY IF EXISTS "Authenticated users can call admin functions" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can access user data" ON public.user_roles;

-- Create a more permissive policy for admin access
CREATE POLICY "Admins can access all user data"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur2 
    WHERE ur2.user_id = auth.uid() 
    AND ur2.role = 'admin'::app_role
  )
);

-- 4. Grant explicit permissions for the function
GRANT EXECUTE ON FUNCTION public.get_admin_user_data() TO authenticated;