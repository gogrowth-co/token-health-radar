

## Problem

The mangabeira project works because its `_redirects` has a bot-routing rule that proxies bot traffic to `/.netlify/functions/prerender` — a function provided by the **Netlify Prerender Extension** (not custom code). Your project is missing this rule entirely.

The mangabeira `_redirects` (line 27):
```
/*    /.netlify/functions/prerender?path=:splat  200  User-Agent:*bot* User-Agent:*facebook* User-Agent:*twitter* User-Agent:*linkedin* User-Agent:*whatsapp* User-Agent:*telegram* User-Agent:*slack* User-Agent:*discord*
```

Your current `_redirects` has no such rule — bot traffic goes straight to `index.html` (the empty SPA shell).

## Solution

Add the bot-routing redirect rule to `public/_redirects`, matching the mangabeira pattern. No custom prerender function is needed — the Netlify Prerender Extension provides `/.netlify/functions/prerender` automatically.

### Changes (single file: `public/_redirects`)

Replace contents with:

```
# Static files served directly
/sitemap.xml /sitemap.xml 200
/robots.txt /robots.txt 200

# Prerender for bots and AI crawlers - routed to Netlify Prerender Extension
/*    /.netlify/functions/prerender?path=:splat  200  User-Agent:*bot* User-Agent:*chatgpt* User-Agent:*gpt* User-Agent:*claude* User-Agent:*anthropic* User-Agent:*perplexity* User-Agent:*cohere* User-Agent:*facebook* User-Agent:*twitter* User-Agent:*linkedin* User-Agent:*whatsapp* User-Agent:*telegram* User-Agent:*slack* User-Agent:*discord*

# SPA fallback for regular users
/* /index.html 200
```

This adds AI crawler User-Agents (`chatgpt`, `gpt`, `claude`, `anthropic`, `perplexity`, `cohere`) beyond what mangabeira uses, while keeping the same routing mechanism. No other files are touched.

