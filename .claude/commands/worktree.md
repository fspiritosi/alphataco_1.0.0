---
description: 'Create a git worktree for parallel Claude sessions'
---

1. If no name is provided, generate one from today's date and a short descriptor (e.g., `2026-03-16-fix-auth`)
2. Create the worktree:
   ```
   git worktree add ../gh_gestion-$name -b $name origin/main
   ```
3. Verify the worktree was created successfully
4. Print instructions for the user:
   ```
   Worktree created! To start a parallel Claude session:
   cd ../gh_gestion-$name && claude
   ```
5. Remind the user:
   - To list existing worktrees: `git worktree list`
   - To remove when done: `git worktree remove ../gh_gestion-$name`
   - Only one agent should edit a given file at a time across worktrees
