
-- 1. Consolidate token_scans INSERT policies
DROP POLICY IF EXISTS "Users can create their own scans" ON public.token_scans;
DROP POLICY IF EXISTS "Users can insert scans" ON public.token_scans;
DROP POLICY IF EXISTS "Users can insert their own scans" ON public.token_scans;

CREATE POLICY "Insert own or anonymous scans"
ON public.token_scans
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL AND is_anonymous = true)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- 2. Restrict stripe_* columns on subscribers from end users.
-- RLS still permits row access (user sees own row), but column-level revoke
-- prevents the Stripe identifiers from being SELECTable by anon/authenticated
-- roles. Service role retains full access.
REVOKE SELECT (stripe_customer_id, stripe_subscription_id)
  ON public.subscribers FROM anon, authenticated;
