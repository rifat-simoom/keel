#!/usr/bin/env bash
# scripts/setup-github-issues.sh
#
# Migrates the Keel session pipeline to GitHub Issues.
# Creates all labels, milestones, and session issues for Milestone 8 (Payroll)
# and Milestone 9 (AI Layer). Each issue IS the session brief.
#
# Prerequisites:
#   1. Install gh CLI  — https://cli.github.com/  (brew install gh / sudo apt install gh)
#   2. Authenticate   — gh auth login
#   3. Run            — bash scripts/setup-github-issues.sh
#
# Idempotent: safe to re-run — labels and milestones use --force / 422-skip.

set -euo pipefail

# Always run from the repo root regardless of where the script is called from
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ─── Repo detection ──────────────────────────────────────────────────────────
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null) || {
  echo "ERROR: gh CLI not configured or not in a GitHub repository."
  echo "Run: gh auth login"
  exit 1
}
echo "Target repository: $REPO"
echo ""

# ─── Labels ──────────────────────────────────────────────────────────────────
echo "=== Creating labels ==="
lbl() { gh label create "$1" --color "$2" --description "$3" --repo "$REPO" --force 2>/dev/null && echo "  ✓ $1"; }

# Status
lbl "status:pending"      "e4e669" "Waiting for dependencies to be merged"
lbl "status:in-progress"  "0075ca" "Agent is actively working"
lbl "status:review"            "d93f0b" "PR open — awaiting human review"
lbl "status:changes-requested" "e99695" "Human requested changes — awaiting rework"
lbl "status:done"              "0e8a16" "PR merged, session complete"
lbl "status:abandoned"         "666666" "Closed without merging"
lbl "status:blocked"           "cc0000" "Blocked on external dependency"

# Priority
lbl "priority:critical"   "b60205" "Hotfix — bypass queue, immediate"
lbl "priority:high"       "d93f0b" "Blocking bug or urgent feature"
lbl "priority:normal"     "1d76db" "Standard pipeline session"
lbl "priority:low"        "c5def5" "Cosmetic or minor improvement"

# Layer
lbl "layer:schema"    "f9d0c4" "Alembic migration + SQLAlchemy models"
lbl "layer:service"   "f9d0c4" "Business logic (calculators, services)"
lbl "layer:api"       "f9d0c4" "FastAPI router + endpoints"
lbl "layer:ui-web"    "f9d0c4" "React web UI"
lbl "layer:tests"     "f9d0c4" "Integration + unit test suite"
lbl "layer:infra"     "f9d0c4" "Infrastructure, config, feature flags"
lbl "layer:tests+ui"  "f9d0c4" "Tests and UI combined"

# Milestone — shipped (0–7 + gap-1)
lbl "milestone:foundation"     "d4c5f9" "Milestone 0 — Foundation"
lbl "milestone:auth"           "d4c5f9" "Milestone 1 — Auth"
lbl "milestone:app-shell"      "d4c5f9" "Milestone 2 — App Shell"
lbl "milestone:banking"        "d4c5f9" "Milestone 3 — Banking"
lbl "milestone:invoicing"      "d4c5f9" "Milestone 4 — Invoicing"
lbl "milestone:documents"      "d4c5f9" "Milestone 5 — Documents"
lbl "milestone:tax"            "d4c5f9" "Milestone 6 — Tax"
lbl "milestone:notifications"  "d4c5f9" "Milestone 7 — Notifications"
lbl "milestone:settings"       "d4c5f9" "Gap 1 — Settings"

# Milestone — next (8–9)
lbl "milestone:payroll"   "bfd4f2" "Milestone 8 — Payroll"
lbl "milestone:ai-layer"  "bfd4f2" "Milestone 9 — AI Layer"

# Type
lbl "agent-session"  "e0e0e0" "Claimable by an executor agent"
lbl "hotfix"         "b60205" "Emergency production fix — bypasses queue"
lbl "bug"            "fc8c03" "Bug fix session"

echo ""

# ─── GitHub Milestones ───────────────────────────────────────────────────────
echo "=== Creating milestones ==="

# Helper: create a milestone, skip silently if it already exists
mstone() {
  local title="$1" desc="$2" state="$3"
  gh api "repos/$REPO/milestones" \
    -f title="$title" \
    -f description="$desc" \
    -f state="$state" > /dev/null 2>&1 \
    && echo "  ✓ $title ($state)" \
    || echo "  ~ $title (already exists)"
}

# ── Shipped milestones (closed) ───────────────────────────────────────────────
mstone "Gap 1 — Settings"         "Company settings, VAT/tax setup, invoice defaults, notification preferences (prerequisite for Milestone 6)" "closed"
mstone "Milestone 0 — Foundation"    "Monorepo, Docker Compose, CI/CD, Keycloak, PostgreSQL, RabbitMQ, MinIO, Redis" "closed"
mstone "Milestone 1 — Auth"          "Keycloak integration, JWT validation, PKCE mobile auth, role-based access, Zustand token store" "closed"
mstone "Milestone 2 — App Shell"     "Web + mobile navigation shell, sidebar, company context, shared packages (@keel/types, @keel/api, @keel/validation, @keel/utils)" "closed"
mstone "Milestone 3 — Banking"       "Bank transaction sync, manual entry, categorisation UI, HMRC category mapping, AI categorisation stub" "closed"
mstone "Milestone 4 — Invoicing"     "Invoice state machine (DRAFT→SENT→PAID), PDF generation, INV-YYYY-NNN numbering, credit notes, overdue detection" "closed"
mstone "Milestone 5 — Documents"     "Receipt upload to MinIO, Tesseract OCR stub, document matching to transactions, 6-year retention policy" "closed"
mstone "Milestone 6 — Tax"           "VAT return builder (cash + accrual), CT estimator with marginal relief, mileage tracker, tax deadline calendar, AI chat stub" "closed"
mstone "Milestone 7 — Notifications" "Email (SES), push (Expo), in-app notification centre, tax deadline reminders, invoice overdue alerts" "closed"

