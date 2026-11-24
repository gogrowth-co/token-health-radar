# Selected security fixes
- [x] Restrict account lookup functions and direct agent score writes.
- [x] Require verified administrators or trusted services for report publishing, contact sync, and snapshot changes.
- [x] Restrict billing return destinations and report reads.
- [x] Remove selected private-data logs and exposed error stacks.
- [x] Run security regression checks, deploy affected functions, and update selected finding statuses.

Verification: 19 regression tests passed; database assertions passed; live public requests were rejected and the agent catalog remained accessible. The unused debug endpoint returned 404, and its source now returns a safe error. Live signed-in browser checks were unavailable because this project's authentication session is unmanaged.