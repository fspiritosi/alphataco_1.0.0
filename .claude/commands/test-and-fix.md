---
description: 'Run type checks and fix any failures'
---

1. Run `npm run check-types` to verify TypeScript compiles
2. If type check fails:
   - Analyze each error carefully
   - Identify the root cause (wrong type, missing import, schema mismatch)
   - Fix the issue
   - Re-run check-types to verify the fix
   - Repeat until all types pass
3. Report success with summary of what was fixed

<!-- NOTE: Unit tests not configured yet. When added, insert test run after step 2. -->

<!-- NOTE: E2E tests available with `npm run test:e2e` (Cypress) but only run when explicitly requested. -->
