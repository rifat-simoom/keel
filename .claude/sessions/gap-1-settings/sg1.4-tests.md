---
# Session: Gap 1 Settings — Tests
## Phase
Gap 1 — Settings Page (prerequisite for Phase 6)

## Context files to load
- `CLAUDE.md`
- `.claude/guardrails/financial-rules.md` (FR-5, FR-7)
- `backend/services/auth/router.py`
- `backend/services/auth/models.py`

## Your task
Write the complete test suite for Gap 1: (1) `backend/services/auth/tests/test_settings_api.py` — `PUT /company` updates all fields correctly; `vat_stagger` rejects invalid values (`X`, `D`, empty string); `vat_scheme` rejects anything other than `cash`/`accrual`; `year_end_month` rejects 0 and 13; `PUT /company` by non-owner role returns 403; logo upload accepts PNG/JPEG, rejects PDF and oversized files; audit log written on company update; notification prefs get/put round-trip. (2) `web/src/pages/__tests__/SettingsPage.test.tsx` — VAT stagger selector shows deadline dates for each group; VAT registered toggle hides/shows VAT fields; saving tax setup calls the API with correct payload; non-owner user sees read-only view on Company tab.

## Constraints
- testcontainers for backend tests
- Non-owner role test: create a user with `role='accountant'`, assert `PUT /company` returns 403
- Logo MinIO test: use real MinIO (dev docker-compose) — assert file exists at correct key after upload
- Web tests: mock API calls with MSW (Mock Service Worker) — no real network calls in Vitest
- Coverage: 80%+ on settings-related code

## Done when
- All 12+ test cases pass
- Non-owner 403 test passes
- Logo MinIO test passes
- `pytest backend/services/auth/tests/test_settings_api.py -v --cov-fail-under=80` exits 0
- `pnpm --filter web test --run` passes settings page tests
- `make verify` runs both and exits 0

## Do NOT touch
- Phase 6 tax service
- Other auth endpoints
---
