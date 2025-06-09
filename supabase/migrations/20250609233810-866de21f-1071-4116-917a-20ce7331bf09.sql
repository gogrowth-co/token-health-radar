
-- Create a function to trigger HubSpot sync for subscriber changes
CREATE OR REPLACE FUNCTION public.trigger_hubspot_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get the user's email from auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = COALESCE(NEW.id, OLD.id);
    
    -- Log the trigger for debugging
    RAISE LOG 'HubSpot sync triggered for user: %', user_email;
    
    -- We'll call the edge function from the application layer
    -- This trigger just ensures we have a way to track changes
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for subscriber table changes
DROP TRIGGER IF EXISTS hubspot_sync_on_subscriber_change ON public.subscribers;
CREATE TRIGGER hubspot_sync_on_subscriber_change
    AFTER INSERT OR UPDATE ON public.subscribers
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_hubspot_sync();

-- Create trigger for token scans (to update last scan date)
DROP TRIGGER IF EXISTS hubspot_sync_on_scan ON public.token_scans;
CREATE TRIGGER hubspot_sync_on_scan
    AFTER INSERT ON public.token_scans
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_hubspot_sync();

-- Create a view to easily get HubSpot contact data
CREATE OR REPLACE VIEW public.hubspot_contact_data AS
SELECT 
    s.id as user_id,
    u.email,
    COALESCE(s.name, split_part(u.email, '@', 1)) as name,
    s.created_at as signup_date,
    COALESCE(s.pro_scan_limit - s.scans_used, 0) as scan_credits_remaining,
    (s.plan != 'free' AND s.plan IS NOT NULL) as pro_subscriber,
    (SELECT MAX(scanned_at) FROM public.token_scans WHERE user_id = s.id) as last_scan_date,
    s.plan,
    s.scans_used,
    s.pro_scan_limit
FROM public.subscribers s
JOIN auth.users u ON s.id = u.id
WHERE u.email IS NOT NULL;
