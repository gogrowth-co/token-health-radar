-- Ensure gmangabeira@gmail.com has admin access
-- First, get the user ID for gmangabeira@gmail.com
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the user ID for gmangabeira@gmail.com
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'gmangabeira@gmail.com';
    
    IF user_uuid IS NOT NULL THEN
        -- Insert admin role for gmangabeira@gmail.com (ignore if already exists)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_uuid, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Update subscriber to have unlimited scans
        INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source, name)
        VALUES (user_uuid, 'admin', 0, 999999, 'admin', 'Admin User')
        ON CONFLICT (id) DO UPDATE SET
            plan = 'admin',
            pro_scan_limit = 999999,
            updated_at = now();
            
        RAISE LOG 'Admin access granted to gmangabeira@gmail.com (ID: %)', user_uuid;
    ELSE
        RAISE LOG 'User gmangabeira@gmail.com not found in auth.users';
    END IF;
END
$$;