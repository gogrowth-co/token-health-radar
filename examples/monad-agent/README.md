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
| Token Health Scan agent | **agentId 10387** ([8004scan](https://8004scan.io/agents/monad/10387), [register tx](https://monadvision.com/tx/0x0a049fbcd3260435f9940435b82264d5d5e63bc34ddfb1b3a96232fa9941ff37)); card stored onchain as a `data:` URI |
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

## Onchain record (Monad mainnet, 2026-10-13)

Each row is a real x402 payment of 0.02 USDC from the demo agent, followed by its ERC-8004 feedback.

| Token scanned | Score | x402 payment | ERC-8004 feedback |
|---|---|---|---|
| UNI (Ethereum) | 69 | [tx](https://monadvision.com/tx/0x3a8ef5d0d355787c7e875854fc18b1d8799f6af320a769a983504fef9d11d214) | [tx](https://monadvision.com/tx/0x725691a9df896d7dc69b0e9b4c7d27d15fd27df5a45fc722a2ff4a5b7e1c7398) |
| AERO (Base) | 64 | [tx](https://monadvision.com/tx/0x32327b352ae094647abc0ec0a437f72422b271b897af5792994a116fa68409c8) | [tx](https://monadvision.com/tx/0xe9e5e1348eb3e9ecb929b8b76597ed82eace3585a1ec9b12c65c0bf23a24f8bc) |
| ARB (Arbitrum) | 63 | [tx](https://monadvision.com/tx/0x3bd2ad87f709aaa2cbf274894c3a203e19f069339c467d47c4d2136c156faa3e) | [tx](https://monadvision.com/tx/0x710684bffe04149e237d45a03c282ea0a31504bd8114e739fdd5f80b63a2d8ea) |
| JUP (Solana) | 68 | [tx](https://monadvision.com/tx/0x7e816f672e9d399cde5ec0ec2381c2dbd0d8cae40c0b9a1fcc80a5eef6aa73d4) | [tx](https://monadvision.com/tx/0x8c0df659108424e8ee41c82bcb6f39818e93d8c4357744d247561a3b74ce7bf9) |

## Impersonation test

`spoof-server.mjs` forwards the real 402 but swaps the Monad payee. The agent refuses before signing:

```
node spoof-server.mjs &
node pay-scan.mjs ethereum 0x1f9840a85d5af5bf1d1762f925bdaddc4201f984 --endpoint http://localhost:4020
    FAIL  payTo == ERC-8004 agentWallet
Refusing to pay.
```
