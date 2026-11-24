-- Security audit F1 (2026-11-23): the legacy service_role JWT leaked in this repo's history.
-- DB -> edge function calls stop carrying it inline and read the project's new secret key from vault.
--
-- The secret itself is never committed: before this migration runs, the vault secret `edge_service_key` is created out of band
-- (Management API) with the project's default `sb_secret_` key:
--   select vault.create_secret('<sb_secret_...>', 'edge_service_key', 'Project secret key for DB -> edge function calls (F1)');
-- When it is missing, the triggers skip the call (logged) instead of sending a dead key; the database write always succeeds.

CREATE OR REPLACE FUNCTION public.edge_service_key()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_service_key' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.edge_service_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_service_key() TO service_role;

-- Headers for a DB -> edge function call as the service: the secret on apikey and the same key as Bearer.
CREATE OR REPLACE FUNCTION public.edge_service_headers()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE WHEN k IS NULL THEN NULL
         ELSE jsonb_build_object('apikey', k, 'Authorization', 'Bearer ' || k, 'Content-Type', 'application/json') END
  FROM (SELECT public.edge_service_key() AS k) s;
$$;
REVOKE ALL ON FUNCTION public.edge_service_headers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_service_headers() TO service_role;

-- hubspot-sync callers (trigger_hubspot_sync, sync_all_users_to_hubspot*) keep calling hubspot_sync_bearer(); it now returns the new key.
CREATE OR REPLACE FUNCTION public.hubspot_sync_bearer()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.edge_service_key();
$$;
REVOKE ALL ON FUNCTION public.hubspot_sync_bearer() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hubspot_sync_bearer() TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_hubspot_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    request_id BIGINT;
    supabase_url TEXT := 'https://qaqebpcqespvzbfwawlp.supabase.co';
    headers JSONB;
    target_user UUID;
BEGIN
    BEGIN
        headers := public.edge_service_headers();
    EXCEPTION WHEN OTHERS THEN
        headers := NULL;
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
    IF headers IS NULL THEN
        RAISE LOG 'HubSpot sync skipped: vault secret edge_service_key missing';
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- A CRM failure must never roll back the subscriber update or scan insert that fired this trigger.
    BEGIN
        SELECT net.http_post(
            url := supabase_url || '/functions/v1/hubspot-sync',
            headers := headers,
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
BEGIN
    SELECT net.http_post(
        url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/hubspot-sync',
        headers := public.edge_service_headers(),
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
            url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/hubspot-sync',
            headers := public.edge_service_headers(),
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

CREATE OR REPLACE FUNCTION public.trigger_make_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    request_id BIGINT;
    headers JSONB := public.edge_service_headers();
BEGIN
    IF headers IS NULL THEN
        RAISE LOG 'Make.com webhook skipped for token_reports record %: vault secret edge_service_key missing', NEW.id;
        RETURN NEW;
    END IF;
    RAISE LOG 'Make.com webhook triggered for token_reports record: %', NEW.id;
    SELECT net.http_post(
        url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/make-webhook',
        headers := headers,
        body := jsonb_build_object('record', row_to_json(NEW))
    ) INTO request_id;
    RAISE LOG 'Make.com webhook request initiated with ID: %', request_id;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the database operation
    RAISE LOG 'Error in Make.com webhook trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_sitemap_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    request_id BIGINT;
    headers JSONB := public.edge_service_headers();
    operation_type TEXT := COALESCE(TG_OP, 'UNKNOWN');
BEGIN
    IF headers IS NULL THEN
        RAISE LOG 'Sitemap update skipped for token %: vault secret edge_service_key missing', COALESCE(NEW.token_symbol, OLD.token_symbol);
        RETURN COALESCE(NEW, OLD);
    END IF;
    RAISE LOG 'Sitemap update triggered for % operation on token: % (ID: %)',
        operation_type, COALESCE(NEW.token_symbol, OLD.token_symbol), COALESCE(NEW.id, OLD.id);
    BEGIN
        SELECT net.http_post(
            url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/generate-sitemap',
            headers := headers,
            body := jsonb_build_object(
                'trigger_source', 'database_trigger',
                'operation', operation_type,
                'token_symbol', COALESCE(NEW.token_symbol, OLD.token_symbol),
                'timestamp', now()
            )
        ) INTO request_id;
        RAISE LOG 'Sitemap regeneration request successful - ID: %, Operation: %, Token: %',
            request_id, operation_type, COALESCE(NEW.token_symbol, OLD.token_symbol);
    EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'ERROR in sitemap trigger for token %: % (SQLSTATE: %)',
            COALESCE(NEW.token_symbol, OLD.token_symbol), SQLERRM, SQLSTATE;
    END;
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- pg_cron refresh-token-pages: the new key on apikey and as Bearer, from the same vault secret.
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'refresh-token-pages';
  IF jid IS NOT NULL THEN
    PERFORM cron.alter_job(jid, command := $cmd$
      select net.http_post(
        url := 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/refresh-token-page',
        headers := public.edge_service_headers(),
        body := '{"due": true, "limit": 1, "max_age_hours": 20}'::jsonb,
        timeout_milliseconds := 150000
      );
    $cmd$);
  END IF;
END $$;
