# Security implementation rules
- Privileged contact sync, report publishing, and CMS snapshot writes use a verified administrator identity or validated project service key, never a request-body user identifier; this preserves automation without allowing impersonation.
- Billing return URLs must match this project's exact trusted origins; a broad hosting-domain suffix would permit phishing redirects.
- Downloadable scan reports read caller-owned scans or explicitly public anonymous scans; paid access must not reveal another user's private history.