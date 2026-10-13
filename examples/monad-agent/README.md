# Token Health Scan on Monad: pay-per-scan with x402, trust with ERC-8004

An AI agent that is about to buy a token needs a risk check it can pay for itself: no account, no API key,
no human. Token Health Scan sells that check for **0.02 USDC per scan over x402**, now settled on **Monad**.

Paying an API you found on the internet is itself a trust problem: is this the real service, and is the
payee its wallet? So Token Health Scan is also registered as an **ERC-8004 agent on Monad**, and the demo
agent here checks the onchain identity and reputation before it signs a payment, then rates the service
onchain afterwards.

```
agent                         Monad                                   Token Health Scan
  |  1. read agent card + wallet  -> ERC-8004 Identity Registry
  |  2. read feedback summary     -> ERC-8004 Reputation Registry
  |  3. GET /x402-scan  ------------------------------------------------>  402: Solana | Monad quote
  |  4. check: Monad USDC, price cap, payTo == registered agentWallet
  |  5. sign EIP-3009 USDC authorization (gasless) ---------------------->  verify -> scan -> settle
  |                                Monad facilitator settles USDC  <-----  only if the scan is scored
  |  <------------------------------------------------------------------  200: score + tx hash
  |  6. giveFeedback(value, tags, payment tx, result hash) -> Reputation Registry
```

## What is onchain

| Thing | Where |
|---|---|
| Identity Registry (ERC-8004) | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://monadvision.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |
| Reputation Registry (ERC-8004) | [`0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`](https://monadvision.com/address/0x8004BAa17C55a88189AE136b182e5fdA19dE9b63) |
| Token Health Scan agent | agentId in [`ths-agent.json`](./ths-agent.json); card stored onchain as a `data:` URI |
| Payee = agent wallet | [`0x12C479936bE431fBea60c376112561252b1E68Bb`](https://monadvision.com/address/0x12C479936bE431fBea60c376112561252b1E68Bb) |
| USDC (Circle, native) | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` |
| Facilitator | `https://x402-facilitator.molandak.org` (Monad's; pays gas, EIP-3009 `transferWithAuthorization`) |
| Public ledger of every paid scan | `GET https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/x402-ledger` |

## Server side (in this repo)

- [`supabase/functions/_shared/x402.ts`](../../supabase/functions/_shared/x402.ts): x402 v2 `exact` scheme with two
  rails. One 402 response quotes both Solana and Monad; the client picks one; verify and settle go to that
  rail's facilitator.
- [`supabase/functions/_shared/paidScan.ts`](../../supabase/functions/_shared/paidScan.ts): verify, then scan, then
  settle. USDC only moves after a scored result. Unscored tokens return 422 and are free. Each signed
  payment buys exactly one scan (unique payload hash), and is bound to the token it was quoted for.
- The same flow is exposed as a paid MCP tool (`token-health-mcp`, `_meta["x402/payment"]`).

## Run it

```bash
npm install
# wallets: ~/.config/ths-x402/monad-payee.json and monad-payer.json ({address, privateKey})
node register-ths.mjs                       # once, from the payee wallet: mint the ERC-8004 identity
node pay-scan.mjs ethereum 0x1f9840a85d5af5bf1d1762f925bdaddc4201f984
```

Guards in `pay-scan.mjs`: refuses any quote that is not Monad USDC, costs more than `MAX_PRICE_ATOMIC`
(default 0.02 USDC), pays anyone other than the registered agent wallet, or would push total spend past
`SPEND_CAP_ATOMIC` (default 1 USDC). Every paid scan is appended to `spend-log.json`.
