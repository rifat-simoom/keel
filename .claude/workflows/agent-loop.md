# Agent Delivery Loop

> Every session follows this loop exactly. No shortcuts.
> This document is the canonical reference — CLAUDE.md rules 17–21 point here.

---

## The Loop

```
START SESSION
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 1. ORIENT                                           │
│    • Read SESSION-INDEX.md — confirm which session  │
│    • Read prior session's handoff note (if exists)  │
│    • Read session brief + CLAUDE.md + QUICK-REF.md  │
│    • Load full guardrail files for domains touched  │
│    • Create branch: feature/phase-{n}-{session-id}  │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 2. EXPLORE (before writing any code)                │
│    • Read existing files in the area you will touch │
│    • Backend: read models, repo, router in service  │
│    • Frontend: read components, hooks in feature    │
│    • Schema: read latest Alembic migration          │
│    • Identify: base classes, fixtures, naming,      │
│      import patterns already in use                 │
│    • Note anything that conflicts with the brief    │
│    • Tell human what you found + wait for confirm   │
└─────────────────────────────────────────────────────┘
     │  human confirms
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
│    same error twice? ──yes──► STOP, explain blocker │
│                                                     │
└─────────────────────────────────────────────────────┘
     │  verify passes
     ▼
┌─────────────────────────────────────────────────────┐
│ 5. REGRESSION GATE (all tests)                      │
│    run `make test` (full suite across all services) │
│    A failure here = shared code broken by this      │
│    session — fix before continuing                  │
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
│    Write .claude/sessions/{phase}/{id}-handoff.md   │
│    using .claude/templates/handoff-template.md      │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 8. COMMIT + PR                                      │
│    git add <specific files only>                    │
│    git commit -m "feat(phase-n): ..."               │
│    gh pr create (title + body per Rule 18)          │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 9. AI CODE REVIEW                                   │
│    /code-review medium --comment                    │
│    Fix any finding that matches QUICK-REF.md rules  │
│    before asking human to review                    │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ 10. MARK INDEX                                      │
│    SESSION-INDEX.md: [ ] → [x] for this session     │
└─────────────────────────────────────────────────────┘
     │
     ▼
   DONE — report PR URL + review findings + FIXME count
```

---

## What "done" means

A session is done when **all** of these are true:

| Gate | How to confirm |
|------|---------------|
| `make verify` exits 0 | Session tests pass |
| `make test` exits 0 | Full regression passes |
| Handoff note written | File exists at expected path |
| PR open | `gh pr view` returns a URL |
| AI review run | `/code-review --comment` findings visible on PR |
| Guardrail violations fixed | No QUICK-REF rule broken in the diff |
| SESSION-INDEX.md updated | `[x]` beside this session |

---

## Guardrail loading strategy (token efficiency)

| Always load | Load only when touching that domain |
|---|---|
| `CLAUDE.md` | `python-practices.md` — backend sessions |
| `QUICK-REF.md` | `frontend-practices.md` — web/mobile sessions |
| Session brief | `owasp-top10.md` — auth, money, file uploads, events |
| Prior handoff | `financial-rules.md` — VAT, CT, payroll calculations |
| | `forbidden-patterns.md` — when writing financial mutations |

---

## Common failure modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `make verify` fails after two fixes | Wrong root cause diagnosed | Stop, explain to human |
| `make test` fails but `make verify` passes | Shared model/package broken | Check what the session changed in shared code |
| Migration won't apply | Schema conflict with prior session | Never edit applied migrations; add a new one |
| Import errors in tests | Shared package not rebuilt | `pnpm --filter @keel/types build` first |
| Type errors in web/mobile | Generated types out of date | Rebuild `@keel/types`, re-run verify |
| Agent repeats a pattern already in the codebase differently | Explore step skipped | Read existing files before building |
| FIXME count jumped by 10+ | Scope crept | Review changes; revert out-of-scope edits |

---

## Parallel sessions (future)

Sessions within a phase that touch different services can run in parallel if:
1. They have no shared file writes
2. They each have their own branch
3. Their PRs are merged in schema-first order

Never run parallel sessions that both modify the same migration or the same shared package.
