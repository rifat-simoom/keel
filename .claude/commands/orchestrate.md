## /orchestrate

Reads the GitHub Issues queue, finds sessions whose dependencies are all merged,
and starts executor agents up to the parallelism limit (2).

**Work queue:** GitHub Issues labelled `agent-session` in this repo.
**Replaces:** `.claude/pipeline/work-queue.yaml` (now deprecated — see that file).
**Prerequisite:** `gh` CLI installed and authenticated (`gh auth login`).

---

### Step 1 — Sync completed PRs → close issues

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

gh issue list \
  --label "agent-session,status:review" \
  --json number \
  --repo "$REPO" | jq -r '.[].number' \
| while read N; do
    PR=$(gh pr list --search "closes:#$N" --state merged --json number \
          --jq '.[0].number' --repo "$REPO" 2>/dev/null)
    if [ -n "$PR" ]; then
      gh issue edit "$N" \
        --remove-label "status:review" --add-label "status:done" --repo "$REPO"
      gh issue close "$N" \
        --comment "PR #$PR merged. Session complete. ✓" --repo "$REPO"
      echo "  ✓ Closed #$N (PR #$PR merged)"
    fi
  done
```

---

### Step 2 — Find available sessions

Available = `status:pending` + every issue referenced in `Depends on: #N` is CLOSED.

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

gh issue list \
  --label "agent-session,status:pending" \
  --json number,title,body \
  --repo "$REPO" | jq -r '.[] | "\(.number)|\(.title)"' \
| while IFS="|" read N TITLE; do
    BODY=$(gh issue view "$N" --json body --jq '.body' --repo "$REPO")
    # Parse every #N reference on the "Depends on:" line
    DEPS=$(echo "$BODY" | grep -i "Depends on:" | grep -oE '#[0-9]+' | tr -d '#')

    BLOCKED=false
    for DEP in $DEPS; do
      STATE=$(gh issue view "$DEP" --json state --jq '.state' --repo "$REPO" 2>/dev/null)
      [ "$STATE" != "CLOSED" ] && BLOCKED=true && break
    done

    $BLOCKED || echo "AVAILABLE: #$N — $TITLE"
  done
```

---

### Step 3 — Check parallelism headroom

```bash
IN_PROGRESS=$(gh issue list \
  --label "agent-session,status:in-progress" \
  --json number --repo "$REPO" | jq 'length')

SLOTS=$((2 - IN_PROGRESS))
echo "$SLOTS slot(s) available (limit: 2)"
```

---

### Step 4 — Claim and start sessions

For each available session (up to `SLOTS` count):

```bash
# 1. Claim the issue
gh issue edit "$N" \
  --remove-label "status:pending" --add-label "status:in-progress" --repo "$REPO"

BRANCH=$(gh issue view "$N" --json body --jq '.body' \
  | grep -oE 'feature/[a-z0-9/_-]+' | head -1)

gh issue comment "$N" \
  --body "Agent claimed at $(date -u +%Y-%m-%dT%H:%M:%SZ). Branch: \`$BRANCH\`" \
  --repo "$REPO"

# 2. Create the branch and hand the issue body to the executor agent
git checkout -b "$BRANCH" origin/main
```

The issue body is the session brief. Pass it to the executor agent as context.
See `.claude/agents/executor-agent.md` for the executor loop.

---

### Step 5 — After executor opens a PR

```bash
# Move issue from in-progress to review
gh issue edit "$N" \
  --remove-label "status:in-progress" --add-label "status:review" --repo "$REPO"
gh issue comment "$N" \
  --body "PR opened: $PR_URL — awaiting human review." --repo "$REPO"
```

Then invoke the reviewer agent on the new PR:
```
/code-review medium --comment
```

---

### Step 6 — Report status table

```bash
echo "═══ Keel Pipeline Status ═══"
gh issue list \
  --label "agent-session" --state all \
  --json number,title,labels,state \
  --repo "$REPO" \
  | jq -r '.[] | "  #\(.number | tostring | @text)  \(
      .labels | map(.name) | map(select(startswith("status:"))) | .[0]
      // (if .state == "CLOSED" then "status:done" else "status:pending" end)
    )  \(.title)"'
```

---

### Issue state machine

```
pending ──claim──► in-progress ──PR open──► review
                                               │
                     ┌──── human requests changes
                     │
               changes-requested ──reclaim──► in-progress
                     │
                     └──── (or) human closes ──► abandoned
                                               │
                              human merges PR ──► done (auto-closed by "Closes #N")
