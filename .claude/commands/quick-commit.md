---
description: 'Stage all changes and commit with a descriptive message'
---

1. Run `git status` to see what's changed
2. Run `git diff` to review changes briefly
3. Run `npm run check-types` to verify TypeScript compiles
4. If check-types fails, STOP and report the errors
5. Stage all changes with `git add -A`
6. Create a commit with a type prefix (feat:, fix:, refactor:, docs:, style:, chore:) and a brief description of what changed
   - NEVER add Co-Authored-By lines
   - Use action-oriented language (e.g., "feat: add product search functionality")