echo ""

# ── Next milestones (open) ────────────────────────────────────────────────────
mstone "Milestone 8 — Payroll"  "PAYE/NIC calculator, RTI FPS submission to HMRC, payroll management UI" "open"
mstone "Milestone 9 — AI Layer" "Transaction categorisation, receipt extraction, tax chat (gated by FEATURE_AI_ENABLED)" "open"

M8="Milestone 8 — Payroll"
M9="Milestone 9 — AI Layer"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# MILESTONES 0–7 — COMPLETED SESSIONS (created then immediately closed)
# Reads the actual brief files from .claude/sessions/ — no hardcoding needed.
# ─────────────────────────────────────────────────────────────────────────────

# Map phase directory → milestone title + label
phase_milestone() {
  case "$1" in
    phase-0-foundation)    echo "Milestone 0 — Foundation" ;;
    phase-1-auth)          echo "Milestone 1 — Auth" ;;
    phase-2-shell)         echo "Milestone 2 — App Shell" ;;
    phase-3-banking)       echo "Milestone 3 — Banking" ;;
    phase-4-invoicing)     echo "Milestone 4 — Invoicing" ;;
    phase-5-documents)     echo "Milestone 5 — Documents" ;;
    phase-6-tax)           echo "Milestone 6 — Tax" ;;
    phase-7-notifications) echo "Milestone 7 — Notifications" ;;
    gap-1-settings)        echo "Gap 1 — Settings" ;;
  esac
}

phase_label() {
  case "$1" in
    phase-0-foundation)    echo "milestone:foundation" ;;
    phase-1-auth)          echo "milestone:auth" ;;
    phase-2-shell)         echo "milestone:app-shell" ;;
    phase-3-banking)       echo "milestone:banking" ;;
    phase-4-invoicing)     echo "milestone:invoicing" ;;
    phase-5-documents)     echo "milestone:documents" ;;
    phase-6-tax)           echo "milestone:tax" ;;
    phase-7-notifications) echo "milestone:notifications" ;;
    gap-1-settings)        echo "milestone:settings" ;;
  esac
}

# Transforms a raw brief file into the same structured format as the open issues.
# Uses Python (available on any dev machine) for reliable multi-line section handling.
format_brief() {
  local file="$1" session_id="$2" milestone="$3" phase_num="$4"
  local branch="feature/phase-${phase_num}-${session_id}"

  python3 - "$file" "$session_id" "$milestone" "$branch" <<'PYEOF'
import sys, re

file, sid, milestone, branch = sys.argv[1:]
raw = open(file).read()

# Strip --- frontmatter markers
raw = re.sub(r'^---\s*\n', '', raw)
raw = re.sub(r'\n---\s*$', '', raw.rstrip())

# Remove "# Session: ..." title line (it becomes the issue title)
raw = re.sub(r'^# Session:.*\n', '', raw, flags=re.MULTILINE)

# Remove "## Phase\n...\n" block
raw = re.sub(r'## Phase\n.*?\n\n', '', raw, flags=re.DOTALL)

# Rename sections to match open-issue format
raw = raw.replace('## Your task\n', '## Task\n')
raw = raw.replace('## Done when\n', '## Acceptance criteria\n')

# Convert "Acceptance criteria" bullet lines to checked checkboxes
def check_section(m):
    header, body = m.group(1), m.group(2)
    body = re.sub(r'^- ', '- [x] ', body, flags=re.MULTILINE)
    return header + body

raw = re.sub(
    r'(## Acceptance criteria\n)(.*?)(?=\n## |\Z)',
    check_section,
    raw,
    flags=re.DOTALL
)

header = (
    f"## Session Brief\n\n"
    f"**Session ID:** `{sid}`  \n"
    f"**Milestone:** {milestone}  \n"
    f"**Branch:** `{branch}`  \n"
    f"**Status:** ✅ Shipped\n\n"
    f"---\n\n"
)

print(header + raw.strip())
PYEOF
}

echo "=== Creating completed session issues (Milestones 0–7) ==="

SESSIONS_DIR=".claude/sessions"

# Pre-fetch milestone numbers once (gh issue create --milestone can't find closed milestones,
# so we set the milestone after creation via the API using the numeric ID)
get_milestone_num() {
  gh api "repos/$REPO/milestones?state=all" \
    --jq ".[] | select(.title == \"$1\") | .number"
}

for PHASE_DIR in \
  phase-0-foundation phase-1-auth phase-2-shell phase-3-banking \
  phase-4-invoicing phase-5-documents phase-6-tax phase-7-notifications \
  gap-1-settings
do
  M_TITLE=$(phase_milestone "$PHASE_DIR")
  M_LABEL=$(phase_label "$PHASE_DIR")
  PHASE_NUM=$(echo "$PHASE_DIR" | grep -oE '[0-9]+' | head -1)
  M_NUM=$(get_milestone_num "$M_TITLE")

  for BRIEF in "$SESSIONS_DIR/$PHASE_DIR"/s*.md "$SESSIONS_DIR/$PHASE_DIR"/sg*.md; do
    [[ "$BRIEF" == *"-handoff.md" ]] && continue
    [ -f "$BRIEF" ] || continue

    SESSION_ID=$(basename "$BRIEF" .md)
    SESSION_NAME=$(grep '^# Session:' "$BRIEF" | head -1 | sed 's/^# Session: //')
    ISSUE_TITLE="$SESSION_ID — $SESSION_NAME"
    BODY=$(format_brief "$BRIEF" "$SESSION_ID" "$M_TITLE" "$PHASE_NUM")

    # Create without --milestone (avoids the closed-milestone lookup failure)
    N=$(gh issue create \
      --repo "$REPO" \
      --title "$ISSUE_TITLE" \
      --label "status:done,agent-session,$M_LABEL" \
      --body "$BODY" \
      | grep -oE '[0-9]+$')

    # Assign to closed milestone via API using its numeric ID
    gh api "repos/$REPO/issues/$N" \
      --method PATCH -f milestone="$M_NUM" > /dev/null

    # Close the issue
    gh issue close "$N" \
      --comment "Session shipped as part of $M_TITLE. ✓" \
      --repo "$REPO" > /dev/null 2>&1

    echo "  ✓ #$N $SESSION_ID (closed)"
  done
