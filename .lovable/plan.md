

## AI Agents Category Page

### Overview
Create a new `/ai-agents` page that displays AI agent tokens from the `agent_tokens` table, enriched with health scores computed from the 5 existing cache tables.

### Files to Change

**1. Create `src/pages/AIAgents.tsx`** (new file)

The main page component with:

- **Data fetching**: On mount, query `agent_tokens` ordered by `display_order`. Then collect non-null `token_address` values and run 5 parallel queries against the cache tables (`token_security_cache`, `token_tokenomics_cache`, `token_liquidity_cache`, `token_community_cache`, `token_development_cache`) selecting `token_address, chain_id, score, updated_at`. Build a map of `token_address` to computed overall score (average of available category scores) and most recent `updated_at`.

- **SEO**: Helmet with title "AI Agent Tokens Health Scores | Token Health Scan" and appropriate meta description.

- **Hero section**: Gradient title "AI Agent Tokens", subtitle showing dynamic counts like "10 tokens tracked - 3 health-scored".

- **Filter pills**: Horizontal scrollable row with: All | Agents | Frameworks | Infrastructure | Launchpads | Scored Only. Filters by the `category` field, with "Scored Only" filtering to tokens that have a computed health score.

- **Sort toggle**: Two buttons -- "Market Cap" (default, descending, nulls last) and "Health Score" (scored tokens first by score desc, then unscored by market cap).

- **Token list**: Each token rendered as a row showing rank, logo (fallback to colored circle with first letter), name, symbol, chain badge (ETH/BASE/SOL/BSC with brand colors), category badge (color-coded), price, 24h change (green/red), market cap (abbreviated), health score circle (or "Scan" button if unscored), and "last scanned" relative time.

- **Row click**: Navigate to `/scan-result?address={token_address}&chain={chain_id}` using `useNavigate`.

- **Responsive**: Desktop shows all columns; mobile hides market cap column, stacks name/symbol vertically.

- **Loading state**: Skeleton shimmer cards while fetching.

- **Empty state**: "No AI agent tokens found" message.

- **Layout**: Wrapped in Navbar and Footer.

**2. Modify `src/App.tsx`** (2 lines only)

- Add import: `import AIAgents from "./pages/AIAgents";`
- Add route near other category pages (line ~115, near TokenDirectory/SolanaLaunchpads): `<Route path="/ai-agents" element={<AIAgents />} />`

### Technical Details

- Uses `supabase` client from `@/integrations/supabase/client`
- Uses existing components: `Navbar`, `Footer`, `Badge`, `Button`, `Card`, `Skeleton`
- Score color logic: green >= 75, amber >= 50, red < 50 (matching existing `band()` pattern)
- Currency formatting: reuses pattern from `tokenFormatters.ts` (`formatCurrencyValue`)
- Relative time: simple helper computing "Xm/h/d ago" from `updated_at` timestamps
- All data from public-read RLS tables, no auth required
- No other files modified

