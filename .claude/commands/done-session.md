## /done-session

Run this checklist in order when you believe a session is complete.
Do not skip steps. Do not declare the session done until all pass.

---

### Step 1 — Verify (session tests)

```bash
make verify
```

If it fails: fix the root cause and re-run. If the same error appears twice, stop and explain.
Do not proceed to Step 2 until this exits 0.

---

### Step 2 — Regression gate (all tests)

```bash
make test
```

This runs the full test suite — not just this session's tests.
If a prior phase breaks, fix it before continuing. A regression here means this session
changed something shared (a model, a schema, a shared package) in a breaking way.

If `make test` does not exist yet, run each service's tests explicitly:
```bash
pytest backend/ -v --tb=short -q
pnpm --filter web test --run
pnpm --filter mobile test --run
```

---

### Step 3 — FIXME count

```bash
grep -rn "# FIXME" --include="*.py" --include="*.ts" --include="*.tsx" . \
  | grep -v node_modules | grep -v ".git"
```

Note the count and delta from the start of this session. Flag as risk if delta > 5.

---

### Step 4 — Write handoff note

Create `.claude/sessions/{phase}/{session-id}-handoff.md` using the template at
`.claude/templates/handoff-template.md`. Fill in every section. Write "none" if empty.

---

### Step 5 — Commit

Stage only the files this session was responsible for (never `git add .`):

```bash
git add <specific files>
git commit -m "feat(phase-{n}): {description}

Implements SPEC.md § {section reference}.
make verify: passing
make test: passing
FIXME count: {n} (delta: +{delta})"
```

---

### Step 6 — Open PR

```bash
gh pr create \
  --title "feat(phase-{n}): {session title}" \
  --body "$(cat <<'EOF'
## What this builds
{one paragraph}

## SPEC section
{exact section name from SPEC.md}

## Verification
\`\`\`
make verify   # exits 0
make test     # exits 0 (full regression)
\`\`\`

## FIXME count
{n} total ({+delta} this session)

## Handoff note
See \`.claude/sessions/{phase}/{session-id}-handoff.md\`
EOF
)"
```

---

### Step 7 — AI code review

```
/code-review medium --comment
```

This posts findings as inline PR comments. Read the output.
If any finding matches a rule in `QUICK-REF.md` or the guardrails, fix it before asking
the human to review — do not leave guardrail violations for the human to catch.

---

### Step 8 — Mark index done

In `.claude/sessions/SESSION-INDEX.md`, change `[ ]` to `[x]` for this session.

---

### Step 9 — Report

Tell the human:
- PR URL
- `make verify` and `make test` status
- FIXME count + delta
- Any findings from the code review that were fixed
- Any risks or open questions for the next session
