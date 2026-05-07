# Senior Code Review Checklist

Use top-to-bottom.  
Do not review style before intent, requirement fit, and correctness.

If intent or requirement fit fails, stop and report that first.

---

## 1. Intent

- [ ] What changed?
- [ ] Why does this change exist?
- [ ] What behavior should now be true?
- [ ] What should remain unchanged?
- [ ] Intent confidence: high / medium / low
- [ ] Review confidence: high / medium / low
- [ ] Assumptions are stated if context is partial

## 2. Requirement fit

- [ ] Solves the intended problem
- [ ] Acceptance criteria covered
- [ ] Important cases not missing
- [ ] Does not solve a different problem

## 3. Scope

- [ ] No unrelated changes
- [ ] No hidden refactor bundled with behavior
- [ ] No feature creep
- [ ] No overbroad rewrite

## 4. Architecture

- [ ] Correct layer / module / service / component
- [ ] Boundaries respected
- [ ] Coupling acceptable
- [ ] Existing patterns followed

## 5. Correctness

- [ ] Logic correct
- [ ] Branches complete
- [ ] Edge cases covered
- [ ] State transitions valid
- [ ] Idempotency handled where needed

## 6. Failure behavior

- [ ] Errors explicit
- [ ] Timeouts / retries safe
- [ ] Partial failure safe
- [ ] Cleanup / rollback path exists
- [ ] No silent swallowing

## 7. Data / state safety

- [ ] Input validated
- [ ] Persistence safe
- [ ] Migration reversible / safe
- [ ] No corruption / loss risk
- [ ] Cache / stale state handled

## 8. Security / privacy

- [ ] Auth/authz correct
- [ ] No secrets exposed
- [ ] No injection / traversal / SSRF / command execution risk
- [ ] Sensitive data not logged/exposed
- [ ] Permissions safe

## 9. Compatibility / blast radius

- [ ] API / schema / contract compatibility preserved
- [ ] Config / env impact understood
- [ ] Deployment order safe
- [ ] Downstream consumers considered

## 10. Performance / resources

- [ ] No N+1 / repeated network calls
- [ ] No blocking work on critical path
- [ ] No unbounded loops / pagination
- [ ] Dependency cost justified

## 11. Maintainability

- [ ] Names clear
- [ ] Complexity justified
- [ ] Duplication acceptable
- [ ] Easy to test / debug / change

## 12. Conventions

- [ ] Follows local patterns
- [ ] Error / log / API / test style consistent
- [ ] Formatting flagged only if meaningful

## 13. Tests / validation

- [ ] Intended behavior tested
- [ ] Edge / error cases tested
- [ ] Regression test for bugfix
- [ ] High-risk paths have strong evidence

## 14. Observability / operations

- [ ] Failures diagnosable
- [ ] Logs / metrics / traces sufficient where relevant
- [ ] Rollout / rollback understood
- [ ] Config / feature flags safe

## 15. Verdict

Choose one:

- `APPROVED`
- `APPROVED WITH NITS`
- `CHANGES REQUESTED`