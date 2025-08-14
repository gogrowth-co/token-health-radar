-- CRITICAL SECURITY FIXES

-- 1. Secure hubspot_contact_data table - currently has NO RLS policies
-- This table contains sensitive customer data and must be admin-only
ALTER TABLE public.hubspot_contact_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to HubSpot contact data"
ON public.hubspot_contact_data
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- 2. Tighten token_scans RLS - currently allows anonymous users to view ALL scan data
-- Remove overly permissive policies
DROP POLICY IF EXISTS "Anonymous users can view basic scan data" ON public.token_scans;
DROP POLICY IF EXISTS "Service role full access to token_scans" ON public.token_scans;

-- Replace with more restrictive policies
CREATE POLICY "Users can only view their own scans or public anonymous scans"
ON public.token_scans
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR 
  (is_anonymous = true AND user_id IS NULL) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- 3. Secure the legacy "Token Reports" table
ALTER TABLE public."Token Reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only access to legacy token reports"
ON public."Token Reports"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- 4. Fix database function search paths for security
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'user' THEN 2 
    END
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_user_data(_caller_user_id uuid)
 RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, name text, scans_used integer, pro_scan_limit integer, plan text, role app_role, is_admin boolean, status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert a default subscriber record for new users
  INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source)
  VALUES (
    NEW.id,
    'free',
    0,
    3,
    'signup'
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup process
  RAISE LOG 'Error creating subscriber record for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;