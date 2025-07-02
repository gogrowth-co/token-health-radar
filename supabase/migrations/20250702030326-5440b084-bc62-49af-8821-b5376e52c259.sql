-- Debug and fix admin role assignment for gmangabeira@gmail.com
DO $$
DECLARE
    target_user_id UUID;
    current_user_email TEXT;
    role_exists BOOLEAN;
BEGIN
    -- Get the current authenticated user ID (a97608f8-5df3-4780-9832-d15cbe8414ac)
    target_user_id := 'a97608f8-5df3-4780-9832-d15cbe8414ac';
    
    -- Verify this user ID corresponds to gmangabeira@gmail.com
    SELECT email INTO current_user_email 
    FROM auth.users 
    WHERE id = target_user_id;
    
    RAISE LOG 'Admin role fix - User ID: %, Email: %', target_user_id, current_user_email;
    
    IF current_user_email = 'gmangabeira@gmail.com' THEN
        -- Check if admin role already exists for this user
        SELECT EXISTS(
            SELECT 1 FROM public.user_roles 
            WHERE user_id = target_user_id AND role = 'admin'::app_role
        ) INTO role_exists;
        
        IF NOT role_exists THEN
            -- Remove any admin roles from other users with the same email (cleanup)
            DELETE FROM public.user_roles 
            WHERE role = 'admin'::app_role 
            AND user_id IN (
                SELECT id FROM auth.users WHERE email = 'gmangabeira@gmail.com'
            )
            AND user_id != target_user_id;
            
            -- Insert admin role for the correct user ID
            INSERT INTO public.user_roles (user_id, role)
            VALUES (target_user_id, 'admin'::app_role)
            ON CONFLICT (user_id, role) DO NOTHING;
            
            RAISE LOG 'Admin role assigned to user ID: % (gmangabeira@gmail.com)', target_user_id;
        ELSE
            RAISE LOG 'Admin role already exists for user ID: %', target_user_id;
        END IF;
    ELSE
        RAISE LOG 'ERROR: User ID % does not match gmangabeira@gmail.com (found: %)', target_user_id, current_user_email;
    END IF;
    
    -- Log final state for verification
    RAISE LOG 'Final admin roles in database:';
    FOR target_user_id IN 
        SELECT ur.user_id 
        FROM public.user_roles ur 
        WHERE ur.role = 'admin'::app_role
    LOOP
        SELECT email INTO current_user_email 
        FROM auth.users 
        WHERE id = target_user_id;
        
        RAISE LOG 'Admin user: % (%)', target_user_id, current_user_email;
    END LOOP;
END $$;