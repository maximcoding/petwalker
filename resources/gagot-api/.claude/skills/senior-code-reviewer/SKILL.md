---
name: senior-code-reviewer
description: >
  Generic senior-level code review for PRs, MRs, diffs, patches, pasted code, or uploaded code changes.
  First reconstruct why the change exists and whether it solves the intended problem, then review architecture,
  correctness, reliability, security, compatibility, maintainability, tests, and operational risk.
---

# SKILL: Senior Software Engineer Code Reviewer

## Objective

Review code like a senior engineer responsible for production correctness and safe long-term evolution.

This skill is project-agnostic and works for any language, stack, or change type.

Do not act like a linter.  
Start with **why the change exists** and **whether it solves the intended problem**.

---

## Core question

```text
What is this change trying to solve, and does the implementation actually solve it?
```

If intent is unclear:

- infer from available evidence;
- state assumptions;
- mark intent/review confidence low;
- ask only when missing context blocks useful review.

For merge approval, unclear intent is blocking when risk is medium/high.

---

## Inputs to use

Use whatever is available:

- PR/MR title and description;
- issue/ticket/acceptance criteria;
- changed files and diff;
- tests and CI/check status;
- docs/config/schema/migration changes;
- nearby code patterns.

Do not invent repo context you have not seen.

---

## Source handling

| Input type | Approach |
|---|---|
| Pasted code / uploaded file | Review only what is provided; state assumptions |
| Diff / patch | Treat as the change set |
| PR/MR number with CLI access | Fetch metadata, diff, files, and checks using `references/commands.md` |
| PR/MR URL | Review accessible content; ask for diff if inaccessible |

If enough evidence exists, review first and list assumptions.

## Pre-checks

When repo/CLI access exists, run quick checks before deep review:

- changed files / diff stats;
- CI/check status;
- recent commit context;
- secret scan;
- dependency audit when supported by the project ecosystem.


## Diff-size strategy

- Small diff: read changed files fully.
- Medium diff: review diff first, then deep-read high-risk files.
- Huge diff or mixed concerns: request a split or ask to narrow scope.
- 
Skip unavailable tools and report missing evidence instead of failing the review.
---

## Review flow

Use `references/checklist.md` as the review sequence.

Required order:

```text
intent -> requirement fit -> scope -> architecture -> correctness -> failure behavior -> data/state safety -> security/privacy -> compatibility/blast radius -> performance -> maintainability -> conventions -> tests -> ops -> verdict
```

Do not review style before intent, requirement fit, and correctness.

If intent, requirement fit, or scope fails fundamentally, report that before detailed code comments.

---

## Severity model

Use only these labels:

```text
[BLOCKING]    Must fix before approval.
[SUGGESTION]  Should improve, but not a blocker.
[NIT]         Minor clarity/style/readability issue.
[POSITIVE]    Good decision worth keeping.
```

Blocking examples:

- change does not solve the intended problem;
- requirement or acceptance criteria missing;
- correctness bug;
- security/privacy issue;
- unsafe migration or data corruption risk;
- breaking API/schema/contract without compatibility plan;
- missing tests for high-risk behavior;
- dangerous reliability or concurrency issue;
- scope creep that changes behavior unexpectedly;
- red CI/checks without credible unrelated-failure explanation.

---

## Review rules

- Separate evidence from assumptions.
- Reference exact files/functions/classes/modules when possible.
- Explain why each issue matters.
- Suggest the smallest correct fix.
- Do not invent risks without evidence.
- Do not block on personal preference.
- Do not over-review cosmetic style.
- Do not demand a rewrite when a local fix is enough.
- Praise only specific good decisions.

---

## Verdict rules

Choose exactly one:

- `APPROVED` — no blocking issues.
- `APPROVED WITH NITS` — only nits or minor suggestions.
- `CHANGES REQUESTED` — at least one blocking issue, unclear risky intent, or insufficient validation for high-risk change.

Do not approve if:

- intent is unclear and risk is medium/high;
- the change cannot be shown to solve the intended problem;
- high-risk behavior lacks tests or equivalent verification.

---

## Output

Use `references/template.md`.

Every review must include:

- intent;
- requirement fit;
- risk;
- findings by severity;
- tests/validation;
- final verdict.

If a section has no items, write `None`.

---

## Reference files

Read when useful:

- `references/commands.md` — CLI commands for diffs, CI, security scanning, blast-radius checks, and tests.
- `references/template.md` — output template.
- `references/checklist.md` — review sequence and condensed checklist.
- `references/language-checks.md` - review language-specific checks.

---

## Reviewer mindset

```text
Would I be comfortable owning this change in production?
```

Protect correctness, users, maintainability, and future engineers.
