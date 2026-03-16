---
description: 'Review uncommitted changes and suggest improvements'
---

1. Run `git status` to see what's changed
2. Run `git diff` to see the actual changes
3. For each modified file, analyze against project rules:
   - Is the change correct and complete?
   - Are there any potential bugs?
   - Does it follow project conventions? Check:
     - No `:any` or `as any` — types must be inferred (`Awaited<ReturnType<typeof fn>>`)
     - No `console.*` — must use logger from `@/lib/logger`
     - No `window.confirm/alert/prompt` — must use shadcn AlertDialog/Dialog
     - No `useEffect` + `useState` for fetching — must use React Query
     - No `date-fns` — must use moment.js
     - Server Components first — `'use client'` only when needed
     - Forms use shadcn Form + react-hook-form + zod
     - Employee lists include `file_number` (legajo)
     - Code names in English, UI strings in Spanish
   - Are there any security concerns? (hardcoded secrets, SQL injection, XSS)
   - Is error handling adequate?
4. Provide a summary with:
   - What looks good
   - Issues found (with file and line reference)
   - Recommended next steps (fix issues, test, or commit)
