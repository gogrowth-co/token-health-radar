# Security implementation rules
- Privileged contact sync, report publishing, and CMS snapshot writes use a verified administrator identity or validated project service key, never a request-body user identifier; this preserves automation without allowing impersonation.
- Billing return URLs must match this project's exact trusted origins; a broad hosting-domain suffix would permit phishing redirects.
- Downloadable scan reports read caller-owned scans or explicitly public anonymous scans; paid access must not reveal another user's private history.
- Token scans derive account ownership strictly from verified sessions and scope cached scan reads to caller-owned or explicitly public anonymous rows, so callers cannot spoof accounts or read private scan records.
- Public scanner and agent directory responses return explicit allowlisted public fields without account or network identifiers.
- Publishing generators, webhook senders, image generators, and test endpoints enforce verified admin or internal/cron/service credentials in every environment while preserving public read-only GET feeds.
- Client-facing responses and lifecycle delivery logs redact raw upstream provider errors and stack traces, and browser/server logs omit user email addresses.