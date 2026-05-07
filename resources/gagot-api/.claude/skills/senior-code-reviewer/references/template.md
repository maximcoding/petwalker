# Review Output Template

Use this structure for every senior code review.

---

```md
# Review Summary

## Intent
- PR appears to solve:
- Expected behavior after change:
- Change type: bugfix / feature / refactor / migration / infra / test / docs-as-code / mixed
- Confidence in intent: high / medium / low
- Missing context: None / <what is missing>

## Review Coverage
- Files reviewed:
- Review mode: full-file / diff-first / partial-context
- Automated checks run:
- Automated checks skipped:

## Requirement Fit
- Solves intended problem: yes / no / partial / unclear
- Missing acceptance cases: None / <list>
- Scope creep or unrelated changes: None / <list>

## Risk
- Overall risk: LOW / MEDIUM / HIGH
- Main risk areas:
- Blast radius:

## Findings

### [BLOCKING]
- <finding>
  - Evidence:
  - Why it matters:
  - Suggested fix:

### [SUGGESTION]
- <finding>
  - Evidence:
  - Why it matters:
  - Suggested fix:

### [NIT]
- <finding>

### [POSITIVE]
- <specific good decision>

## Tests / Validation
- Existing evidence:
- Missing tests:
- Manual verification needed:

## Final Verdict
APPROVED / APPROVED WITH NITS / CHANGES REQUESTED
```

---

## Finding format

Use this format for substantial findings:

```md
[BLOCKING] **Short title**

Evidence:
- `path/to/file.ext`, function/class/line if available
- <specific observed behavior>

Why it matters:
- <risk>

Suggested fix:
- <smallest correct fix>
```

---

## Example

```md
# Review Summary

## Intent
- PR appears to solve: add Stripe webhook ingestion.
- Expected behavior after change: valid Stripe events are accepted and stored; invalid events are rejected.
- Change type: feature
- Confidence in intent: high
- Missing context: None

## Requirement Fit
- Solves intended problem: partial
- Missing acceptance cases: invalid signature handling
- Scope creep or unrelated changes: None

## Risk
- Overall risk: HIGH
- Main risk areas: security, data integrity
- Blast radius: public webhook endpoint and events table

## Findings

### [BLOCKING]
- **Webhook signature is not verified**
  - Evidence: `webhooks.py`, handler parses request body directly.
  - Why it matters: anyone can POST fake Stripe events.
  - Suggested fix: verify with Stripe signing secret before processing.

### [SUGGESTION]
- None

### [NIT]
- None

### [POSITIVE]
- The handler separates event persistence from event processing, which keeps retry behavior easier to reason about.

## Tests / Validation
- Existing evidence: happy-path webhook test
- Missing tests: invalid signature, unknown event type
- Manual verification needed: Stripe CLI webhook smoke test

## Final Verdict
CHANGES REQUESTED
```
