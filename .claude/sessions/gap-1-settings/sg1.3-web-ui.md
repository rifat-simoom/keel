---
# Session: Gap 1 Settings — Web UI
## Phase
Gap 1 — Settings Page (prerequisite for Phase 6)

## Context files to load
- `SPEC.md` (section: Gap 1 — Required settings fields table)
- `CLAUDE.md`
- `packages/validation/src/`
- `web/src/pages/SettingsPage.tsx`

## Your task
Build the complete Settings page: (1) `web/src/pages/SettingsPage.tsx` — tabbed layout (Company, Tax Setup, Invoice Defaults, Notifications). (2) Company tab: company name, trading name, company number, UTR, VAT number, registered address (street, city, postcode, country). (3) Tax Setup tab: VAT registered toggle (if no → hide VAT fields), VAT number (shown if registered), VAT scheme (Cash / Standard Accrual) with explanatory tooltip, VAT stagger group (A/B/C with deadline dates shown for each), company year-end month (month picker). (4) Invoice Defaults tab: default payment terms days (number input), invoice footer text (textarea), logo upload (image preview + upload button). (5) Notifications tab: toggles mapped to `notification_prefs` fields with human-readable labels. All tabs use React Hook Form + Zod, auto-save on blur or explicit Save button.

## Constraints
- VAT stagger group selector must show the deadline dates for each group (e.g., "Group A — returns due 7 May, 7 Aug, 7 Nov, 7 Feb")
- VAT scheme dropdown must explain each option: "Cash — VAT due when client pays" / "Accrual — VAT due when invoice sent"
- Logo upload preview renders the uploaded image inline after selection
- All forms use Zod schemas from `@keel/validation` — validate before API call
- `owner` role only can edit company/tax settings — accountant/employee sees read-only view
- Year-end month picker must show month names (January–December), not numbers

## Done when
- All four settings tabs render with correct fields
- Saving tax setup updates `vat_scheme`, `vat_stagger`, `year_end_month` via API
- Logo upload previews and saves to MinIO via API
- Notification toggles save preferences
- Non-owner users see read-only views on Company and Tax tabs
- `pnpm --filter web test --run` passes settings page tests
- `make verify` runs vitest and exits 0

## Do NOT touch
- Mobile settings (implement later if needed)
- Phase 6 tax calculations
- Auth logic
---
