# CLI Commands for Code Review

Useful commands when you have CLI access to the repo. Adapt flags to the project's tooling.

---

## Fetching Diffs

## Diff Size
git diff --stat $(git merge-base HEAD main)..HEAD
git diff --name-only $(git merge-base HEAD main)..HEAD

### GitHub
```bash
# Fetch PR diff (requires gh CLI)
gh pr diff <PR_NUMBER>

# Fetch PR metadata and CI status
gh pr view <PR_NUMBER> --json title,body,state,statusCheckRollup,files

# List changed files only
gh pr diff <PR_NUMBER> --name-only
```

### GitLab
```bash
# Fetch MR diff (requires glab CLI)
glab mr diff <MR_NUMBER>

# Fetch MR metadata
glab mr view <MR_NUMBER>
```

### Plain git
```bash
# Diff against the merge base of the target branch
git diff $(git merge-base HEAD main)..HEAD

# List changed files
git diff --name-only $(git merge-base HEAD main)..HEAD

# Stat summary (insertions/deletions per file)
git diff --stat $(git merge-base HEAD main)..HEAD
```

---

## CI Status

```bash
# GitHub — check CI status for a PR
gh pr checks <PR_NUMBER>

# GitLab — list pipeline jobs
glab ci list
```

---

## Security Scanning

```bash
# Search for hardcoded secrets (strings that look like keys/tokens)
grep -rn --include='*.{js,ts,py,go,rb,java,yaml,yml,json,env}' \
  -E '(api[_-]?key|secret|password|token|credentials)\s*[:=]' .

# Search for SQL injection risk (string interpolation in queries)
grep -rn --include='*.{js,ts,py,go,rb,java}' \
  -E '(execute|query|raw)\s*\(.*[fF][\"\x27]|\.format\(|%s|\$\{' .

# Search for eval / command injection
grep -rn --include='*.{js,ts,py,rb}' -E '\beval\s*\(|exec\s*\(|child_process|subprocess\.call' .
```

---

## Blast Radius Analysis

```bash
# Find direct importers of a changed module (JS/TS)
grep -rn --include='*.{js,ts,tsx,jsx}' "from ['\"].*<module-name>" .

# Find direct importers (Python)
grep -rn --include='*.py' "import <module_name>\|from <module_name>" .

# Find callers of a specific function
grep -rn "<function_name>" --include='*.{js,ts,py,go,rb,java}' .
```

---

## Breaking Change Detection

```bash
# Compare exported API surface (TypeScript)
npx tsc --declaration --emitDeclarationOnly --outDir /tmp/decls 2>&1 | head -40

# Compare public method signatures (Python — rough)
grep -rn --include='*.py' 'def [a-z]' <changed_files>
```

---

## Test Coverage

```bash
# Run tests for changed files only (JS/TS — jest)
npx jest --findRelatedTests <changed_files>

# Run tests (Python — pytest)
pytest <changed_test_files> -v

# Coverage report (if configured)
npx jest --coverage --changedSince=main
pytest --cov=<module> --cov-report=term-missing
```

---

## Ticket Linking

```bash
# GitHub — check linked issues on a PR
gh pr view <PR_NUMBER> --json closingIssuesReferences

# Extract ticket IDs from branch name or commit messages
git log --oneline $(git merge-base HEAD main)..HEAD | grep -oE '[A-Z]+-[0-9]+'
```