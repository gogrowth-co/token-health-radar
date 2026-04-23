
# Build TokenHealthScan CMS with Claude MCP as the Source of Truth

## Goal

Add an English-only CMS to `tokenhealthscan.com` where **Claude MCP is the primary content input and management layer**.

This revised plan removes all Notion architecture. There will be no Notion webhook, no Notion sync function, no Notion schema assumptions, and no Notion secrets.

The CMS will support:

- Claude Desktop MCP publishing and editing
- Admin UI fallback for manual review/editing
- Public article hub at `/publications`
- Public article pages at `/publications/:slug`
- English-only content for now
- RSS and `llms.txt` generation
- Bot-facing prerendered snapshots
- Integration into the existing Cloudflare Worker + Supabase `seo-snapshot` architecture
- Preservation of the existing token/agent scan SEO system

---

## What changes from the prior plan

Remove entirely:

```text
sync-notion-content
NOTION_WEBHOOK_SECRET
Notion webhook validation
Notion payload parsing
Notion database assumptions
Notion-driven one-way sync
```

Claude MCP becomes the source:

```text
Claude Desktop
  → mcp-content Edge Function
  → pages / page_translations tables
  → snapshots / RSS / llms.txt
  → public rendering + bot prerendering
```

Admin UI remains useful, but it is secondary:

