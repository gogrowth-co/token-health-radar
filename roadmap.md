# Selected security fixes
- [x] Restrict account lookup functions and direct agent score writes.
- [x] Require verified administrators or trusted services for report publishing, contact sync, and snapshot changes.
- [x] Restrict billing return destinations and report reads.
- [x] Remove selected private-data logs and exposed error stacks.
- [x] Run security regression checks, deploy affected functions, and update selected finding statuses.

Verification: 19 regression tests passed; database assertions passed; live public requests were rejected and the agent catalog remained accessible. The unused debug endpoint returned 404, and its source now returns a safe error. Live signed-in browser checks were unavailable because this project's authentication session is unmanaged.

# Additional security hardening
- [ ] Token scanning: derive user ID only from verified session and scope cached scan reads to owner or public anonymous scans.
- [ ] Scanner and agent directory cached responses: strip account identifiers from visitor-visible output.
- [ ] Sitemap, RSS, AI-readable publications, image generation, Make.com sending, and test sending: require verified admin or internal/cron/service secret while keeping public GET reads working.
- [ ] Remove account emails from browser and server logs across checkout, subscription management, account profile, role checks, and admin screens.
- [ ] Redact raw provider errors and stack traces in lifecycle emails and client-facing error responses.
- [ ] Scan-test authorization: enforce in every environment regardless of environment flags.
- [ ] Add regression tests per path, deploy updated functions, and re-run public-access and available live checks.