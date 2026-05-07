---
name: git-branch-setup
description: Set up a correctly-named git feature branch following project conventions (type/issue-number-description). Use this when starting any new piece of work — feature, bug fix, chore, or hotfix — especially when the user mentions a GitHub Issue number, says "create a branch", "start on issue #X", "new feature branch", "branch for X fix", or similar. Also triggers when the user is about to begin coding and needs branch isolation from master.
---

## Branch naming convention

`<type>/<issue-number>-<kebab-description>` — e.g. `feature/42-add-email-verification`

Without an issue number: `<type>/<kebab-description>` — e.g. `chore/update-mongoose-deps`

| Type | When to use |
|------|-------------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, refactors, dependency updates |
| `hotfix/` | Urgent production fixes (branch from master directly) |

## Steps

### 1. Gather info

If the branch type, issue number, and description are not already clear from context, ask. You only need:
- **Type**: feature / fix / chore / hotfix
- **Issue number**: GitHub Issue number (optional — omit if none)
- **Description**: 2–4 words that describe the work

### 2. Build the branch name

Slugify the description: lowercase, spaces and underscores become hyphens, strip special characters.

Keep it short — `feature/123-add-auth` is better than `feature/123-implement-jwt-based-user-authentication-system`.

Examples:
- Issue #47, fix JWT expiry → `fix/47-jwt-expiry`
- No issue, add property filter → `feature/property-filtering`
- Hotfix login crash → `hotfix/login-crash`

### 3. Safety check

Run `git status`. If the working tree has uncommitted changes, offer two options:
- Stash them: `git stash push -m "wip before <branch-name>"`
- Abort so the user can handle it themselves

### 4. Create the branch

```bash
git checkout -b <branch-name> <base-branch>
```

The default base is `master` unless the user says otherwise.

### 5. Remote tracking (ask first)

Ask whether to push and set up tracking:
```bash
git push -u origin <branch-name>
```

This is optional — the user may prefer to push later.

### 6. Confirm and hand off

Show the final branch name clearly. Remind them:
- `finishing-a-development-branch` handles completion (merge, PR, cleanup)
- `using-git-worktrees` is available if they want isolated parallel work