```

**Orchestrator responsibilities per state:**

| Transition | Who acts | How |
|---|---|---|
| `pending → in-progress` | Orchestrator (Step 4) | `gh issue edit --remove-label status:pending --add-label status:in-progress` |
| `in-progress → review` | Executor (after PR open) | `gh issue edit --remove-label status:in-progress --add-label status:review` |
| `review → changes-requested` | Human (on PR) | `gh issue edit --remove-label status:review --add-label status:changes-requested` |
| `changes-requested → in-progress` | Orchestrator or human | See "Rework path" below |
| `review/done` | GitHub auto | `Closes #N` in PR body closes issue on merge |

---

### Rework path (changes-requested → in-progress)

When a human requests changes on a PR, the orchestrator handles the re-queue:

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

# Find all issues awaiting rework
gh issue list \
  --label "agent-session,status:changes-requested" \
  --json number,title --repo "$REPO" \
  | jq -r '.[] | "#\(.number) \(.title)"'

# For each: reclaim and re-enter the executor loop on the existing branch
gh issue edit "$N" \
  --remove-label "status:changes-requested" --add-label "status:in-progress" \
  --repo "$REPO"
gh issue comment "$N" \
  --body "Reclaimed for rework at $(date -u +%Y-%m-%dT%H:%M:%SZ). Addressing review comments." \
  --repo "$REPO"

# Executor re-enters at BUILD step using the existing branch (no new branch).
# New commits pushed to the same PR. Reviewer re-runs after.
```

---

### Structured metadata block (parsed by orchestrator)

Every issue body must include this YAML block so the orchestrator can read structured fields
without regex-parsing prose:

```yaml
session:
  id: gap-2.1-export-api
  layer: api                          # schema|service|api|ui-web|ui-mobile|tests|infra
  branch: feature/gap-2-gap-2.1-export-api
  depends_on: []                      # [12, 15] — issue numbers
  parallel_with: []                   # [16] — issue numbers that can run alongside
  touches:                            # files/packages this session writes to
    - backend/services/banking/router.py
    - backend/services/banking/repository.py
  priority: normal                    # normal|high|critical
```

The orchestrator reads `depends_on` and `parallel_with` from this block.
The `touches` list is used to warn (not block) when two parallel sessions overlap on the same file.
`/plan-feature` and `/bug-fix` both emit this block when creating issues.

---

### Human gates — when /orchestrate stops

| Situation | What to do |
|---|---|
| No available sessions, none in progress | Milestone complete — report done |
| No available sessions but some in progress | Wait for those PRs to be reviewed and merged |
| A PR has `BLOCKER` findings from reviewer | Surface to human — do not start new sessions |
| Issues exist with `status:changes-requested` | Run rework path (above) |
| All pending sessions blocked for > 24h | Flag to human — something is stuck |
| Two available sessions have overlapping `touches` | Warn human — start only one until the other merges |

---

### Flags

`/orchestrate --status` — report status table only, do not start sessions  
`/orchestrate --milestone 8` — filter to Milestone 8 issues only  
`/orchestrate --dry-run` — show what would be claimed without claiming  
`/orchestrate --issue 90` — claim and start a specific issue by number (see below)

---

### Running a specific issue: `--issue N`

Use this when you want to target one session directly rather than letting the orchestrator choose.

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
N=90  # the issue number

# 1. Read the issue
gh issue view "$N" --json number,title,body,labels,state --repo "$REPO"
```

**Before claiming, check:**

```bash
# Is it already claimed or done?
LABELS=$(gh issue view "$N" --json labels --jq '[.labels[].name]' --repo "$REPO")
echo "$LABELS"
# Should contain "status:pending" — if "status:in-progress" or closed, stop and tell the human

# Are its dependencies met?
BODY=$(gh issue view "$N" --json body --jq '.body' --repo "$REPO")
DEPS=$(echo "$BODY" | grep -i "Depends on:" | grep -oE '#[0-9]+' | tr -d '#')
for DEP in $DEPS; do
  STATE=$(gh issue view "$DEP" --json state --jq '.state' --repo "$REPO")
  echo "Dep #$DEP: $STATE"
  # If any dep is OPEN: warn the human — this session has unmet dependencies
done
```

If a dependency is still open, **warn the human** but let them decide:
```
⚠️  Issue #90 depends on #89 which is still open.
    Running it now may cause conflicts.
    Proceed anyway? (yes / no)
```

If they say yes, or if all deps are met: proceed to claim and execute using the same
Steps 4–5 as the normal orchestrator flow (claim label → create branch → executor loop).

---

### When to run

| Event | Run? |
|---|---|
| You merged a PR | Yes — unlocks dependent sessions |
| You start your work session | Yes — sync state, see what is in flight |
| After `/new-feature` or `/bug-fix` | Yes — picks up newly added issues |
| You want status without starting work | Yes — use `--status` flag |
