
-- Phase 1: Fix Database Schema & RLS Issues

-- First, let's make sure we have proper RLS policies for subscribers table
DROP POLICY IF EXISTS "Users can view their own subscriber data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can insert their own subscriber data" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update their own subscriber data" ON public.subscribers;

-- Create proper RLS policies for subscribers
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

-- Fix token_scans table - make user_id NOT NULL and add proper RLS
-- First, delete any orphaned scans without user_id
DELETE FROM public.token_scans WHERE user_id IS NULL;

-- Make user_id NOT NULL
ALTER TABLE public.token_scans ALTER COLUMN user_id SET NOT NULL;

-- Add RLS policies for token_scans table
DROP POLICY IF EXISTS "Users can view their own scans" ON public.token_scans;
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.token_scans;

CREATE POLICY "Users can view their own scans" 
ON public.token_scans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans" 
ON public.token_scans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure the trigger for auto-creating subscriber records exists and works
-- Re-create the handle_new_user function with better error handling
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
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup process
  RAISE LOG 'Error creating subscriber record for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create subscriber records for existing users who don't have them
INSERT INTO public.subscribers (id, plan, scans_used, pro_scan_limit, source)
SELECT 
  u.id,
  'free',
  0,
  3,
  'migration'
FROM auth.users u
LEFT JOIN public.subscribers s ON u.id = s.id
WHERE s.id IS NULL
ON CONFLICT (id) DO NOTHING;
