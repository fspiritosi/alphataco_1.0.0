---
description: 'Commit, push, and open a PR'
---

Follow these steps in order:

1. Run `git status` to see what files have changed
2. Run `git diff` to review the changes
3. Run `npm run check-types` to verify TypeScript compiles
4. Run `npm run lint` to verify linting passes
5. Review the diff for project rule violations:
   - No `:any` or `as any` in TypeScript
   - No `console.*` (should use logger from `@/lib/logger`)
   - No `window.confirm/alert/prompt`
   - No `useEffect` + `useState` for data fetching
   - No hardcoded secrets or credentials
6. If any check fails, STOP and report the issues. Do NOT proceed.
7. Stage the appropriate files with `git add` (specific files, not `-A`)
8. Create a commit with a clear message following conventional commits format (feat/fix/refactor/style/docs/chore)
   - NEVER add Co-Authored-By lines
9. Push to the remote branch (create remote branch if needed with `-u origin <branch>`)
10. Create a Pull Request using `gh pr create` with:
    - A clear title summarizing the changes (under 70 chars)
    - A description with:
      - Summary of what changed and why
      - Test plan (checklist of manual verification steps)

If there are any issues at any step, stop and report them.
