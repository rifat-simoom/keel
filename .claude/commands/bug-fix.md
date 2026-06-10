## /bug-fix

Use this when something in the product is behaving incorrectly.
A bug fix corrects existing behaviour — it does not add new capabilities.
If new behaviour is needed, use `/new-feature` instead.
**Work queue: GitHub Issues.** This command ends by creating an issue — nothing is written to work-queue.yaml.

---

### Step 1 — Classify the bug

**Severity:**

| Severity | Definition | Response |
|---|---|---|
| `critical` | Data loss, security vulnerability, HMRC calculation wrong, cross-tenant data leak | → use `/hotfix` instead |
| `high` | Feature broken for all users, blocking core workflow (invoicing, VAT return) | Priority fix, starts immediately |
| `medium` | Feature broken for some users or in edge cases | Normal queue, next available slot |
| `low` | UI glitch, cosmetic, minor UX issue | Normal queue, batch with other low items |

If severity is `critical`: **stop here, use `/hotfix`.**

---

### Step 2 — Diagnose before writing any code

Do not write a fix before you understand the root cause.

```
1. Reproduce the bug — what exact input or action causes it?
2. Read the relevant code — service, router, repository, component
3. Identify the root cause — not the symptom
4. Check if the bug exists in a test — if yes, why did it pass?
5. Check for related FIXME comments in the affected area:
   grep -rn "# FIXME" --include="*.py" --include="*.ts" {affected_path}
6. Check if this is a regression — when did it last work? (git log, git blame)
```

Write a one-paragraph diagnosis before touching any code:
> "The bug is caused by X in file Y at line Z. The root cause is [explanation].
> It was introduced in commit [hash] / has always existed.
> The fix is [description]. It does not affect [adjacent behaviour]."

---

### Step 3 — Create a GitHub Issue

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

ISSUE_NUM=$(gh issue create \
  --repo "$REPO" \
  --title "fix: {short description of the bug}" \
  --label "status:pending,priority:{high|medium|low},layer:{service|api|ui-web|etc},agent-session" \
  --body "$(cat <<'EOF'
## Session Brief

**Session ID:** `fix-{YYYY-MM-DD}-{short-name}`
**Layer:** {service | api | ui-web | ui-mobile | schema}
**Branch:** `fix/{YYYY-MM-DD}-{short-name}`
**Depends on:** _none_
**Parallel with:** _none_

<!-- ── Structured metadata (parsed by orchestrator) ── -->
```yaml
session:
  id: fix-{YYYY-MM-DD}-{short-name}
  layer: {layer}
  branch: fix/{YYYY-MM-DD}-{short-name}
  depends_on: []
  parallel_with: []
  touches: [{list affected files/packages}]
  priority: {high|medium|low}
```

---

## Context files to load

- `CLAUDE.md`
- `.claude/guardrails/QUICK-REF.md`
- {full guardrail file for the domain touched}
- {affected file paths to read before coding}

## Root cause

{One paragraph from Step 2 above}

## Task

{Exactly what to change. Not "fix the bug" but
"in function X at file Y, the VAT calculation uses float multiplication —
replace with Decimal arithmetic per PY-4 in python-practices.md"}

## Constraints

- Fix only the root cause — do not refactor surrounding code
- Add a test that reproduces the bug before the fix (red) and passes after (green)
- Do not change any migration that has already been applied

## Acceptance criteria

- [ ] Bug can no longer be reproduced with the original input
- [ ] New regression test added that would have caught this bug before it shipped
- [ ] `pytest {specific test file} -v` passes
- [ ] `make verify` exits 0

## Do NOT touch

- {Every file and layer outside the fix scope}
EOF
)" \
  | grep -oE '[0-9]+$')

echo "Created fix issue #$ISSUE_NUM"
```

---

### Step 4 — Start work

For high-severity bugs that should start immediately:

```bash
/orchestrate --issue $ISSUE_NUM
```

For normal-priority bugs, just run `/orchestrate` — it will pick up the issue in order.

---

### Step 5 — Verify the fix is complete

Before marking done, confirm:

- [ ] The bug can no longer be reproduced with the original input
- [ ] A new test exists that would have caught this bug before it shipped
- [ ] `make verify` passes — no regressions
- [ ] The fix does not touch code outside the diagnosed root cause
- [ ] If the bug was caused by a guardrail violation: update QUICK-REF.md if the rule was missing

---

### Preventing recurrence

After the fix is merged, decide:

| Root cause | Prevention |
|---|---|
| Guardrail rule violated | Check if the rule is in QUICK-REF.md — add it if not |
| Missing test coverage | Add the test class to the relevant session brief's acceptance criteria |
| FIXME that was never resolved | Add a fix session to the queue for any related FIXMEs |
| Spec was ambiguous | Clarify the relevant section in SPEC.md |
| New edge case discovered | Add it to the relevant guardrail with ❌/✅ example |
