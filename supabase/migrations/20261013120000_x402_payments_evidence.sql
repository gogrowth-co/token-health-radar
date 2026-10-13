-- Store the score breakdown each paid scan returned (inputs used with points, inputs excluded with reasons),
-- so the public ledger shows why a token scored what it did, not only the numbers.
alter table public.x402_payments add column if not exists evidence jsonb;

-- Backfill settled rows from the scan stored at payment time (latest token_scans row for that token and chain
-- at or before settlement; run-token-scan writes it in the same request).
update public.x402_payments p
set evidence = (
  select jsonb_build_object('completeness_pct', ts.completeness_pct, 'dimensions', ts.dimension_scores->'dimensions')
  from public.token_scans ts
  where lower(ts.token_address) = lower(p.token_address)
    and ts.chain_id = case p.chain when 'ethereum' then '0x1' when 'base' then '0x2105' when 'bsc' then '0x38'
                                   when 'polygon' then '0x89' when 'arbitrum' then '0xa4b1' else p.chain end
    and ts.scanned_at <= p.settled_at
    and ts.dimension_scores ? 'dimensions'
  order by ts.scanned_at desc
  limit 1
)
where p.status = 'settled' and p.evidence is null;
