-- Keep the scan summary next to each payment so the public ledger can show what was bought.
alter table public.x402_payments
  add column if not exists token_symbol text,
  add column if not exists scores jsonb;
