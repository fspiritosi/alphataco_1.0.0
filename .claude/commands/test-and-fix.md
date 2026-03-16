---
description: 'Run type checks, linting, and fix any failures'
---

1. Run `npm run check-types` to verify TypeScript compiles
2. If type check fails:
   - Analyze each error carefully
   - Identify the root cause (wrong type, missing import, schema mismatch)
   - Fix the issue
   - Re-run check-types to verify the fix
   - Repeat until all types pass
3. Run `npm run lint` to check linting
4. If lint fails:
   - Fix each issue
   - Re-run lint to verify
5. Report success with summary of what was fixed

<!-- NOTE: Unit tests not configured yet. When added, insert test run between steps 2 and 3:
   Run `npm test` and fix failures before proceeding to lint.
-->

<!-- NOTE: E2E tests available with `npm run test:e2e` (Cypress) but only run when explicitly requested. -->
