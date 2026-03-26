

## LunarCrush Integration for Community Pillar

### Critical Correction to the Proposed Plan

The user's plan assumes all fields (`galaxy_score`, `alt_rank`, `sentiment`, `interactions_24h`, `posts_active`, `contributors_active`, `social_dominance`) come from a single endpoint (`/api4/public/topic/:topic/v1`). **This is wrong based on the actual API docs.**

The real API structure:
- **Coins endpoint** (`/api4/public/coins/:symbol/v1`): Returns `galaxy_score`, `alt_rank`, but NOT sentiment/interactions/contributors/posts/social_dominance
- **Topic endpoint** (`/api4/public/topic/:topic/v1`): Returns `interactions_24h`, `num_contributors`, `num_posts`, `types_sentiment` (per-platform object, not single number), but NOT galaxy_score/alt_rank/social_dominance
- **Coins List v2** (`/api4/public/coins/list/v2`): Returns ALL fields but for the entire coin list (expensive, 6000+ coins)

**Solution**: Call both Coins and Topic endpoints in parallel, merge results. Compute a weighted average sentiment from `types_sentiment`. Drop `social_dominance` from DB columns (not reliably available per-coin without the full list call).

### Files & Changes

#### 1. SQL Migration
Add 7 columns to `token_community_cache` (drop `social_dominance` from user's plan since it requires the expensive list endpoint):
- `galaxy_score numeric`
- `alt_rank integer`
- `sentiment numeric`
- `interactions_24h bigint`
- `posts_active integer`
- `contributors_active integer`
- `lunarcrush_fetched_at timestamptz`

#### 2. New file: `supabase/functions/_shared/lunarcrushAPI.ts`
- `fetchLunarCrush(symbol: string)` — calls BOTH:
  - `GET /api4/public/coins/{SYMBOL}/v1` (galaxy_score, alt_rank)
  - `GET /api4/public/topic/{symbol_lowercase}/v1` (interactions_24h, num_contributors, num_posts, types_sentiment)
  - Merges results, computes single sentiment as weighted average from `types_sentiment`
- `fetchLunarCrushWithCache(symbol, tokenAddress, chainId, supabase)` — checks `lunarcrush_fetched_at < 6h`, returns cached or calls `fetchLunarCrush`
- Auth: `Authorization: Bearer {LUNARCRUSH_API_KEY}` header
- On any error: log and return null (never throw)

#### 3. Edit: `supabase/functions/_shared/scoringUtils.ts`
Replace `calculateCommunityScore` with new signature matching user's plan (galaxyScore, sentiment, contributorsActive, postsActive, altRank, discordMembers, telegramMembers). Score 0-100 with no free base points. Weights as specified.

#### 4. Edit: `supabase/functions/run-token-scan/index.ts`
**EVM path** (line 271): Replace `fetchTwitterFollowers` with `fetchLunarCrushWithCache`. Derive `symbol` before Phase 2. Update Phase 3 community score call. Update Phase 4 community cache upsert with LunarCrush fields.

**Solana path** (line 538): Same changes. Replace Twitter fetch, update scoring, update upsert.

Remove `fetchTwitterFollowers` import (keep `fetchTelegramMembers`).

#### 5. Edit: `src/utils/categoryTransformers.ts`
- Add 7 new fields to `CommunityData` interface (keep legacy twitter fields for type compat)
- Replace `transformCommunityData` cards: Galaxy Score, Sentiment, Active Creators, Daily Engagements, AltRank, Discord Members, Telegram Members, Data Source footnote

#### 6. Edit: `src/components/copilot/blocks/CommunityCard.tsx`
Replace Twitter-centric display with Galaxy Score + Sentiment as primary, Active Creators + Engagements as secondary. Keep Discord + Telegram.

#### 7. `src/integrations/supabase/types.ts`
Will auto-update after migration. Add 7 new columns to `token_community_cache` types.

### Pre-requisite
User must add `LUNARCRUSH_API_KEY` to Supabase Edge Function secrets before deployment.

### Not Touched
- `apifyAPI.ts` (Telegram still uses it)
- `discordAPI.ts`, `moralisAPI.ts`, `goplusAPI.ts`
- All Security/Liquidity/Tokenomics/Development scoring and UI
- Auth, Stripe, RLS policies
- `ScanResult.tsx` (already does `SELECT *` from cache)

### Existing Build Errors
The build errors shown are pre-existing TypeScript issues in `goplusAPI.ts`, `moralisAPI.ts`, `secureHandler.ts`, `validation.ts`, `webacyAPI.ts`, `airtable-sync`, `check-scan-access`, `coingecko-mcp` — all unrelated to this change. They will be left as-is per scope.

