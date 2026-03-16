---
description: 'End-of-session sweep for duplicated and dead code'
---

1. Scan the codebase for:
   - **Duplicated code**: 3+ similar lines appearing in multiple locations
   - **Dead exports**: exported functions, types, or variables that are never imported
   - **Dead imports**: imports that are unused
   - **console.\* usage**: any `console.log`, `console.error`, etc. that should use logger
   - **`:any` types**: any use of `:any` or `as any` that should be properly typed
   - **Supabase direct queries**: `supabaseServer()` or `supabaseBrowser()` calls that should be Prisma
   - **Old DataTable system**: `BaseDataTable` imports, `queryWithPagination`, dot-notation accessorKeys
2. List findings grouped by file with line numbers
3. Ask which findings to fix
4. Fix approved items one at a time:
   - Make the change
   - Run `npm run check-types` to verify nothing broke
   - Move to next item
5. After all fixes, commit with: `chore: clean up tech debt`
