# Agent Delivery Loop

> Every executor session follows this loop exactly. No shortcuts.
> CLAUDE.md rules 17–21 point here.
>
> **Source of truth: GitHub Issues.** There is no SESSION-INDEX.md.
> The issue body IS the session brief. No human pause between explore and build.

---

## Issue state machine

```
pending ──claim──► in-progress ──PR open──► review
                                               │
                        ┌──────── human requests changes
                        │
                  changes-requested ──reclaim──► in-progress
                        │
                        └──────── (or) human closes as won't-fix ──► abandoned
                                               │
                                    human merges PR ──► done (issue auto-closed)
```

Labels that map to each state:

| State | Label |
|---|---|
| pending | `status:pending` |
| in-progress | `status:in-progress` |
| review | `status:review` |
| changes-requested | `status:changes-requested` |
| done | `status:done` (issue closed) |
| abandoned | `status:abandoned` (issue closed) |

---

## The Loop

```
START SESSION (triggered by orchestrator with issue number $N)
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 1. ORIENT                                           │
│    • gh issue view $N — read the full body          │
│    • Body = session brief (context, task,           │
│      constraints, acceptance criteria)              │
│    • If "prior handoff" referenced: read that file  │
│    • Load QUICK-REF.md + every guardrail file in    │
│      the brief's "Context files to load" section    │
│    • Create branch from the body's Branch: field    │
│      git checkout -b $BRANCH origin/main            │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 2. EXPLORE (no human pause — decide and proceed)    │
│    • Read existing files in the area you will touch │
│    • Backend: read models, repo, router in service  │
│    • Frontend: read components, hooks in feature    │
│    • Schema: read latest Alembic migration          │
│    • Identify: base classes, fixtures, naming,      │
│      import patterns already in use                 │
│    • If explore reveals an impossibility: stop,     │
│      comment on the issue, escalate to human        │
│      (do NOT pause for routine findings)            │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 3. BUILD                                            │
│    • Implement only what the session brief says     │
│    • Follow patterns found in the explore step      │
│    • Tag # FIXME(session-id): for out-of-scope bugs │
│    • One commit per logical concern                 │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 4. VERIFY LOOP (session tests)                      │
│                                                     │
│    run `make verify`                                │
│         │                                           │
│    passes? ──yes──► go to step 5                    │
│         │                                           │
│        no                                           │
│         │                                           │
│    read full error output                           │
│    fix root cause (not symptoms)                    │
│    run `make verify` again                          │
│         │                                           │
│    same error twice? ──yes──► STOP                  │
│      gh issue comment $N --body "BLOCKED: ..."      │
│      escalate to human — do not loop further        │
│                                                     │
└─────────────────────────────────────────────────────┘
     │  verify passes
     ▼
┌─────────────────────────────────────────────────────┐
│ 5. REGRESSION GATE (all tests)                      │
│    run `make test` (full suite across all services) │
│    Failure = shared code broken by this session     │
│    Fix it before continuing                         │
└─────────────────────────────────────────────────────┘
     │  regression passes
     ▼
┌─────────────────────────────────────────────────────┐
│ 6. FIXME AUDIT                                      │
│    grep -rn "# FIXME" (excl. node_modules/.git)     │
│    Record count. Flag if delta > 5 this session.    │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 7. HANDOFF NOTE                                     │
│    Write .claude/sessions/{milestone}/{id}-handoff  │
│    using .claude/templates/handoff-template.md      │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 8. COMMIT + PR                                      │
│    git add <specific files only>                    │
│    git commit -m "feat(gap-{n}): ..."               │
│    gh pr create — body must contain "Closes #$N"    │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 9. AI CODE REVIEW                                   │
│    /code-review medium --comment                    │
│    Fix any BLOCKER finding that violates QUICK-REF  │
│    before handing to human                          │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 10. UPDATE ISSUE                                    │
│    gh issue edit $N                                 │
│      --remove-label "status:in-progress"            │
│      --add-label "status:review"                    │
│    gh issue comment $N --body "PR: $URL             │
│      make verify: passing | FIXMEs added: $DELTA"   │
└─────────────────────────────────────────────────────┘
     │
     ▼
   DONE — report PR URL + review findings + FIXME count
```

---

## Rework path (changes-requested → in-progress)

When a human requests changes on a PR:

```bash
# Human or orchestrator sets the label:
gh issue edit $N \
  --remove-label "status:review" \
  --add-label "status:changes-requested"

# Executor reclaims:
gh issue edit $N \
  --remove-label "status:changes-requested" \
  --add-label "status:in-progress"
gh issue comment $N --body "Reclaimed for rework at $(date -u). Addressing review comments."

# Then re-enter the loop at step 3 (BUILD) using the existing branch.
# Do NOT create a new branch. Push new commits to the same PR.
# When done, return to step 4 (VERIFY LOOP).
```

The executor resolves BLOCKER findings from the reviewer before re-requesting review.
SUGGESTION findings are left as PR comments — human decides whether to act.

---

## What "done" means

A session is done when **all** of these are true:

| Gate | How to confirm |
|---|---|
| `make verify` exits 0 | Session tests pass |
| `make test` exits 0 | Full regression passes |
| Handoff note written | File exists at expected path |
| PR open with `Closes #N` | `gh pr view` returns a URL |
| AI review run | `/code-review --comment` findings visible on PR |
| Guardrail violations fixed | No QUICK-REF rule broken in the diff |
| Issue labelled `status:review` | Confirmed via `gh issue view $N` |

---

## Guardrail loading strategy (token efficiency)

| Always load | Load only when touching that domain |
|---|---|
| `CLAUDE.md` | `python-practices.md` — backend sessions |
| `QUICK-REF.md` | `frontend-practices.md` — web/mobile sessions |
| Session brief (issue body) | `owasp-top10.md` — auth, money, file uploads, events |
| Prior handoff (if referenced) | `financial-rules.md` — VAT, CT, payroll calculations |
| | `forbidden-patterns.md` — when writing financial mutations |

---

## Common failure modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `make verify` fails after two fixes | Wrong root cause diagnosed | Stop, comment on issue, escalate |
| `make test` fails but `make verify` passes | Shared model/package broken | Check what the session changed in shared code |
| Migration won't apply | Schema conflict with prior session | Never edit applied migrations; add a new one |
| Import errors in tests | Shared package not rebuilt | `pnpm --filter @keel/types build` first |
| Type errors in web/mobile | Generated types out of date | Rebuild `@keel/types`, re-run verify |
| Agent repeats a pattern already in the codebase differently | Explore step skipped | Read existing files before building |
| FIXME count jumped by 10+ | Scope crept | Review changes; revert out-of-scope edits |
| Issue stuck at `status:in-progress` for > 2h | Session interrupted | Human resets: remove `status:in-progress`, add `status:pending` |
