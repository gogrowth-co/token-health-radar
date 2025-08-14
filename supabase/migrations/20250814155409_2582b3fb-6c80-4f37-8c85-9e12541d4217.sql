-- CRITICAL SECURITY FIXES - Phase 1: Data Exposure Prevention
-- (Excluding hubspot_contact_data which is a view - will address separately)

-- 1. Tighten anonymous_scan_attempts table (Currently allows ALL operations)
DROP POLICY IF EXISTS "Allow anonymous scan tracking" ON public.anonymous_scan_attempts;

-- Only service role can insert scan attempts (for tracking)
CREATE POLICY "Service role can insert scan attempts" 
ON public.anonymous_scan_attempts 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Only admins can view scan attempt data (IP addresses are sensitive)
CREATE POLICY "Admins can view scan attempts" 
ON public.anonymous_scan_attempts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) OR auth.role() = 'service_role'
);

-- 2. Clean up conflicting token_scans policies and secure properly
DROP POLICY IF EXISTS "Anonymous users can view basic scan data" ON public.token_scans;
DROP POLICY IF EXISTS "Service role full access to token_scans" ON public.token_scans;
DROP POLICY IF EXISTS "Users can create their own scans" ON public.token_scans;
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.token_scans;
DROP POLICY IF EXISTS "Users can view their own scans" ON public.token_scans;

-- Users can only insert their own scans or anonymous scans
CREATE POLICY "Users can insert scans" 
ON public.token_scans 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  (user_id IS NULL AND is_anonymous = true) OR 
  auth.role() = 'service_role'
);

-- Users can only view their own scans, anonymous scans (without user_id), or admins see all
CREATE POLICY "Users can view appropriate scans" 
ON public.token_scans 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (is_anonymous = true AND user_id IS NULL) OR
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ) OR
  auth.role() = 'service_role'
);

-- 3. Database Function Security Hardening - Add SET search_path to prevent SQL injection
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

-- Fix has_role function
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

-- Fix get_admin_user_data function
CREATE OR REPLACE FUNCTION public.get_admin_user_data(_caller_user_id uuid)
RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, name text, scans_used integer, pro_scan_limit integer, plan text, role app_role, is_admin boolean, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source)
  VALUES (
    NEW.id,
    'free',
    0,
    3,
    'signup'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error creating subscriber record for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Fix upsert_subscriber_by_email function
CREATE OR REPLACE FUNCTION public.upsert_subscriber_by_email(user_email text, user_name text DEFAULT NULL::text, user_plan text DEFAULT 'lifetime'::text, user_source text DEFAULT 'kiwify'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_id UUID;
    subscriber_exists BOOLEAN;
BEGIN
    -- Find user by email in auth.users
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        -- User doesn't exist in auth, we'll return NULL
        -- The webhook will handle this case
        RETURN NULL;
    END IF;
    
    -- Check if subscriber record exists
    SELECT EXISTS(SELECT 1 FROM public.subscribers WHERE id = user_id) INTO subscriber_exists;
    
    IF subscriber_exists THEN
        -- Update existing subscriber
        UPDATE public.subscribers 
        SET 
            plan = user_plan,
            source = user_source,
            name = COALESCE(user_name, name),
            updated_at = now()
        WHERE id = user_id;
    ELSE
        -- Insert new subscriber record
        INSERT INTO public.subscribers (id, plan, source, name, scans_used, pro_scan_limit)
        VALUES (user_id, user_plan, user_source, user_name, 0, 999999);
    END IF;
    
    RETURN user_id;
END;
$function$;