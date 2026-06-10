---
# Session: Gap 1 Settings — API Endpoints
## Phase
Gap 1 — Settings Page (prerequisite for Phase 6)

## Context files to load
- `SPEC.md` (section: Gap 1 — Settings API additions)
- `CLAUDE.md`
- `.claude/guardrails/forbidden-patterns.md` (FP-3, FP-5, FP-7)
- `backend/services/auth/models.py`
- `backend/shared/middleware/auth.py`

## Your task
Add the settings endpoints to the auth service: (1) `PUT /api/v1/auth/me/company` — updates all editable company fields (`name`, `trading_name`, `company_number`, `utr`, `vat_number`, `vat_scheme`, `vat_stagger`, `year_end_month`, `payment_terms_days`, `invoice_footer`, `address`). Validates `vat_stagger` is A/B/C, `vat_scheme` is cash/accrual, `year_end_month` 1–12. Writes audit log. (2) `POST /api/v1/auth/me/company/logo` — accepts multipart file upload (PNG/JPEG, max 2MB), uploads to MinIO at `company-logos/{company_id}/{uuid}.{ext}`, stores key in `companies.logo_key`, returns the logo key. (3) `GET /api/v1/auth/me/notification-prefs` and `PUT /api/v1/auth/me/notification-prefs` — get/set notification preferences per user.

## Constraints
- `PUT /company` requires `owner` role — `Depends(require_role("owner"))` (CLAUDE.md rule 6)
- `company_id` always from JWT — never from request body (FP-4)
- All mutations write audit log (FP-5)
- Logo upload: only PNG/JPEG, max 2MB — reject others with 415/413
- `vat_number` format validation: UK VAT numbers are `GB` + 9 digits — validate regex if provided
- Notification prefs scoped to `user_id` from JWT (each user has their own prefs)

## Done when
- `PUT /company` updates settings and writes audit log
- `PUT /company` with `vat_stagger="X"` returns 422
- `POST /logo` uploads PNG and returns logo key
- `GET /notification-prefs` returns user's prefs
- `pytest backend/services/auth/tests/test_settings_api.py -v` passes
- `make verify` runs pytest and exits 0

## Do NOT touch
- Settings web UI (sg1.3)
- Any tax calculations (Phase 6)
- Phase 7 notification dispatch
---
