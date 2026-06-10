## /plan-feature

Reads SPEC.md and the existing GitHub Issues, decomposes a new feature into sessions,
presents a plan for human approval, then creates the GitHub Issues.

**Usage:** `/plan-feature "brief description of the feature"`

---

### Step 1 — Understand the feature

Read the argument passed to this command. If none given, ask the human:
- What does the user need to be able to do?
- Which existing milestone does this belong to? (or is it a new domain?)
- Are there any HMRC/UK compliance rules involved?

---

### Step 2 — Read context

```bash
# See what milestones and gap numbers already exist
gh issue list \
  --repo $(gh repo view --json nameWithOwner --jq '.nameWithOwner') \
  --label "agent-session" --state all \
  --json number,title,labels,milestone \
  --limit 200 \
  | jq '[.[] | {number, title, milestone: .milestone.title}]'
```

Also read:
- `SPEC.md` — find the milestone this feature belongs to and understand existing business rules
- `CLAUDE.md` — confirm which guardrails will apply
- `.claude/guardrails/QUICK-REF.md` — check for any rules this feature must follow

---

### Step 3 — Determine the gap number

Find the highest existing `gap-N` number from the issue list:

```bash
gh issue list \
  --repo $(gh repo view --json nameWithOwner --jq '.nameWithOwner') \
  --label "agent-session" --state all --json title --limit 200 \
  | jq -r '.[].title' \
  | grep -oE 'gap-[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1
```

New gap number = highest existing + 1. If no gaps exist yet, start at `gap-2` (gap-1 is Settings).

---

### Step 4 — Decompose into sessions

Decide which sessions are needed. Standard decomposition patterns:

| Feature type | Typical sessions |
|---|---|
| New data entity (persisted) | schema → service → api → ui-web → tests |
| New calculation/report | service → api → ui-web → tests |
| New UI only (existing API) | ui-web → tests |
| New API only (existing schema) | service → api → tests |
| Full-stack feature | schema → service → api → ui-web → ui-mobile → tests |

Rules:
- One session = one layer, one concern, one `make verify` gate
- Schema always first — everything else depends on it
- Tests always last — depends on api (and ui if testing both)
- UI web and UI mobile can run in parallel
- Service and API can sometimes be combined if the service is thin

For each session decide:
- **Session ID:** `gap-{N}.{M}-{short-name}` (e.g. `gap-2.1-db-schema`)
- **Layer:** schema | service | api | ui-web | ui-mobile | tests
- **Depends on:** which session IDs must be done first
- **Parallel with:** which session IDs can run simultaneously
- **Guardrails to load:** based on layer and domain (financial? auth? file upload?)

---

### Step 5 — Present the plan for approval

Print a plan table like this and **stop — do not create any issues yet**:

```
═══ Plan: {Feature Name} ═══════════════════════════════════════════

  Milestone:  {which SPEC milestone this belongs to}
  Gap number: gap-{N}
  Sessions:   {count}

  Session              Layer     Depends on        Parallel with
  ──────────────────────────────────────────────────────────────
  gap-2.1-db-schema    schema    (none)            (none)
  gap-2.2-service      service   gap-2.1           gap-2.3
  gap-2.3-api          api       gap-2.1           gap-2.2
  gap-2.4-ui-web       ui-web    gap-2.2, gap-2.3  gap-2.5
  gap-2.5-tests        tests     gap-2.2, gap-2.3  gap-2.4

  Guardrails that will be loaded:
    - QUICK-REF.md (always)
    - python-practices.md (schema, service, api)
    - frontend-practices.md (ui-web)
    - financial-rules.md (if touching VAT/CT/payroll)

  SPEC.md update needed: YES — adds "User can {X}" to {Milestone} section
  (or NO — internal improvement, no SPEC change)

═══════════════════════════════════════════════════════════════════
Confirm this plan? (yes / adjust: {what to change})
```

Wait for the human to respond before proceeding.

---

### Step 6 — Apply feedback

If the human asks to adjust (add a session, merge two, change dependencies):
- Update the plan table
- Show the revised version
- Ask for confirmation again

If the human confirms: proceed to Step 7.

---

### Step 7 — Update SPEC.md (if needed)

If the feature is user-facing, add to the relevant milestone section in `SPEC.md`:
- A "User can:" statement
- Any new business rules it introduces

Do NOT add implementation details (SQL, endpoints, code).

---

### Step 8 — Create the GitHub Issues

Create issues in dependency order (parents before children) so issue numbers are available
for `Depends on: #N` references in child issues.

For each session, create an issue with this body format:

```markdown
## Session Brief

**Session ID:** `gap-{N}.{M}`
**Layer:** {layer}
**Branch:** `feature/gap-{N}-gap-{N}.{M}-{short-name}`
**Depends on:** {#issue-number (session-id) or _none_}
**Parallel with:** {session-id or _none_}

<!-- ── Structured metadata (parsed by orchestrator) ── -->
```yaml
session:
  id: gap-{N}.{M}-{short-name}
  layer: {schema|service|api|ui-web|ui-mobile|tests|infra}
  branch: feature/gap-{N}-gap-{N}.{M}-{short-name}
  depends_on: [{parent-issue-number}]   # [] if none
  parallel_with: [{sibling-issue-number}] # [] if none
  touches:
    - {list every file or package this session will write to}
  priority: normal
```

---

## Context files to load

- `SPEC.md` ({milestone section})
- `CLAUDE.md`
- `.claude/guardrails/QUICK-REF.md`
- {additional guardrail files based on domain}
- {existing files in the area to read before building}

## Task

{Specific, concrete description of what to build this session.
Not "implement the feature" — name the exact files, functions, and behaviours.}

## Constraints

- {Guardrail rule that applies, with reference: e.g. "All monetary columns NUMERIC(12,2) — FR-18"}
- {Any non-obvious constraint the agent must know}

## Acceptance criteria

- [ ] {Specific, testable — command that must pass}
- [ ] `make verify` exits 0

## Do NOT touch

- {Every file and layer outside this session's scope}
```

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

# Create parent sessions first, capture issue numbers
N1=$(gh issue create \
  --repo "$REPO" \
  --title "gap-{N}.1 — {Feature}: DB Schema" \
  --label "status:pending,priority:normal,layer:schema,agent-session,milestone:{label}" \
  --body "..." \
  | grep -oE '[0-9]+$')

echo "Created gap-{N}.1 as issue #$N1"

# Create child sessions with Depends on: #N1
N2=$(gh issue create \
  --repo "$REPO" \
  --title "gap-{N}.2 — {Feature}: Service" \
  --label "status:pending,priority:normal,layer:service,agent-session,milestone:{label}" \
  --body "...
**Depends on:** #$N1 (gap-{N}.1-db-schema)
..." \
  | grep -oE '[0-9]+$')

echo "Created gap-{N}.2 as issue #$N2"
# ... continue for each session
```

---

### Step 9 — Report

Tell the human:
- All issue numbers and their GitHub URLs
- The dependency graph as a one-liner:
  ```
  #42 → #43 ∥ #44 → #45 ∥ #46 → #47
  ```
- Next step: `/orchestrate` will pick these up automatically

---

### What /plan-feature does NOT do

- Write any code
- Modify guardrail files
- Make architectural decisions not already in SPEC.md
- Skip the human confirmation step (Step 5)
- Create more than one gap per invocation — one feature, one gap
