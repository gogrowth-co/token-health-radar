

## Rework Community Pillar for Free-Tier Reality

### Problem
The current implementation tries to parse `galaxy_score`, `alt_rank`, `interactions_24h`, `contributors_active`, and `posts_active` from LunarCrush — but all of these are redacted (`[---]`) on the free tier. Only **sentiment**, **social_dominance**, and **trend** are reliably available for free.

### Strategy
Rebuild the scoring and UI around the three metrics that actually work, plus Discord and Telegram. Mark paywalled metrics honestly in the UI.

### Changes

#### 1. `supabase/functions/_shared/lunarcrushAPI.ts` — Update parser and interface

- Add `social_dominance` and `trend` to the `LunarCrushData` interface
- Parse `social_dominance` from markdown: `### Social Dominance: 0.534%`
- Parse `trend` from the markdown summary text (look for trend indicator keywords or section)
- Keep existing parsers for galaxy_score, alt_rank, interactions, contributors, posts — they'll return `null` on free tier (already handled by redaction check)
- Update `fetchLunarCrushWithCache` to include `social_dominance` and `trend` in cache read/write

#### 2. DB migration — Add columns to `token_community_cache`

```sql
ALTER TABLE token_community_cache
  ADD COLUMN IF NOT EXISTS social_dominance numeric,
  ADD COLUMN IF NOT EXISTS trend text;
```

#### 3. `supabase/functions/_shared/scoringUtils.ts` — Rewrite `calculateCommunityScore`

New 0–100 scale using only confirmed free metrics:

| Metric | Max | Logic |
|---|---|---|
| Sentiment | 35 | ≥75% → 35, ≥60% → 22, ≥45% → 12, >0 → 5 |
| Social Dominance | 25 | ≥2% → 25, ≥0.5% → 15, ≥0.1% → 8, >0 → 3 |
| Trend | 10 | "up" → 10, "flat" → 5, "down" → 0 |
| Discord Members | 18 | >50K → 18, >10K → 14, >5K → 10, >1K → 6, >0 → 3 |
| Telegram Members | 12 | >50K → 12, >10K → 9, >5K → 6, >1K → 4, >0 → 2 |

Remove `galaxyScore`, `contributorsActive`, `postsActive`, `altRank` from input interface. Add `socialDominance` and `trend`. Keep fallback of 25 when no data.

#### 4. `supabase/functions/run-token-scan/index.ts` — Update both EVM and Solana paths

- Pass `socialDominance` and `trend` to `calculateCommunityScore`
- Remove `galaxyScore`, `contributorsActive`, `postsActive`, `altRank` from score call
- Add `social_dominance` and `trend` to community cache upsert

#### 5. `src/utils/categoryTransformers.ts` — Rework `CommunityData` and `transformCommunityData`

- Add `social_dominance` and `trend` to `CommunityData` interface
- Replace the 7-card layout with 5 cards:
  1. **Sentiment** — percentage with color badge (primary metric)
  2. **Social Dominance** — percentage of total crypto social conversation
  3. **Trend** — up/flat/down with arrow indicator
  4. **Discord Members** — count
  5. **Telegram Members** — count
- Add a "Pro" locked indicator row for Galaxy Score, AltRank, Engagements (showing they exist but require upgrade)
- Data source footnote: "Powered by LunarCrush · Social Sentiment Data"

#### 6. `src/components/copilot/blocks/CommunityCard.tsx` — Match new fields

- Primary display: Sentiment + Social Dominance
- Secondary: Trend indicator, Discord, Telegram
- Gray-out Galaxy Score / AltRank with lock icon and "Pro" label
- Normalize both camelCase and snake_case as before

#### 7. `src/integrations/supabase/types.ts` — Auto-updates after migration

### Not Touched
- Discord API, Telegram/Apify scraping, Security/Liquidity/Tokenomics/Development
- Auth, Stripe, RLS policies

### Technical Details

- The markdown parser already handles `[---]` redaction — galaxy_score etc. will naturally return `null`
- `social_dominance` regex: `/### Social Dominance:\s*([\d.]+)%/`
- `trend` regex: look for trend section or infer from summary keywords; fallback to `null`
- Cache TTL stays at 6 hours
- Scoring fallback of 25 when no LunarCrush + no Discord/Telegram data

