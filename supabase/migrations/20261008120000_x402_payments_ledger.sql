-- Pay-per-scan ledger for the x402 endpoint and MCP tool (USDC on Solana).
-- One row per attempt. payload_hash is unique so a signed payment buys one scan only.
create table if not exists public.x402_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  status text not null check (status in ('pending', 'settled', 'void', 'unsettled')),
  channel text not null check (channel in ('http', 'mcp')),
  network text not null,
  asset text not null,
  amount_atomic text not null,
  pay_to text not null,
  payer text,
  tx_signature text unique,
  payload_hash text not null unique,
  token_address text not null,
  chain text not null,
  overall_score integer,
  scoring_version text,
  error text
);

create index if not exists x402_payments_settled_idx on public.x402_payments (settled_at desc) where status = 'settled';

-- Service role only. The public view of this table is the x402-ledger function.
alter table public.x402_payments enable row level security;