done

echo ""

# ─── Helper ──────────────────────────────────────────────────────────────────
# Creates an issue and returns its number. Usage: N=$(mkissue TITLE LABELS MILESTONE BODY)
mkissue() {
  local title="$1" labels="$2" milestone="$3" body="$4"
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --milestone "$milestone" \
    --body "$body" \
    | grep -oE '[0-9]+$'
}

# ─────────────────────────────────────────────────────────────────────────────
# MILESTONE 8 — PAYROLL
# ─────────────────────────────────────────────────────────────────────────────
echo "=== Creating Milestone 8 issues ==="

# ── s8.1 DB Schema ───────────────────────────────────────────────────────────
S81=$(mkissue \
  "s8.1 — Payroll: DB Schema & Models" \
  "status:pending,priority:normal,layer:schema,milestone:payroll,agent-session" \
  "$M8" \
'## Session Brief

**Session ID:** `s8.1`
**Layer:** schema
**Branch:** `feature/phase-8-s8.1-db-schema`
**Depends on:** _none — start here_
**Parallel with:** _none_

---

## Context files to load

- `SPEC.md` (Milestone 8 — Database)
- `CLAUDE.md`
- `.claude/guardrails/QUICK-REF.md`
- `.claude/guardrails/financial-rules.md` (FR-18, FR-19, FR-22)
- `backend/services/auth/models.py`

## Task

Create the Alembic migration and SQLAlchemy models for `employees` and `payroll_runs` tables.

- Add `deleted_at`, `created_by`, `updated_by` to both tables
- `payroll_line_items`: `id UUID PK`, `payroll_run_id UUID FK`, `employee_id UUID FK`, `gross_pay NUMERIC(12,2)`, `paye_tax NUMERIC(12,2)`, `employee_nic NUMERIC(12,2)`, `employer_nic NUMERIC(12,2)`, `net_pay NUMERIC(12,2)`, `tax_code TEXT DEFAULT '"'"'1257L'"'"'`, `ni_category TEXT DEFAULT '"'"'A'"'"'`
- `payslips`: `id UUID PK`, `payroll_line_item_id UUID FK`, `pdf_key TEXT` (MinIO key), `issued_at TIMESTAMPTZ`
- Indexes on: `employees.company_id`, `payroll_runs.company_id`, `payroll_runs.pay_period`, `payroll_runs.status`

## Constraints

- All monetary columns: `NUMERIC(12,2)` — never float (FR-18)
- `payroll_runs.status` CHECK constraint: `draft`, `approved`, `submitted` only
- `employees.ni_number` stored encrypted via `pgcrypto pgp_sym_encrypt` (or add `# FIXME(s8.1): encrypt NI number` if pgcrypto unavailable)
- `employees.deleted_at` present — records must never be hard-deleted (FR-22: 3-year retention)
- `payroll_runs.submitted_to_hmrc` defaults FALSE — set TRUE only after RTI submission (FR-19)
- Migration must be reversible (`alembic downgrade -1` cleans up cleanly)

## Acceptance criteria

- [ ] `alembic upgrade head` creates all four tables without error
- [ ] `alembic downgrade -1` reverses cleanly
- [ ] `pytest backend/services/payroll/tests/test_models.py -v` passes (monetary fields are Decimal, status constraint, soft delete)
- [ ] `make verify` exits 0

## Do NOT touch

- PAYE/NIC calculator (s8.2)
- RTI submission (s8.3)
- API endpoints or UI')
echo "  ✓ s8.1 → issue #$S81"

# ── s8.2 PAYE/NIC Calculator ─────────────────────────────────────────────────
S82=$(mkissue \
  "s8.2 — Payroll: PAYE & NIC Calculator" \
  "status:pending,priority:normal,layer:service,milestone:payroll,agent-session" \
  "$M8" \
"## Session Brief

**Session ID:** \`s8.2\`
**Layer:** service
**Branch:** \`feature/phase-8-s8.2-paye-calculator\`
**Depends on:** #$S81 (s8.1 DB schema must be merged first)
**Parallel with:** s8.3 (safe to run simultaneously once s8.1 is merged)

---

## Context files to load

- \`SPEC.md\` (Milestone 8 — PAYE Calculation)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-18)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-2, FP-9)
- \`backend/shared/constants/tax.py\`

## Task

Implement \`backend/services/payroll/calculator.py\` — \`PAYECalculator\` class:

1. \`calculate_employee(gross_salary: Decimal, tax_code: str, pay_period: str) -> EmployeePayCalculation\`
   Returns \`income_tax\`, \`employee_nic\`, \`net_pay\`, \`taxable_pay\`
2. \`calculate_employer(gross_salary: Decimal) -> Decimal\`
   Returns employer NIC: 13.8% above £9,100 secondary threshold
3. \`calculate_payroll_run(employees: list[Employee]) -> PayrollRunCalculation\`
   Returns \`total_gross\`, \`total_paye\`, \`total_employee_nic\`, \`total_employer_nic\`, \`total_net\`

Tax code \`1257L\` = personal allowance £12,570. Support annualised and monthly calculation (divide annual thresholds by 12). Apply income tax bands in sequence: basic → higher → additional.

Add constants to \`shared.constants.tax\`: \`PAYE_BASIC_RATE\`, \`PAYE_HIGHER_RATE\`, \`PAYE_ADDITIONAL_RATE\`, \`NIC_SECONDARY_THRESHOLD\`, \`NIC_EMPLOYER_RATE\`, \`HIGHER_RATE_THRESHOLD\`, \`ADDITIONAL_RATE_THRESHOLD\`

## Constraints

- All arithmetic: \`Decimal\` only — never \`float\` (FP-2)
- All thresholds/rates from constants — never hardcoded inline (FP-9)
- Monthly: annual thresholds ÷ 12, rounded to nearest penny
- Employer NIC is a company cost — never deducted from \`net_pay\`

## Acceptance criteria

- [ ] Gross £12,570/yr → zero income tax, zero employee NIC
- [ ] Gross £30,000/yr → correct basic rate income tax and NIC
- [ ] Gross £60,000/yr → higher rate band applies correctly above £37,700 threshold
- [ ] Employer NIC correctly = 13.8% × (gross − £9,100)
- [ ] Monthly × 12 = annual (no rounding drift)
- [ ] \`pytest backend/services/payroll/tests/test_calculator.py -v\` passes all bands
- [ ] \`make verify\` exits 0

## Do NOT touch

- RTI submission (s8.3)
- API endpoints (s8.4)
- Web UI")
echo "  ✓ s8.2 → issue #$S82"

# ── s8.3 RTI Submission ───────────────────────────────────────────────────────
S83=$(mkissue \
  "s8.3 — Payroll: RTI FPS Submission to HMRC" \
  "status:pending,priority:normal,layer:service,milestone:payroll,agent-session" \
  "$M8" \
"## Session Brief

**Session ID:** \`s8.3\`
**Layer:** service
**Branch:** \`feature/phase-8-s8.3-rti-submission\`
**Depends on:** #$S81 (s8.1 DB schema must be merged first)
**Parallel with:** s8.2 (safe to run simultaneously once s8.1 is merged)

---

## Context files to load

- \`SPEC.md\` (Milestone 8 — RTI)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-19)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-5, FP-8)
- \`.claude/guardrails/owasp-top10.md\` (A10 — external HTTP call)
- \`backend/services/payroll/models.py\`
- \`backend/services/payroll/calculator.py\`
- \`backend/shared/patterns/outbox.py\`

## Task

Implement \`backend/services/payroll/rti.py\` — \`RTISubmitter\` class:

1. \`async submit_fps(payroll_run_id: UUID) -> RTIResult\`
   Builds HMRC FPS XML payload (employee NI number, tax code, gross pay, PAYE deducted, NIC deducted), submits to HMRC Government Gateway sandbox, handles response, stores correlation ID, sets \`payroll_runs.submitted_to_hmrc = True\` and \`status = 'submitted'\`
2. Sandbox endpoint: \`https://test-api.service.hmrc.gov.uk/organisations/paye/{empref}/fps\`
   Use HMRC test credentials from env vars
3. Publish \`payroll.run\` event via outbox after successful submission

## Constraints

- FPS submitted **on or before** pay date — enforce in s8.4 API layer (FR-19)
- Once \`submitted_to_hmrc = True\`, payroll run is locked — no edits ever (FR-21)
- Audit log written on submission (FP-5)
- \`payroll.run\` event via outbox (FP-8)
- HMRC credentials from env only: \`HMRC_SENDER_ID\`, \`HMRC_PASSWORD\`, \`HMRC_EMPLOYER_REF\` — never hardcoded
- HMRC API error: do NOT set \`submitted_to_hmrc = True\` — return error to caller
- XML schema: HMRC RTI FPS v2023 structure

## Acceptance criteria

- [ ] \`submit_fps()\` builds valid FPS XML with all required employee fields
- [ ] Successful sandbox submission sets \`submitted_to_hmrc = True\` + stores correlation ID
- [ ] HMRC error leaves \`submitted_to_hmrc = False\` and returns the error
- [ ] Second call on already-submitted run raises \`PayrollAlreadySubmittedError\`
- [ ] \`payroll.run\` event published after successful submission
- [ ] \`pytest backend/services/payroll/tests/test_rti.py -v\` passes (HMRC API mocked with \`respx\`)
- [ ] \`make verify\` exits 0

## Do NOT touch

- PAYE calculator (s8.2)
- API endpoints (s8.4)
- Web UI")
echo "  ✓ s8.3 → issue #$S83"

# ── s8.4 API Endpoints ────────────────────────────────────────────────────────
S84=$(mkissue \
  "s8.4 — Payroll: API Endpoints" \
  "status:pending,priority:normal,layer:api,milestone:payroll,agent-session" \
  "$M8" \
"## Session Brief

**Session ID:** \`s8.4\`
**Layer:** api
**Branch:** \`feature/phase-8-s8.4-api-endpoints\`
**Depends on:** #$S82 (s8.2) AND #$S83 (s8.3) — both must be merged first
**Parallel with:** _none_

---

## Context files to load

- \`SPEC.md\` (Milestone 8 — Payroll Flow)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-18, FR-19, FR-21)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-3, FP-5, FP-6, FP-7)
- \`backend/services/payroll/calculator.py\`
- \`backend/services/payroll/rti.py\`
- \`backend/services/payroll/models.py\`

## Task

Implement \`backend/services/payroll/router.py\`:

**Employee management:**
- \`GET /api/v1/payroll/employees\`
- \`POST /api/v1/payroll/employees\`
- \`PUT /api/v1/payroll/employees/{id}\`
- \`DELETE /api/v1/payroll/employees/{id}\` (soft delete only)

**Payroll runs:**
- \`GET /api/v1/payroll/runs\`
- \`POST /api/v1/payroll/runs\` — creates draft, auto-calculates PAYE/NIC per employee
- \`GET /api/v1/payroll/runs/{id}\` — includes per-employee breakdown
- \`POST /api/v1/payroll/runs/{id}/approve\` — transitions to \`approved\` (owner role only)
- \`POST /api/v1/payroll/runs/{id}/submit\` — calls \`RTISubmitter.submit_fps()\`, transitions to \`submitted\`

**Payslips:**
- \`GET /api/v1/payroll/runs/{id}/payslips/{employee_id}\` — returns PDF

## Constraints

- All endpoints: \`owner\` role required (payroll is owner-only)
- \`DELETE /employees/{id}\`: soft delete only (FR-21, FR-22)
- \`POST /runs/{id}/submit\`: validate \`pay_period ≤ today\` (FR-19)
- Submitted run locked — \`PUT\`/\`DELETE\` on submitted run → 409 (FR-21, FP-6)
- All mutations write audit log (FP-5)
- \`POST /runs\` requires \`Idempotency-Key\` header (FP-14)
- All queries scope to \`current_user.company_id\` (FP-3)
- \`company_id\` always from JWT — never from request body (FP-4)

## Acceptance criteria

- [ ] \`POST /runs\` creates draft with calculated PAYE/NIC for all employees
- [ ] \`POST /runs/{id}/approve\` transitions to approved
- [ ] \`POST /runs/{id}/submit\` calls RTI and sets \`submitted_to_hmrc=True\`
- [ ] Second \`POST /submit\` on same run returns 409
- [ ] \`pytest backend/services/payroll/tests/test_router.py -v\` passes all endpoint tests
- [ ] \`make verify\` exits 0

## Do NOT touch

- PAYE/NIC calculator internals
- RTI XML building
- Web UI (s8.5)")
echo "  ✓ s8.4 → issue #$S84"

# ── s8.5 Web UI ───────────────────────────────────────────────────────────────
S85=$(mkissue \
  "s8.5 — Payroll: Web UI" \
  "status:pending,priority:normal,layer:ui-web,milestone:payroll,agent-session" \
  "$M8" \
"## Session Brief

**Session ID:** \`s8.5\`
**Layer:** ui-web
**Branch:** \`feature/phase-8-s8.5-web-ui\`
**Depends on:** #$S84 (s8.4 API endpoints must be merged first)
**Parallel with:** s8.6 (tests can run alongside UI build)

---

## Context files to load

- \`SPEC.md\` (Milestone 8 — Payroll Flow)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/frontend-practices.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-18, FR-19)
- \`packages/types/src/index.ts\`
- \`web/src/pages/PayrollPage.tsx\`

## Task

Build the complete payroll web UI:

1. **\`web/src/pages/PayrollPage.tsx\`** — two-tab layout: Employees and Pay Runs
2. **Employees tab:** table (name, NI masked \`****1234\`, tax code, salary, start date), "Add Employee" slide-out form, Edit, Remove with confirmation (soft delete)
3. **Pay Runs tab:** list with status badges (draft/approved/submitted), "Run Payroll" creates draft, draft shows per-employee breakdown (gross, PAYE, employee NIC, employer NIC, net), Approve button (owner only), "Submit to HMRC" (approved only) with warning modal
4. **Submitted runs:** lock icon, read-only, RTI correlation ID shown prominently
5. Wire \`PayrollPage\` to existing "Payroll" sidebar link (currently a placeholder)

## Constraints

- NI numbers masked in all list/table views — full number in edit form only (PII)
- "Submit to HMRC": two-step confirmation — click → modal → confirm (FR-19 gravity)
- Employer NIC column labelled **"Company NIC cost"** — visually distinct from employee NIC
- \`owner\` role only sees Approve and Submit buttons — other roles see read-only
- All monetary values via \`@keel/utils\` \`formatCurrency\`
- Use \`@keel/api\` for all HTTP — never bare \`fetch\`/\`axios\`
- Use TanStack Query for data fetching + cache invalidation

## Acceptance criteria

- [ ] Employee CRUD works end-to-end
- [ ] Draft payroll run shows correct PAYE/NIC calculations per employee
- [ ] Approve and Submit buttons follow correct role-gated flow
- [ ] Submitted run shows lock icon + RTI correlation ID
- [ ] \`pnpm --filter web test --run\` passes payroll table, employee form, and run status tests
- [ ] \`make verify\` exits 0

## Do NOT touch

- Mobile payroll UI (out of scope)
- PAYE calculator or RTI backend")
echo "  ✓ s8.5 → issue #$S85"

# ── s8.6 Integration Tests ────────────────────────────────────────────────────
S86=$(mkissue \
  "s8.6 — Payroll: Integration Tests" \
  "status:pending,priority:normal,layer:tests,milestone:payroll,agent-session" \
  "$M8" \
"## Session Brief

**Session ID:** \`s8.6\`
**Layer:** tests
**Branch:** \`feature/phase-8-s8.6-tests\`
**Depends on:** #$S84 (s8.4 API endpoints must be merged first)
**Parallel with:** s8.5 (UI build can run alongside)

---

## Context files to load

- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-18, FR-19, FR-21, FR-22)
- \`backend/services/payroll/calculator.py\`
- \`backend/services/payroll/rti.py\`
- \`backend/services/payroll/router.py\`

## Task

Write the complete payroll test suite:

1. **PAYE calculator:** £12,570 → zero tax/NIC; £30,000 → basic rate; £60,000 → higher rate; employer NIC excluded from net; monthly = annual ÷ 12
2. **RTI tests (mock HMRC):** FPS XML has required fields; success sets \`submitted_to_hmrc=True\`; HMRC error leaves it False; second submission raises \`PayrollAlreadySubmittedError\`
3. **API integration (testcontainers — real Postgres):** create employee → create run (auto-calculates) → approve → submit; submitted run → 409 on second submit; non-owner cannot approve/submit (403); soft delete doesn't hard-delete (FR-22); cross-tenant: company B cannot see company A's employees
4. **FPS XML validation:** parse generated XML and assert all HMRC-required fields present

## Constraints

- All monetary assertions use \`Decimal\` — never \`float\` (FP-2)
- HMRC API mocked with \`respx\` — no real HMRC calls
- Cross-tenant test required (FP-3)
- Submitted-run immutability: attempt edit on submitted run → 409 (FP-6)
- Soft delete: deleted employee not in list query but still in DB (FR-22)
- Coverage: 80%+ on calculator, rti, and router

## Acceptance criteria

- [ ] All 20+ test cases pass
- [ ] All three income tax bands tested with correct Decimal results
- [ ] RTI immutability test passes
- [ ] Cross-tenant isolation test passes
- [ ] \`pytest backend/services/payroll/tests/ -v --cov=backend/services/payroll --cov-fail-under=80\` exits 0
- [ ] \`make verify\` exits 0

## Do NOT touch

- Web UI tests
- Milestone 9 code")
echo "  ✓ s8.6 → issue #$S86"

echo ""

# ─────────────────────────────────────────────────────────────────────────────
# MILESTONE 9 — AI LAYER
# ─────────────────────────────────────────────────────────────────────────────
echo "=== Creating Milestone 9 issues ==="

# ── s9.1 Feature Flag & Infra ─────────────────────────────────────────────────
S91=$(mkissue \
  "s9.1 — AI Layer: Feature Flag & Shared AI Infrastructure" \
  "status:pending,priority:normal,layer:infra,milestone:ai-layer,agent-session" \
  "$M9" \
"## Session Brief

**Session ID:** \`s9.1\`
**Layer:** infra
**Branch:** \`feature/phase-9-s9.1-ai-infra\`
**Depends on:** #$S86 (s8.6 — all Milestone 8 work must be merged first)
**Parallel with:** _none — all Milestone 9 sessions depend on this_

---

## Context files to load

- \`SPEC.md\` (Milestone 9 — Feature Flag, 9.1, 9.2, 9.3)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`backend/shared/constants/tax.py\`

## Task

Set up shared AI infrastructure that all three Milestone 9 features depend on:

1. **\`backend/shared/ai/client.py\`** — Anthropic client factory: reads \`ANTHROPIC_API_KEY\` from env, returns a configured \`anthropic.AsyncAnthropic\`. Never instantiate inline — always use this factory.

2. **\`backend/shared/ai/feature_flag.py\`** — \`ai_enabled() -> bool\` reads \`FEATURE_AI_ENABLED\` env var (case-insensitive \`true\`/\`1\` → True, anything else → False). FastAPI dependency \`require_ai_enabled\` raises \`HTTP 501\` with \`{"error": "AI features not yet available", "code": "FEATURE_DISABLED"}\` if off.

3. **\`backend/shared/ai/rate_limiter.py\`** — Redis-backed: \`check_rate_limit(company_id, feature, max_calls, window_seconds)\` raises \`HTTP 429\` with \`Retry-After\` if exceeded. Defaults: categorisation 100/day, extraction 50/day, chat 20/day. Redis key: \`ai_rate:{company_id}:{feature}:{date}\`, expires midnight UTC.

4. Update the three stub endpoints from Milestones 3, 5, 6 to use \`Depends(require_ai_enabled)\`.

## Constraints

- \`ANTHROPIC_API_KEY\` must never appear in logs, responses, or errors (FP-18)
- \`ai_enabled()\` reads env var fresh each call — no module-level caching (supports runtime toggle)
- Rate limits per \`company_id\` — not per user

## Acceptance criteria

- [ ] \`ai_enabled()\` returns False when \`FEATURE_AI_ENABLED\` is unset or \`false\`
- [ ] \`ai_enabled()\` returns True when \`FEATURE_AI_ENABLED=true\`
- [ ] \`Depends(require_ai_enabled)\` returns 501 when flag is off
- [ ] Rate limiter blocks the 101st categorisation call for a company
- [ ] \`pytest backend/shared/tests/test_ai_infra.py -v\` passes
- [ ] \`make verify\` exits 0

## Do NOT touch

- Transaction categorisation logic (s9.2)
- Receipt extraction logic (s9.3)
- Tax chat logic (s9.4)
- Any UI — AI buttons already rendered from earlier milestones")
echo "  ✓ s9.1 → issue #$S91"

# ── s9.2 Transaction Categorisation ─────────────────────────────────────────
S92=$(mkissue \
  "s9.2 — AI Layer: Transaction Auto-Categorisation" \
  "status:pending,priority:normal,layer:service,milestone:ai-layer,agent-session" \
  "$M9" \
"## Session Brief

**Session ID:** \`s9.2\`
**Layer:** service
**Branch:** \`feature/phase-9-s9.2-transaction-categorisation\`
**Depends on:** #$S91 (s9.1 AI infra must be merged first)
**Parallel with:** s9.3 and s9.4 (all three can run once s9.1 is merged)

---

## Context files to load

- \`SPEC.md\` (Milestone 9 — 9.1 Transaction Categorisation)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-2)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-9, FP-12, FP-13)
- \`backend/shared/ai/client.py\`
- \`backend/shared/ai/feature_flag.py\`
- \`backend/shared/ai/rate_limiter.py\`
- \`backend/shared/constants/tax.py\`
- \`backend/services/banking/models.py\`

## Task

Implement transaction auto-categorisation at \`POST /api/v1/transactions/{id}/categorise\`:

1. Remove the 501 stub
2. **\`backend/services/banking/categoriser.py\`** — \`TransactionCategoriser\` with \`async categorise(transaction) -> CategorisationResult\`. Builds prompt from \`merchant_name\` + \`description\`, calls Claude requesting structured JSON: \`{ category, confidence, reasoning }\`. Maps to valid HMRC category from \`CT_ALLOWABLE_CATEGORIES\`
3. **Endpoint logic:** confidence ≥ 0.85 → auto-apply + audit log; confidence < 0.85 → return suggestion, set \`needs_review=True\`
4. Offload Claude call to Celery task (\`categorise_transaction_task\`) — return \`{ task_id, status: "processing" }\` immediately (FP-12). Client polls \`GET /tasks/{task_id}\`
5. Publish \`transaction.categorised\` event on completion

## Constraints

- Claude API call in Celery task — never blocking the request handler (FP-12)
- Response category validated against HMRC list — Claude may hallucinate invalid categories
- \`ENTERTAINMENT\` response must set \`flagged_as_entertainment=True\` (FR-2)
- Hardcoded prompt text OK; hardcoded category names never — use constants (FP-9)
- Rate limit: 100 calls/day per company via \`check_rate_limit()\`
- \`transaction.categorised\` event via outbox (FP-8)

## Acceptance criteria

- [ ] Returns 501 when \`FEATURE_AI_ENABLED=false\`
- [ ] With flag on: returns \`{ task_id, status: "processing" }\` immediately
- [ ] Celery task auto-applies category when confidence ≥ 0.85
- [ ] Returns suggestion (no auto-apply) when confidence < 0.85
- [ ] Invalid category from Claude → \`OTHER\` + \`needs_review=True\`
- [ ] \`pytest backend/services/banking/tests/test_categoriser.py -v\` passes (Claude API mocked)
- [ ] \`make verify\` exits 0

## Do NOT touch

- Receipt extraction (s9.3)
- Tax chat (s9.4)
- UI — '✦ Auto-categorise' button already rendered from Milestone 3")
echo "  ✓ s9.2 → issue #$S92"

# ── s9.3 Receipt Extraction ───────────────────────────────────────────────────
S93=$(mkissue \
  "s9.3 — AI Layer: Receipt Data Extraction" \
  "status:pending,priority:normal,layer:service,milestone:ai-layer,agent-session" \
  "$M9" \
"## Session Brief

**Session ID:** \`s9.3\`
**Layer:** service
**Branch:** \`feature/phase-9-s9.3-receipt-extraction\`
**Depends on:** #$S91 (s9.1 AI infra must be merged first)
**Parallel with:** s9.2 and s9.4

---

## Context files to load

- \`SPEC.md\` (Milestone 9 — 9.2 Receipt Data Extraction)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-2, FR-13)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-2, FP-9, FP-12)
- \`.claude/guardrails/owasp-top10.md\` (A10 — file upload)
- \`backend/shared/ai/client.py\`
- \`backend/shared/ai/feature_flag.py\`
- \`backend/shared/ai/rate_limiter.py\`
- \`backend/services/documents/models.py\`

## Task

Implement receipt data extraction at \`POST /api/v1/documents/{id}/extract\`:

1. Remove the 501 stub
2. **\`backend/services/documents/extractor.py\`** — \`ReceiptExtractor\`:
   - Fetch document from MinIO
   - If image: run Tesseract OCR via \`pytesseract.image_to_string()\`
   - Pass raw text to Claude requesting structured JSON: \`{ amount, date, vendor, vat_amount, category, confidence: { amount, date, vendor, vat_amount } }\`
   - Return \`ExtractionResult\` with all fields + per-field confidence scores
3. Endpoint: offload to Celery task, return \`{ task_id, status: "processing" }\` (FP-12)
4. On completion: PATCH document with extracted fields, set low-confidence fields (< 0.8) to \`needs_review=True\`, publish \`document.parsed\` event

## Constraints

- Tesseract call in Celery task — not in request handler (FP-12)
- \`amount\` and \`vat_amount\` must be parsed to \`Decimal\` — reject non-numeric (FP-2)
- \`vat_amount > amount × 0.20\` → both fields set to \`needs_review\` (FR-13)
- Category from Claude validated against HMRC list — invalid → \`OTHER\` + \`needs_review\`
- Rate limit: 50 extraction calls/day per company
- \`document.parsed\` event via outbox (FP-8)

## Acceptance criteria

- [ ] Returns 501 when \`FEATURE_AI_ENABLED=false\`
- [ ] With flag on: returns \`{ task_id, status: "processing" }\` immediately
- [ ] Celery task runs OCR, calls Claude, patches document with extracted fields
- [ ] Low-confidence fields → \`needs_review=True\`
- [ ] \`vat_amount > amount × 0.20\` triggers both fields to \`needs_review\`
- [ ] \`pytest backend/services/documents/tests/test_extractor.py -v\` passes (Tesseract + Claude mocked)
- [ ] \`make verify\` exits 0

## Do NOT touch

- Transaction categorisation (s9.2)
- Tax chat (s9.4)
- UI — '✦ Extract with AI' button already rendered from Milestone 5")
echo "  ✓ s9.3 → issue #$S93"

# ── s9.4 Tax Chat ─────────────────────────────────────────────────────────────
S94=$(mkissue \
  "s9.4 — AI Layer: Tax Chat Assistant" \
  "status:pending,priority:normal,layer:service,milestone:ai-layer,agent-session" \
  "$M9" \
"## Session Brief

**Session ID:** \`s9.4\`
**Layer:** service
**Branch:** \`feature/phase-9-s9.4-tax-chat\`
**Depends on:** #$S91 (s9.1 AI infra must be merged first)
**Parallel with:** s9.2 and s9.3

---

## Context files to load

- \`SPEC.md\` (Milestone 9 — 9.3 Tax Chat Assistant)
- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-2, FR-15, FR-16, FR-17)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-3, FP-18)
- \`backend/shared/ai/client.py\`
- \`backend/shared/ai/feature_flag.py\`
- \`backend/shared/ai/rate_limiter.py\`
- \`backend/services/tax/vat_calculator.py\`
- \`backend/services/tax/ct_estimator.py\`

## Task

Implement the tax chat assistant at \`POST /api/v1/ai/chat\`:

1. **\`backend/services/ai/chat.py\`** — \`TaxChatService\` with \`async stream_chat(company_id, message, session_id) -> AsyncIterator[str]\`. Uses Claude function calling with five read-only tools scoped to \`company_id\`: \`get_balance()\`, \`get_ct_estimate()\`, \`get_vat_liability()\`, \`get_expenses_by_category()\`, \`get_invoices_outstanding()\`
2. Endpoint: SSE via FastAPI \`StreamingResponse\`. Client receives \`data: {chunk}\\n\\n\`
3. **\`backend/services/ai/chat_tools.py\`** — the five tool implementations as async functions accepting \`company_id: UUID\`, returning formatted summaries (never raw SQL results)
4. Store \`chat_history\` in Redis keyed by \`session_id\` (TTL 1 hour) for multi-turn conversation

## Constraints

- Tool functions are **read-only** — no DB writes, no mutations, no event publishing
- Tool functions always filter by \`company_id\` — cross-tenant impossible (FP-3)
- Never include raw SQL results in Claude context — format data first
- Never log chat messages (contain PII + financial data) — log session_id and company_id only (FP-18)
- Rate limit: 20 chat messages/day per company
- SSE: \`Content-Type: text/event-stream\`, \`Cache-Control: no-cache\`
- System prompt must include: company's current financial context (balance, CT estimate, next deadline)

## Acceptance criteria

- [ ] Returns 501 when \`FEATURE_AI_ENABLED=false\`
- [ ] With flag on: streams SSE chunks in real-time
- [ ] Each tool function returns data scoped to the correct company
- [ ] Multi-turn: second message in same session has first message context
- [ ] 'What's my CT liability?' calls \`get_ct_estimate()\` and incorporates the result
- [ ] \`pytest backend/services/ai/tests/test_chat.py -v\` passes (Claude API + tool calls mocked)
- [ ] \`make verify\` exits 0

## Do NOT touch

- Transaction categorisation (s9.2)
- Receipt extraction (s9.3)
- Chat UI (implemented in s9.5)")
echo "  ✓ s9.4 → issue #$S94"

# ── s9.5 Tests & Chat UI ──────────────────────────────────────────────────────
S95=$(mkissue \
  "s9.5 — AI Layer: Tests & Chat UI" \
  "status:pending,priority:normal,layer:tests+ui,milestone:ai-layer,agent-session" \
  "$M9" \
"## Session Brief

**Session ID:** \`s9.5\`
**Layer:** tests + ui
**Branch:** \`feature/phase-9-s9.5-tests-and-ui\`
**Depends on:** #$S92 (s9.2) AND #$S93 (s9.3) AND #$S94 (s9.4) — all three must be merged
**Parallel with:** _none — final session_

---

## Context files to load

- \`CLAUDE.md\`
- \`.claude/guardrails/QUICK-REF.md\`
- \`.claude/guardrails/financial-rules.md\` (FR-2)
- \`.claude/guardrails/forbidden-patterns.md\` (FP-3, FP-12, FP-18)
- \`.claude/guardrails/frontend-practices.md\`
- \`backend/services/banking/categoriser.py\`
- \`backend/services/documents/extractor.py\`
- \`backend/services/ai/chat.py\`
- \`backend/services/ai/chat_tools.py\`
- \`web/src/pages/TaxPage.tsx\`
- \`mobile/app/(app)/more/tax.tsx\`

## Task

Two parallel deliverables:

### A — Full AI Test Suite

1. **Categorisation:** confidence 0.9 → auto-applied; confidence 0.7 → suggestion only; invalid category → \`OTHER\`; \`ENTERTAINMENT\` sets \`flagged_as_entertainment=True\`; rate limit exceeded → 429
2. **Extraction:** \`vat_amount > amount × 0.20\` → both \`needs_review\`; low confidence → \`needs_review\`; feature flag off → 501
3. **Chat:** tool calls triggered by intent ('What's my CT?'); tool functions are read-only (assert no writes); cross-tenant: company B session cannot access company A data

### B — Chat UI

4. **\`web/src/components/ai/ChatSheet.tsx\`** — bottom-right slide-up sheet, message input, streamed SSE response rendering, tool invocations shown as collapsible "Looking up your data…" blocks. Wire to '✦ Ask Keel AI' on TaxPage
5. **\`mobile/components/ai/ChatSheet.tsx\`** — \`@gorhom/bottom-sheet\` equivalent, SSE streaming via \`fetch\` with streaming body (no native EventSource on RN)

## Constraints

- Chat UI: SSE via \`EventSource\` on web, \`fetch\` streaming on React Native
- Render chat messages as markdown: \`react-markdown\` (web), \`react-native-markdown-display\` (mobile)
- Never display raw tool results to user — Claude formats them in the response
- Rate limit tests use real Redis (testcontainers)
- Coverage: 80%+ on all AI modules

## Acceptance criteria

- [ ] All 20+ AI test cases pass
- [ ] Cross-tenant isolation test passes
- [ ] Feature flag 501 test passes for all three AI endpoints
- [ ] Chat sheet renders on web and mobile with streaming responses
- [ ] \`pytest backend/services/ai/tests/ backend/services/banking/tests/test_categoriser.py backend/services/documents/tests/test_extractor.py -v --cov-fail-under=80\` exits 0
- [ ] \`pnpm --filter web test --run\` passes chat sheet component tests
- [ ] \`make verify\` exits 0

## Do NOT touch

- Any Milestone 1–8 code — this session is additive only
- Backend AI logic (already built in s9.2–s9.4)")
echo "  ✓ s9.5 → issue #$S95"

# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "=== Summary ==="
echo ""
echo "Labels:     created (idempotent)"
echo "Milestones: Milestone 8 (#$M8), Milestone 9 (#$M9)"
echo ""
echo "Milestone 8 — Payroll:"
echo "  #$S81  s8.1 — DB Schema (no deps)"
echo "  #$S82  s8.2 — PAYE Calculator (depends on #$S81)"
echo "  #$S83  s8.3 — RTI Submission  (depends on #$S81, parallel with #$S82)"
echo "  #$S84  s8.4 — API Endpoints   (depends on #$S82, #$S83)"
echo "  #$S85  s8.5 — Web UI          (depends on #$S84, parallel with #$S86)"
echo "  #$S86  s8.6 — Tests           (depends on #$S84, parallel with #$S85)"
echo ""
echo "Milestone 9 — AI Layer:"
echo "  #$S91  s9.1 — AI Infra        (depends on #$S86)"
echo "  #$S92  s9.2 — Categorisation  (depends on #$S91, parallel with #$S93, #$S94)"
echo "  #$S93  s9.3 — Receipt Extract (depends on #$S91, parallel with #$S92, #$S94)"
echo "  #$S94  s9.4 — Tax Chat        (depends on #$S91, parallel with #$S92, #$S93)"
echo "  #$S95  s9.5 — Tests + UI      (depends on #$S92, #$S93, #$S94)"
echo ""
echo "Open in browser:"
gh repo view --web --repo "$REPO" 2>/dev/null || echo "  https://github.com/$REPO/issues"
