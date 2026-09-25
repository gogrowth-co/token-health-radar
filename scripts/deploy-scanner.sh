#!/usr/bin/env bash
# Deploy gate for the token scanner (added 2026-09-25). Edge functions reach production only through
# `supabase functions deploy`, so this is where the golden check is enforced: nothing is deployed unless
# the offline unit tests AND the live golden set (hand-verified values for 13 cases) pass.
#
# Needs in the environment (never printed): SUPABASE_ACCESS_TOKEN, and the provider keys the golden set
# uses (COINGECKO_API_KEY, COINMARKETCAP_API_KEY, NANSEN_API_KEY, CHAINBASE_API_KEY; HELIUS_API_KEY optional).
# Usage: scripts/deploy-scanner.sh [function ...]   (default: run-token-scan token-health-mcp)
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_REF=qaqebpcqespvzbfwawlp
FUNCS=("$@")
[ ${#FUNCS[@]} -eq 0 ] && FUNCS=(run-token-scan token-health-mcp)

for v in SUPABASE_ACCESS_TOKEN COINGECKO_API_KEY COINMARKETCAP_API_KEY; do
  [ -n "${!v:-}" ] || { echo "gate: $v is not set" >&2; exit 2; }
done

echo "gate 1/3: type check"
deno check supabase/functions/_shared/scanner/*.ts supabase/functions/run-token-scan/index.ts supabase/functions/token-health-mcp/index.ts
echo "gate 2/3: offline unit tests"
deno test -A supabase/functions/_shared/scanner/scanner.test.ts
echo "gate 3/3: live golden set"
deno test -A supabase/functions/_shared/scanner/golden/

echo "gate passed; deploying: ${FUNCS[*]}"
for f in "${FUNCS[@]}"; do
  supabase functions deploy "$f" --project-ref "$PROJECT_REF"
done