```text
Primary authoring: Claude MCP
Secondary/manual edits: /admin CMS UI
```

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    CONTENT SOURCE                            │
├──────────────────────────────────────────────────────────────┤
│ Claude Desktop                                               │
│  └─ MCP server config                                        │
│      └─ POST Supabase Edge Function: mcp-content             │
└───────────────────────────────┬──────────────────────────────┘
                                │ X-MCP-Secret
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    CMS API LAYER                             │
├──────────────────────────────────────────────────────────────┤
│ supabase/functions/mcp-content                               │
│                                                              │
│ Tools:                                                       │
│ - list_pages                                                 │
│ - get_page                                                   │
│ - upsert_page                                                │
│ - publish_page                                               │
│ - unpublish_page                                             │
│ - delete_page                                                │
│ - upload_image                                               │
│ - regenerate_outputs                                         │
└───────────────────────────────┬──────────────────────────────┘
                                │ service role writes
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                         │
├──────────────────────────────────────────────────────────────┤
│ pages                                                        │
│ page_translations, language = 'en'                           │
│ user_roles, already existing                                 │
└───────────────────────────────┬──────────────────────────────┘
                                │ publish/update/delete
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    GENERATED OUTPUTS                         │
├──────────────────────────────────────────────────────────────┤
│ regenerate-cms-snapshot                                      │
│ generate-cms-rss                                             │
│ generate-cms-llms-txt                                        │
│ submit-indexnow, optional                                    │
└───────────────────────────────┬──────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE STORAGE                          │
├──────────────────────────────────────────────────────────────┤
│ blog-images                                                  │
│  - CMS cover images                                          │
│  - rss.xml                                                   │
│  - rss/en.xml or rss-en.xml                                  │
│  - llms.txt                                                  │
│  - llms-full.txt                                             │
│                                                              │
│ seo-snapshots                                                │
│  - publications/:slug/index.html                             │
└───────────────────────────────┬──────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                    DELIVERY                                  │
├──────────────────────────────────────────────────────────────┤
│ Cloudflare Worker                                            │
│  - bots on /publications/* → seo-snapshot                    │
│  - /rss.xml, /llms.txt → Supabase Storage                    │
│  - humans → Lovable SPA                                      │
│                                                              │
│ React SPA                                                    │
│  - /admin CMS UI                                             │
│  - /publications                                             │
│  - /publications/:slug                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Existing project constraints to preserve

1. Do not remove or replace token scan routes.
2. Do not remove or replace agent scan routes.
3. Do not replace existing `seo-snapshot`; extend it.
4. Do not replace `/admin/users`; keep existing user management intact.
5. Do not store roles on users or profiles.
6. Reuse the existing `user_roles` + `has_role` admin pattern.
7. Keep Solana/EVM address behavior untouched.
8. Keep existing token/agent snapshot behavior untouched.
9. English only for CMS content for now.
10. No Notion integration.

---

## Implementation phases

## Phase 1 — Database migration

Create CMS tables while reusing the existing RBAC system.

### New table: `pages`

```sql
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured_image text,
  author_name text default 'Token Health Scan',
  read_time text,
  reading_time integer,
  tags jsonb not null default '[]'::jsonb,
  view_count integer not null default 0,
  is_featured boolean not null default false,
  is_system_page boolean not null default false,
  preserve_styles boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### New table: `page_translations`

Keep the translation table even though only English is enabled. This preserves portability for future localization.

```sql
create table public.page_translations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  language text not null default 'en',
  title text not null,
  meta_description text,
  content text,
  featured_image_alt text,
  slug text,
  schema jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, language)
);
```

### Indexes

```sql
create index pages_status_idx on public.pages(status);
create index pages_slug_idx on public.pages(slug);
create index pages_featured_idx on public.pages(is_featured);
create index page_translations_page_id_idx on public.page_translations(page_id);
create index page_translations_language_idx on public.page_translations(language);
create index page_translations_slug_idx on public.page_translations(slug);
```

### RLS

Enable RLS:

```sql
alter table public.pages enable row level security;
alter table public.page_translations enable row level security;
```

Policies:

```sql
-- Public can read published CMS pages.
create policy "Public can view published pages"
on public.pages
for select
using (status = 'published');

-- Admins can manage all CMS pages.
create policy "Admins manage pages"
on public.pages
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Admins can delete only non-system pages.
create policy "Admins delete non-system pages"
on public.pages
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  and not is_system_page
);

-- Public can read translations belonging to published pages.
create policy "Public can view published translations"
on public.page_translations
for select
using (
  exists (
    select 1
    from public.pages
    where pages.id = page_translations.page_id
      and pages.status = 'published'
  )
);

-- Admins can manage translations.
create policy "Admins manage translations"
on public.page_translations
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
```

### Updated-at trigger

Add a reusable timestamp trigger if one does not already exist, then attach it to both tables.

---

## Phase 2 — Storage

Create or confirm these buckets:

```text
blog-images
seo-snapshots
```

### `blog-images`

Purpose:

```text
blog-images/
  cms/
    covers/
      article-cover.png
  rss.xml
  rss-en.xml
  rss/
    en.xml
  llms.txt
  llms-full.txt
```

Use for:

- CMS cover images uploaded by Claude MCP
- CMS cover images uploaded in the admin UI
- Generated CMS RSS
- Generated CMS `llms.txt`
- Generated CMS `llms-full.txt`

### `seo-snapshots`

Reuse existing bucket.

CMS snapshot keys:

```text
publications/:slug/index.html
```

Do not alter existing token/agent snapshot key conventions.

---

## Phase 3 — Secrets

Required:

```text
MCP_CONTENT_SECRET
```

Optional:

```text
INDEXNOW_API_KEY
```

Not needed:

```text
NOTION_WEBHOOK_SECRET
```

The MCP content function will reject all requests without a valid `X-MCP-Secret`.

---

## Phase 4 — Claude MCP Edge Function

Add:

```text
supabase/functions/mcp-content/index.ts
supabase/functions/mcp-content/deno.json
```

### Purpose

Expose the CMS as a Claude Desktop MCP server.

Claude becomes able to create, edit, publish, unpublish, delete, and inspect CMS content directly.

### Security requirements

The function must:

- Accept MCP JSON-RPC POST requests.
- Include correct MCP HTTP headers:
  - `Accept: application/json, text/event-stream`
  - `Content-Type: application/json`
- Require `X-MCP-Secret`.
- Compare against `MCP_CONTENT_SECRET`.
- Use timing-safe comparison.
- Use Supabase service role internally.
- Never expose service role credentials.
- Enforce reasonable body size limits.
- Return JSON-RPC errors for invalid tools/arguments.
- Support CORS/OPTIONS only as needed.

### Tools

| Tool | Purpose |
|---|---|
| `list_pages` | List CMS pages by status/category/search |
| `get_page` | Get page by slug or id with English content |
| `upsert_page` | Create or update a CMS page |
| `publish_page` | Mark page as published and regenerate outputs |
| `unpublish_page` | Mark page as draft and remove stale snapshot |
| `delete_page` | Delete non-system page and remove snapshot |
| `upload_image` | Upload base64 image to `blog-images/cms/covers` |
| `regenerate_outputs` | Rebuild RSS, llms files, and snapshots |

### `upsert_page` input shape

```json
{
  "slug": "how-to-evaluate-a-token",
  "status": "draft",
  "category": "guide",
  "title": "How to Evaluate a Token Before Buying",
  "meta_description": "A practical framework for evaluating token health across security, liquidity, tokenomics, community, and development.",
  "content": "<p>Article HTML content...</p>",
  "featured_image": "https://...",
  "featured_image_alt": "Token research dashboard",
  "author_name": "Token Health Scan",
  "read_time": "7 min read",
  "tags": ["token research", "web3", "risk"],
  "is_featured": false,
  "schema": {}
}
```

### Generated outputs after MCP mutations

When Claude publishes or updates a published page, trigger:

```text
regenerate-cms-snapshot
generate-cms-rss
generate-cms-llms-txt
submit-indexnow, if configured
```

When Claude unpublishes or deletes:

```text
remove CMS snapshot
generate-cms-rss
generate-cms-llms-txt
submit-indexnow, if configured
```

---

## Phase 5 — CMS output edge functions

Add:

```text
supabase/functions/generate-cms-rss/index.ts
supabase/functions/generate-cms-llms-txt/index.ts
supabase/functions/regenerate-cms-snapshot/index.ts
supabase/functions/submit-indexnow/index.ts
```

No Notion function will be added.

### `generate-cms-rss`

Reads published CMS pages and writes:

```text
blog-images/rss.xml
blog-images/rss-en.xml
blog-images/rss/en.xml
```

RSS item fields:

- title
- canonical URL
- meta description
- publication date
- author
- category
- tags
- featured image if present

### `generate-cms-llms-txt`

Writes:

```text
blog-images/llms.txt
blog-images/llms-full.txt
```

`llms.txt` should include:

- Product overview
- Main public routes
- Published CMS article list
- Canonical URLs
- Short descriptions

`llms-full.txt` should include:

- Expanded article summaries/content excerpts
- TokenHealthScan product context
- Links to major routes

### `regenerate-cms-snapshot`

Accepts:

```json
{
  "slug": "how-to-evaluate-a-token"
}
```

or:

```json
{
  "all": true
}
```

For each published page, render static HTML to:

```text
seo-snapshots/publications/:slug/index.html
```

Snapshot HTML must include:

- `<title>`
- meta description
- canonical
- OpenGraph tags
- Twitter card tags
- Article JSON-LD
- visible article body
- clean internal links
- `X-Robots-Tag` compatibility through response headers when served

### `submit-indexnow`

Can be shared by CMS publish flows.

If `INDEXNOW_API_KEY` is missing, it should return success with a skipped status rather than failing the publish.

---

## Phase 6 — Extend existing `seo-snapshot`

Edit:

```text
supabase/functions/seo-snapshot/index.ts
```

Do not replace existing token/agent behavior.

Resolution order should become:

```text
1. Try `seo-snapshots` bucket for exact requested path.
2. If `/token/:symbol`, use existing token live fallback.
3. If `/agent-scan/:chain/:agentId`, use existing agent live fallback.
4. If `/publications/:slug`, build live CMS snapshot from `pages` + `page_translations`.
5. If static known route, use existing static fallback.
6. Otherwise return 404 so Worker can pass through.
```

Add live CMS fallback for `/publications/:slug`.

CMS fallback query:

```text
pages.status = 'published'
pages.slug = :slug OR page_translations.slug = :slug
page_translations.language = 'en'
```

Return article snapshot HTML with the same template used by `regenerate-cms-snapshot`.

---

## Phase 7 — Admin UI

Add an English-only admin CMS UI.

### New pages

```text
src/pages/Admin.tsx
src/pages/AdminNew.tsx
src/pages/AdminEdit.tsx
```

Keep existing:

```text
src/pages/AdminUsers.tsx
```

### Routes

Add:

```tsx
<Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
<Route path="/admin/new" element={<AdminRoute><AdminNew /></AdminRoute>} />
<Route path="/admin/edit/:id" element={<AdminRoute><AdminEdit /></AdminRoute>} />
```

Preserve:

```tsx
<Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
```

### New CMS components

Use a separate folder to avoid mixing CMS components with user-admin components:

```text
src/components/cms/PageTable.tsx
src/components/cms/HeroImageUpload.tsx
src/components/cms/RichTextEditor.tsx
src/components/cms/SchemaEditor.tsx
src/components/cms/EnglishContentSection.tsx
```

### New hooks/libs

```text
src/hooks/usePages.ts
src/lib/slugFormatter.ts
src/lib/htmlParser.ts
src/lib/contentCleaner.ts
```

### Admin actions

| Action | Behavior |
|---|---|
| Save draft | Write `pages` + `page_translations` only |
| Publish | Write DB, generate snapshot, regenerate RSS/llms, IndexNow if configured |
| Update published page | Write DB, regenerate snapshot/RSS/llms |
| Unpublish | Set status draft, remove snapshot, regenerate RSS/llms |
| Delete | Block system pages, delete page, remove snapshot, regenerate RSS/llms |
| Refresh outputs | Manually call `regenerate_outputs` equivalent functions |

---

## Phase 8 — Public rendering

Add:

```text
src/pages/Publications.tsx
src/pages/DynamicPage.tsx
src/components/cms/BlogTemplate.tsx
src/components/cms/PublicationCard.tsx
src/hooks/usePublications.ts
```

### Routes

Add before wildcard route:

```tsx
<Route path="/publications" element={<Publications />} />
<Route path="/publications/:slug" element={<DynamicPage />} />
```

### `/publications`

Shows published English CMS pages.

Features:

- Featured articles section
- Category/tag filtering if simple to include
- Clean TokenHealthScan branding
- Links to `/publications/:slug`
- SEO metadata for the hub page

### `/publications/:slug`

Behavior:

- Fetch published CMS page by slug.
- Fetch English translation only.
- Sanitize HTML with DOMPurify.
- Render Navbar/Footer.
- Render article layout.
- Use `Helmet`.
- Title must be a single string.
- Add canonical:
  ```text
  https://tokenhealthscan.com/publications/:slug
  ```
- Add Article JSON-LD.
- Return existing `NotFound` for missing/draft content.

---

## Phase 9 — SEO/AEO frontend layer

Use `react-helmet-async`.

For CMS article pages include:

```text
title
meta description
canonical
og:title
og:description
og:type = article
og:image
twitter:card
twitter:title
twitter:description
twitter:image
Article JSON-LD
BreadcrumbList JSON-LD
```

For `/publications` include:

```text
CollectionPage JSON-LD
BreadcrumbList JSON-LD
canonical
OG/Twitter metadata
```

Do not alter token scan SEO metadata unless required to avoid route conflicts.

---

## Phase 10 — Cloudflare Worker update

Edit:

```text
workers/bot-prerender.js
```

Preserve current token/agent/static behavior.

Add CMS routes to bot allowlist:

```text
/publications
/publications/:slug
```

Add static file proxy routes if not already present:

```text
/rss.xml
/rss/en.xml
/rss-en.xml
/llms.txt
/llms-full.txt
```

Proxy these from the `blog-images` bucket.

Bot behavior:

```text
GET /publications/my-article
User-Agent: GPTBot / ClaudeBot / Googlebot / etc.
→ Cloudflare Worker
→ seo-snapshot?path=/publications/my-article
→ seo-snapshots bucket or CMS live fallback
```

Human behavior:

```text
GET /publications/my-article
normal browser UA
→ Lovable SPA
→ DynamicPage.tsx
```

---

## Phase 11 — Supabase config

Register new functions in:

```text
supabase/config.toml
```

Functions:

```text
mcp-content
generate-cms-rss
generate-cms-llms-txt
regenerate-cms-snapshot
submit-indexnow
```

Use `verify_jwt = false` for MCP and internal generation endpoints only if the functions perform their own secret/service-role/admin validation.

`mcp-content` must validate `X-MCP-Secret`.

Output generation functions should use the existing internal auth pattern where appropriate.

---

## Phase 12 — Claude Desktop setup

After deployment, configure Claude Desktop:

```json
{
  "mcpServers": {
    "tokenhealthscan-cms": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/mcp-content"
      ],
      "env": {
        "X_MCP_SECRET": "YOUR_MCP_CONTENT_SECRET"
      }
    }
  }
}
```

Claude should then be able to manage content using MCP tools.

Example Claude workflow:

```text
Create a draft article titled "How to Check Token Liquidity Before Buying".
Use slug "check-token-liquidity-before-buying".
Category: guide.
Tags: token research, liquidity, web3 risk.
Write a 1,500-word practical guide.
Save as draft.
```

Then:

```text
Publish the draft article "check-token-liquidity-before-buying" and regenerate CMS outputs.
```

---

## File inventory

### New migration

```text
supabase/migrations/<timestamp>_cms_pages.sql
```

### New edge functions

```text
supabase/functions/mcp-content/index.ts
supabase/functions/mcp-content/deno.json
supabase/functions/generate-cms-rss/index.ts
supabase/functions/generate-cms-llms-txt/index.ts
supabase/functions/regenerate-cms-snapshot/index.ts
supabase/functions/submit-indexnow/index.ts
```

### Existing edge function to edit

```text
supabase/functions/seo-snapshot/index.ts
```

### Existing config to edit

```text
supabase/config.toml
```

### New frontend files

```text
src/pages/Admin.tsx
src/pages/AdminNew.tsx
src/pages/AdminEdit.tsx
src/pages/Publications.tsx
src/pages/DynamicPage.tsx

src/components/cms/PageTable.tsx
src/components/cms/HeroImageUpload.tsx
src/components/cms/RichTextEditor.tsx
src/components/cms/SchemaEditor.tsx
src/components/cms/EnglishContentSection.tsx
src/components/cms/BlogTemplate.tsx
src/components/cms/PublicationCard.tsx

src/hooks/usePages.ts
src/hooks/usePublications.ts

src/lib/slugFormatter.ts
src/lib/htmlParser.ts
src/lib/contentCleaner.ts
```

### Existing frontend files to edit

```text
src/App.tsx
workers/bot-prerender.js
package.json
```

---

## Dependencies

Add if missing:

```text
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-image
@tiptap/extension-link
dompurify
isomorphic-dompurify
papaparse
```

Edge function MCP imports live in `supabase/functions/mcp-content/deno.json`, not `package.json`:

```json
{
  "imports": {
    "mcp-lite": "npm:mcp-lite@^0.10.0",
    "hono": "npm:hono@^4.7.0"
  }
}
```

If the existing hosted MCP style is simpler and more consistent with `token-health-mcp`, use the project’s existing JSON-RPC MCP pattern instead of introducing Hono/mcp-lite.

---

## Constants

| Constant | Value |
|---|---|
| Site name | `Token Health Scan` |
| Production domain | `https://tokenhealthscan.com` |
| Supabase project ref | `qaqebpcqespvzbfwawlp` |
| CMS language | `en` only |
| CMS hub route | `/publications` |
| CMS article route | `/publications/:slug` |
| CMS storage bucket | `blog-images` |
| Snapshot bucket | `seo-snapshots` |
| MCP server name | `tokenhealthscan-cms` |
| MCP secret header | `X-MCP-Secret` |

---

## Verification checklist

### Database/security

- [ ] `pages` table exists.
- [ ] `page_translations` table exists.
- [ ] RLS is enabled on both.
- [ ] Public can read only published pages.
- [ ] Non-admin users cannot write CMS content from the frontend.
- [ ] Admin users can create/edit/publish/unpublish/delete CMS content.
- [ ] `user_roles` remains the only role storage table.
- [ ] Existing `/admin/users` still works.

### Claude MCP

- [ ] `mcp-content` rejects missing `X-MCP-Secret`.
- [ ] `mcp-content` rejects invalid `X-MCP-Secret`.
- [ ] Claude Desktop can connect to `tokenhealthscan-cms`.
- [ ] Claude can call `list_pages`.
- [ ] Claude can call `upsert_page` to create a draft.
- [ ] Claude can publish a page.
- [ ] Claude can upload an image.
- [ ] Claude can regenerate outputs.
- [ ] Claude cannot access service-role credentials.

### Admin UI

- [ ] `/admin` shows CMS page table.
- [ ] `/admin/new` creates a draft.
- [ ] `/admin/edit/:id` edits title, slug, meta description, content, image, tags, schema.
- [ ] Publish regenerates snapshot/RSS/llms.
- [ ] Unpublish removes or invalidates stale snapshot.
- [ ] Delete blocks system pages.

### Public rendering

- [ ] `/publications` lists published English pages.
- [ ] `/publications/:slug` renders published articles.
- [ ] Draft pages return Not Found.
- [ ] Article HTML is sanitized.
- [ ] Helmet title is a single string.
- [ ] Canonical URL is correct.

### SEO/AEO

- [ ] `/rss.xml` returns CMS RSS.
- [ ] `/rss/en.xml` returns CMS RSS.
- [ ] `/llms.txt` lists CMS articles.
- [ ] `/llms-full.txt` includes expanded CMS content.
- [ ] `curl -A "GPTBot" https://tokenhealthscan.com/publications/test-slug` returns snapshot HTML.
- [ ] Existing `curl -A "GPTBot" https://tokenhealthscan.com/token/aave` still returns token snapshot HTML.
- [ ] Existing sitemap behavior is not broken.

### Worker

- [ ] Bot requests to `/publications/:slug` route to `seo-snapshot`.
- [ ] Human requests to `/publications/:slug` route to Lovable SPA.
- [ ] `/rss.xml`, `/rss/en.xml`, `/llms.txt`, `/llms-full.txt` proxy from `blog-images`.
- [ ] Existing token/agent worker routes still work.

---

## Implementation order

1. Add CMS database migration for `pages`, `page_translations`, indexes, triggers, RLS.
2. Create/confirm `blog-images` storage bucket and policies.
3. Add `MCP_CONTENT_SECRET`; optionally add `INDEXNOW_API_KEY`.
4. Add `mcp-content` Edge Function.
5. Add CMS generation functions:
   - `generate-cms-rss`
   - `generate-cms-llms-txt`
   - `regenerate-cms-snapshot`
   - `submit-indexnow`
6. Extend `seo-snapshot` for `/publications/:slug`.
7. Add CMS hooks/libs.
8. Add CMS admin pages/components.
9. Add public `/publications` and `/publications/:slug` pages.
10. Update `App.tsx` routes.
11. Update `workers/bot-prerender.js` for CMS routes/static files.
12. Update `supabase/config.toml`.
13. Run build/type checks.
14. Test Claude MCP.
15. Test admin UI.
16. Test public rendering.
17. Test bot snapshot routing.
18. Confirm existing token/agent SEO still works.
