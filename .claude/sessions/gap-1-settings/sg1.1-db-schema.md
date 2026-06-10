---
# Session: Gap 1 Settings — Database Schema
## Phase
Gap 1 — Settings Page (prerequisite for Phase 6)

## Context files to load
- `SPEC.md` (section: Gap 1 — Settings Page, Schema additions)
- `CLAUDE.md`
- `.claude/guardrails/financial-rules.md` (FR-5, FR-7, FR-16, FR-23)
- `backend/services/auth/models.py`

## Your task
Create the Alembic migration that adds the missing columns to `companies` as specified in SPEC.md Gap 1: `vat_scheme TEXT DEFAULT 'cash'`, `vat_stagger TEXT DEFAULT 'A'`, `year_end_month INT DEFAULT 3`, `payment_terms_days INT DEFAULT 30`, `invoice_footer TEXT`, `logo_key TEXT`. Also create the `notification_prefs` table: `id UUID PK`, `company_id UUID FK`, `user_id UUID FK`, `invoice_viewed BOOLEAN DEFAULT TRUE`, `invoice_overdue BOOLEAN DEFAULT TRUE`, `payment_received BOOLEAN DEFAULT TRUE`, `tax_deadline_30d BOOLEAN DEFAULT TRUE`, `tax_deadline_7d BOOLEAN DEFAULT TRUE`, `tax_deadline_1d BOOLEAN DEFAULT TRUE`, `created_at`, `updated_at`. Update the `Company` SQLAlchemy model to include these new columns. Add `CHECK` constraint on `vat_scheme IN ('cash', 'accrual')` and `vat_stagger IN ('A', 'B', 'C')` and `year_end_month BETWEEN 1 AND 12`.

## Constraints
- `vat_scheme` default is `'cash'` — not `'accrual'` (FR-5, SPEC: default to cash for freelancers)
- `vat_stagger` values: only `'A'`, `'B'`, `'C'` — CHECK constraint enforced at DB level (FR-7)
- `year_end_month` range: 1–12 — CHECK constraint
- `payment_terms_days` default: 30
- Migration must be backwards-compatible — all new columns have defaults
- Migration reversible

## Done when
- `alembic upgrade head` adds all columns and `notification_prefs` table cleanly
- `alembic downgrade -1` reverses cleanly
- `Company` model has all new fields with correct Python types
- `pytest backend/services/auth/tests/test_company_settings.py -v` passes (defaults, constraints, model fields)
- `make verify` runs alembic + pytest and exits 0

## Do NOT touch
- Settings API endpoints (sg1.2)
- Settings web UI (sg1.3)
- Phase 6 tax service (depends on these columns existing)
---
