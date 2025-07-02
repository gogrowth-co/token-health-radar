-- Ensure gmangabeira@gmail.com has admin access and fix any remaining issues
DO $$
DECLARE
    user_uuid uuid;
BEGIN
    -- Get user ID for gmangabeira@gmail.com
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'gmangabeira@gmail.com';
    
    IF user_uuid IS NOT NULL THEN
        -- Ensure admin role exists
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (user_uuid, 'admin'::app_role) 
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Ensure unlimited scans for admin
        INSERT INTO public.subscribers (id, pro_scan_limit, plan, name) 
        VALUES (user_uuid, 999999, 'admin', 'Gabriel Mangabeira')
        ON CONFLICT (id) DO UPDATE SET 
            pro_scan_limit = 999999,
            plan = 'admin';
    END IF;
    
    -- Also ensure manga82+3@gmail.com has admin access
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'manga82+3@gmail.com';
    
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (user_uuid, 'admin'::app_role) 
        ON CONFLICT (user_id, role) DO NOTHING;
        
        INSERT INTO public.subscribers (id, pro_scan_limit, plan) 
        VALUES (user_uuid, 999999, 'admin')
        ON CONFLICT (id) DO UPDATE SET 
            pro_scan_limit = 999999,
            plan = 'admin';
    END IF;
END $$;