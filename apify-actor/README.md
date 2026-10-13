## What does Token Health Scan do?

Token Health Scan scores a crypto token from 0 to 100 and shows the evidence behind every point. Give it a chain and a contract address. It returns one overall health score and five dimension scores: **security, liquidity, tokenomics, community and development**.

It works on **Ethereum, Base, BNB Chain, Arbitrum, Polygon and Solana**.

The same scan is sold to AI agents over x402 at [tokenhealthscan.com/agent-payments](https://tokenhealthscan.com/agent-payments). Every payment there is a public on-chain transaction, so you can check the track record before you buy.

## Why use it?

- **Screen tokens before you touch them.** Trading agents and bots can gate entries on a minimum score, for example security 50 or higher and liquidity 40 or higher.
- **See why, not only how much.** Each dimension lists the inputs it used (value, points earned, max points) and the inputs it left out, with the reason.
- **Pay only for a verdict.** If a token lacks enough verified data for a score, you get the partial result and are not charged.

## What you get

| Field | Example |
|---|---|
| `symbol`, `name` | AERO, Aerodrome Finance |
| `overall_score` | 64 |
| `verdict` | Moderate risk token (64/100). Weakest dimension: tokenomics at 40/100. |
| `scores` | `{"security":80,"liquidity":85,"tokenomics":40,"community":72,"development":41}` |
| `evidence` | Per dimension: inputs used with value, points and max, plus inputs excluded with the reason |
| `charged` | `true` only for scored tokens |

What each dimension checks:

| Dimension | Inputs |
|---|---|
| Security | Honeypot, mint authority, blacklist, pausable, max tax, upgradeable proxy. On Solana: freeze authority, permanent delegate, transfer hook |
| Liquidity | DEX liquidity, 24h volume, slippage on a $100k trade, locked liquidity |
| Tokenomics | Top 10 holder share, circulating ratio, unlocks in the next 90 days |
| Community | Sentiment, Telegram and Discord members, social trend |
| Development | Commits in 30 days, contributors, last push, issue close ratio, stars, forks |

## How to use it

1. Add tokens as `chain:address`, one per line:
   - `base:0x940181a94a35a4569e4529a3cdfb74e38fd98631`
   - `solana:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`
2. Leave **Include evidence** on for the full breakdown, or turn it off for scores only.
3. Run. Results land in the dataset, one row per token.

Up to 100 tokens per run. A scan takes 5 to 20 seconds, and three run in parallel.

From an AI agent, call it through the [Apify MCP server](https://mcp.apify.com) or the Apify API like any other Actor.

## Pricing

**$0.02 per scored token.** Tokens that are not scored, have an invalid address, or fail to scan are free. Set a maximum charge per run and the Actor stops when it is reached.

## Input example

```json
{
  "tokens": ["base:0x940181a94a35a4569e4529a3cdfb74e38fd98631"],
  "includeEvidence": true
}
```

## Output statuses

| `status` | Meaning | Charged |
|---|---|---|
| `scored` | Full score and verdict | Yes |
| `not_scored` | Not enough verified data for a verdict | No |
| `invalid_input` | Unsupported chain or malformed address | No |
| `failed` | Scan error after one retry | No |

## Is this financial advice?

No. The score measures on-chain and off-chain signals at scan time. It does not predict price.

## Open source

The scanner, the x402 payment server and this Actor are MIT licensed: [github.com/gogrowth-co/token-health-radar](https://github.com/gogrowth-co/token-health-radar). Built by Gabriel Mangabeira ([mangabeira.net](https://mangabeira.net)).
