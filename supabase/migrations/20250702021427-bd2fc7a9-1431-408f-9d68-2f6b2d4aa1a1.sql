-- Fix admin role assignment for gmangabeira@gmail.com
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user ID for gmangabeira@gmail.com
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'gmangabeira@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Insert admin role for this user
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin'::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE LOG 'Admin role assigned to user ID: %', target_user_id;
    ELSE
        RAISE LOG 'User with email gmangabeira@gmail.com not found';
    END IF;
END $$;