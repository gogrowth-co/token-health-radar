-- HubSpot sync: stop embedding a service-role JWT in function source.
-- The three functions below had an old (already invalid) service-role JWT hardcoded, so every
-- call to hubspot-sync was rejected (UNAUTHORIZED_LEGACY_JWT). They now read the bearer from
-- Supabase Vault secret 'hubspot_sync_service_key' (created out of band; never in migrations).
--
-- Also fixes trigger_hubspot_sync on token_scans: it sent the scan id as user_id. It now sends
-- token_scans.user_id and skips anonymous scans (an empty user_id makes hubspot-sync sync ALL contacts).

CREATE OR REPLACE FUNCTION public.hubspot_sync_bearer()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'hubspot_sync_service_key' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.hubspot_sync_bearer() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trigger_hubspot_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    bearer TEXT;
    target_user UUID;
BEGIN
    BEGIN
        bearer := public.hubspot_sync_bearer();
    EXCEPTION WHEN OTHERS THEN
        bearer := NULL;
    END;
    -- subscribers.id is the auth user id; token_scans has a separate user_id (null for anonymous scans).
    IF TG_TABLE_NAME = 'token_scans' THEN
        target_user := (to_jsonb(COALESCE(NEW, OLD)) ->> 'user_id')::uuid;
    ELSE
        target_user := COALESCE(NEW.id, OLD.id);
    END IF;

    IF target_user IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    IF bearer IS NULL THEN
        RAISE LOG 'HubSpot sync skipped: vault secret hubspot_sync_service_key missing';
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- A CRM failure must never roll back the subscriber update or scan insert that fired this trigger.
    BEGIN
        SELECT net.http_post(
            url := supabase_url || '/functions/v1/hubspot-sync',
            headers := jsonb_build_object('Authorization', 'Bearer ' || bearer, 'Content-Type', 'application/json'),
            body := jsonb_build_object('user_id', target_user)
        ) INTO request_id;
        RAISE LOG 'HubSpot sync request initiated with ID: %', request_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'HubSpot sync enqueue failed (write kept): %', SQLERRM;
    END;
    RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_all_users_to_hubspot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    bearer TEXT := public.hubspot_sync_bearer();
BEGIN
    SELECT net.http_post(
        url := supabase_url || '/functions/v1/hubspot-sync',
        headers := jsonb_build_object('Authorization', 'Bearer ' || bearer, 'Content-Type', 'application/json'),
        body := jsonb_build_object()
    ) INTO request_id;

    RAISE LOG 'Bulk HubSpot sync request initiated with ID: %', request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_all_users_to_hubspot_debug()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    bearer TEXT := public.hubspot_sync_bearer();
    response_status INTEGER;
    response_content TEXT;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM hubspot_contact_data;
    RAISE LOG 'Starting bulk HubSpot sync for % users', user_count;

    BEGIN
        SELECT status, content::text
        INTO response_status, response_content
        FROM net.http_post(
            url := supabase_url || '/functions/v1/hubspot-sync',
            headers := jsonb_build_object('Authorization', 'Bearer ' || bearer, 'Content-Type', 'application/json'),
            body := jsonb_build_object()
        );

        RAISE LOG 'Bulk HubSpot sync HTTP response - Status: %, Content: %', response_status, response_content;
        RETURN jsonb_build_object('success', response_status < 400, 'status', response_status, 'content', response_content, 'user_count', user_count, 'timestamp', now());
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Bulk HubSpot sync HTTP request failed: %', SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'user_count', user_count, 'timestamp', now());
    END;
END;
$function$;

-- These run with owner rights and call an edge function with a service key: not for API callers.
REVOKE ALL ON FUNCTION public.sync_all_users_to_hubspot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_all_users_to_hubspot_debug() FROM PUBLIC, anon, authenticated;
