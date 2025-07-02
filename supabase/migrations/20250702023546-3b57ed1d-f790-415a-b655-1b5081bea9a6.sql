-- Fix admin role assignment for gmangabeira@gmail.com
DO $$
DECLARE
    correct_user_id UUID := '8eb1b572-7d2a-442c-9dbf-9acd369e11d8';
    incorrect_user_id UUID := 'a97608f8-5df3-4780-9832-d15cbe8414ac';
BEGIN
    -- Remove admin role from incorrect user ID
    DELETE FROM public.user_roles 
    WHERE user_id = incorrect_user_id AND role = 'admin'::app_role;
    
    -- Insert admin role for correct user ID
    INSERT INTO public.user_roles (user_id, role)
    VALUES (correct_user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE LOG 'Admin role removed from incorrect user ID: % and assigned to correct user ID: %', 
              incorrect_user_id, correct_user_id;
END $$;