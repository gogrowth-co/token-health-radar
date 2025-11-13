# HTTP Caching Configuration Guide

This document describes how to set up HTTP caching headers for optimal performance of the Token Health Radar application.

## Overview

The application now uses React Query for client-side caching (1 hour stale time, 24 hours cache time). To maximize performance and reduce server load, we should also implement HTTP caching at the CDN/server level.

## Recommended Cache Headers

### For Token Report Pages (`/token/*`)

```
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
```

**Explanation:**
- `public`: Content can be cached by browsers and CDNs
- `max-age=3600`: Browser caches for 1 hour
- `s-maxage=86400`: CDN caches for 24 hours
- `stale-while-revalidate=604800`: Serve stale content for up to 7 days while revalidating in background

### For Static Assets (JS, CSS, Images)

```
Cache-Control: public, max-age=31536000, immutable
```

**Explanation:**
- Content-hashed assets can be cached forever
- `immutable`: Tells browser never to revalidate

### For API Endpoints (Supabase Edge Functions)

```
Cache-Control: public, max-age=300, s-maxage=600
```

**Explanation:**
- Short cache times for more dynamic data
- 5 minutes browser, 10 minutes CDN

## Implementation by Platform

### Vercel

Create or update `vercel.json` in the project root:

\`\`\`json
{
  "headers": [
    {
      "source": "/token/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
\`\`\`

### Netlify

Create or update `netlify.toml` in the project root:

\`\`\`toml
[[headers]]
  for = "/token/*"
  [headers.values]
    Cache-Control = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
\`\`\`

### Cloudflare Pages

Create `_headers` file in the `public` directory:

\`\`\`
/token/*
  Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800

/assets/*
  Cache-Control: public, max-age=31536000, immutable
\`\`\`

### Apache (.htaccess)

\`\`\`apache
<IfModule mod_headers.c>
  # Token reports - cache for 1 hour (browser), 24 hours (CDN)
  <FilesMatch "token/.*">
    Header set Cache-Control "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
  </FilesMatch>

  # Static assets - cache forever
  <FilesMatch "\.(js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
\`\`\`

### Nginx

\`\`\`nginx
location ~* ^/token/ {
  add_header Cache-Control "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
}

location ~* \.(js|css|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
\`\`\`

## Supabase Edge Function Caching

For the Supabase Edge Functions that serve reports, add cache headers in the response:

\`\`\`typescript
// In any edge function that returns token data
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    ...corsHeaders,
  },
});
\`\`\`

## Testing Cache Headers

### Using curl

\`\`\`bash
# Test token report page
curl -I https://your-domain.com/token/ETH

# Test static asset
curl -I https://your-domain.com/assets/index-abc123.js
\`\`\`

### Using Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Visit a token page
4. Look for `Cache-Control` header in the Response Headers

### Using Online Tools

- [RedBot](https://redbot.org/) - HTTP cache header checker
- [WebPageTest](https://www.webpagetest.org/) - Performance testing with caching analysis

## Cache Invalidation Strategy

### Weekly Automatic Refresh
- Every Monday at 8 AM UTC, the `weekly-token-refresh` edge function:
  1. Scans all tokens for new data
  2. Regenerates reports with updated analysis
  3. Triggers sitemap regeneration

### Manual Invalidation
If you need to immediately invalidate cached reports:

**Vercel:**
\`\`\`bash
# Use Vercel API to purge cache
curl -X POST "https://api.vercel.com/v1/integrations/deploy-hooks/YOUR_HOOK_ID"
\`\`\`

**Cloudflare:**
\`\`\`bash
# Purge cache via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data '{"purge_everything":true}'
\`\`\`

## Monitoring

Monitor cache hit rates using your CDN dashboard:

- **Vercel**: Analytics → Edge Network
- **Cloudflare**: Analytics → Caching
- **Netlify**: Analytics → Bandwidth

### Expected Results

After implementation, you should see:
- **90%+ cache hit rate** for token pages
- **99%+ cache hit rate** for static assets
- **Significant reduction** in database queries
- **Faster page loads** (especially repeat visits)

## Benefits

1. **Performance**: Pages load 10x faster from cache
2. **Cost Reduction**: Fewer database queries = lower costs
3. **Scalability**: Handle traffic spikes without infrastructure changes
4. **Better SEO**: Faster page loads improve search rankings
5. **User Experience**: Nearly instant page loads for cached content

## Notes

- Cache headers are already configured in React Query (client-side)
- Weekly refresh ensures data stays fresh
- Real-time subscriptions notify users of updates
- Stale-while-revalidate provides optimal UX during updates
