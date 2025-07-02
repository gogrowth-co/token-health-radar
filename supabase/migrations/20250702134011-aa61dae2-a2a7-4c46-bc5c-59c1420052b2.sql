-- Fix admin dashboard access issues

-- 1. Update the get_admin_user_data function to work properly with client-side calls
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
      SELECT 1 FROM public.user_roles ur2 
      WHERE ur2.user_id = auth.uid() 
      AND ur2.role = 'admin'::app_role
    )
  ORDER BY u.created_at DESC;
$$;

-- 2. Update gmangabeira@gmail.com subscriber data to unlimited scans
UPDATE public.subscribers 
SET 
  pro_scan_limit = 999999,
  plan = 'admin',
  updated_at = now()
WHERE id = 'a97608f8-5df3-4780-9832-d15cbe8414ac';

-- 3. Ensure the subscriber record exists if it doesn't
INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source, name)
VALUES ('a97608f8-5df3-4780-9832-d15cbe8414ac', 'admin', 0, 999999, 'admin', 'Gabriel Mangabeira')
ON CONFLICT (id) DO UPDATE SET
  plan = 'admin',
  pro_scan_limit = 999999,
  updated_at = now();

-- 4. Add RLS policy to allow authenticated users to call the function
CREATE POLICY "Authenticated users can call admin functions"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);