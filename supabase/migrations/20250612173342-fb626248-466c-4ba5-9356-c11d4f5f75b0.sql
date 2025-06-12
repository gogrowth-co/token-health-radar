
-- Fix RLS policies and add auto-creation for subscribers table

-- First enable RLS on subscribers table if not already enabled
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own subscriber data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscriber data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscriber data" ON public.subscribers;

-- Add RLS policies for subscribers table that allow users to manage their own records
CREATE POLICY "Users can view their own subscriber data" 
ON public.subscribers 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own subscriber data" 
ON public.subscribers 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own subscriber data" 
ON public.subscribers 
FOR UPDATE 
USING (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert a default subscriber record for new users
  INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source)
  VALUES (
    NEW.id,
    'free',
    0,
    3,
    'signup'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup process
  RAISE LOG 'Error creating subscriber record for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create subscriber records for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
