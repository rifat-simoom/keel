## /hotfix

Use ONLY for production bugs that are:
- A security vulnerability (cross-tenant data leak, auth bypass, injection)
- A financial calculation error (wrong VAT, wrong CT, wrong PAYE)
- Data loss or corruption
- The product is completely down for all users

For everything else: use `/bug-fix`.

Hotfixes bypass the normal dependency graph and work queue.
They go: diagnose → fix → test → PR → merge → deploy. No queue. No orchestrator.

---

### Step 1 — Confirm this is a hotfix

Before proceeding, answer:

- Is this visible to users in production right now? **Yes → continue. No → use `/bug-fix`.**
- Is data at risk or already corrupted? **If yes → stop all writes to the affected table first.**
- Is it a security vulnerability? **If yes → do not discuss in public channels. Fix silently.**

---

### Step 2 — Create a hotfix branch from main

```bash
git fetch origin
git checkout -b hotfix/{YYYY-MM-DD}-{short-description} origin/main
```

Example: `hotfix/2026-06-10-vat-float-rounding`

**Never branch from a feature branch. Always from main.**

---

### Step 3 — Diagnose (fast, but not skipped)

Even under time pressure, spend 10 minutes on diagnosis:

```
1. Reproduce the exact failure (what input, what output, what expected)
2. Identify the single file and function where the bug lives
3. Confirm the fix is surgical — changing only the broken logic
4. Check: does fixing this break anything adjacent?
```

Write one sentence: "The bug is in {file}:{function} at line {n}. Root cause: {explanation}. Fix: {change}."

---

### Step 4 — Fix and test

Write the fix. Write a test that:
1. Fails before the fix (proves you reproduced the bug)
2. Passes after the fix (proves the fix works)

Then:
```bash
make verify   # must pass — if it fails, the fix is broken. Do not proceed.
make test     # run the full suite
```

**`make test` failure policy — two cases, different actions:**

| Case | Action |
|---|---|
| A test fails **because of your change** | Fix it before merging. You broke it, you own it. |
| A test fails that is **completely unrelated to your change** (different service, different file, existed before your branch) | Do NOT fix it here. Confirm it fails on `main` too (`git stash && make test && git stash pop`). Note it in the PR body under "Pre-existing failures" and proceed. |

When in doubt: check `git stash && make test`. If the test fails there too, it is pre-existing and outside your scope. If it only fails on your branch, you introduced it — fix it.

---

### Step 5 — AI security review (mandatory for security bugs)

```
/security-review
```

If this is a financial calculation bug, also run:
```
/code-review high --comment
```

Do not merge until no `BLOCKER` findings remain.

---

### Step 6 — Open PR with hotfix label

```bash
gh pr create \
  --title "hotfix: {one line description}" \
  --label "hotfix,priority:critical" \
  --body "$(cat <<'EOF'
## Production issue
{What is broken, how many users affected, since when}

## Root cause
{One paragraph from Step 3}

## Fix
{What changed and why it is correct}

## Test
{New test that would have caught this — file + test name}

## Verification
`make verify` — passing
`make test` — passing (or: pre-existing failures listed below, confirmed on main)

## Pre-existing test failures (if any)
_None_ (or list: `test_name` in `path/to/test.py` — confirmed failing on main before this branch)

## Rollback plan
{How to revert if this fix causes new issues}
EOF
)"
```

---

### Step 7 — Merge and deploy immediately

Hotfix PRs skip the normal review queue — get immediate human eyes, merge, deploy.

```bash
# After merge to main:
# 1. Tag the release
git tag -a v{version}-hotfix-{n} -m "hotfix: {description}"

# 2. Deploy to production (follow your deployment runbook)
# 3. Verify the fix is live:
#    - Check the specific failing scenario in production
#    - Check monitoring for error rate drop

# 4. Update work-queue.yaml — add the hotfix as a done item:
# id: hotfix-2026-06-10-vat-float-rounding
# status: done
# done_at: {timestamp}
# notes: "Hotfix — bypassed queue. See PR #{number}"
```

---

### Step 8 — Post-mortem (within 24h)

After the hotfix is deployed:

1. **Why did this reach production?**
   - Was there a test that should have caught it?
   - Was there a guardrail rule that was violated?

2. **What changes to prevent recurrence?**
   - Add the missing test to the affected session brief's "Done when"
   - Add the violated rule to QUICK-REF.md if not already there
   - If the session brief was wrong: update it

3. **Log it:**
   Create `.claude/sessions/fixes/hotfix-{date}-{description}.md` with the post-mortem.
   Even though the fix is done, the record matters for future agents.

---

### What hotfixes are NOT

- A chance to refactor the surrounding code
- A place to fix related but non-critical bugs
- An opportunity to add new behaviour
- A bypass for the guardrails (all rules still apply to the fix code)
