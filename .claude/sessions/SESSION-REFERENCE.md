# Keel — Agent Session Index

> **65 bounded sessions** across 10 phases + 1 gap block.
> Each session is one layer of one concern, completable in a single Claude Code session,
> verifiable with `make verify`.
>
> **Always load** (every session):
> - `CLAUDE.md`
> - `.claude/guardrails/QUICK-REF.md`
> - `.claude/workflows/agent-loop.md`
>
> **Load on demand** (only when the session touches that domain):
> - `.claude/guardrails/python-practices.md` — backend sessions
> - `.claude/guardrails/frontend-practices.md` — web / mobile sessions
> - `.claude/guardrails/owasp-top10.md` — auth, money, file uploads, events
> - `.claude/guardrails/financial-rules.md` — VAT, CT, payroll calculations
> - `.claude/guardrails/forbidden-patterns.md` — financial mutations
>
> This two-tier loading keeps context windows lean. QUICK-REF covers the rules most
> likely to be violated. Pull the full file only when you need the detailed examples.

---

## Execution Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
→ Gap 1 (Settings) → Phase 6 → Phase 7 → Phase 8 → Phase 9
```

Within each phase, execute sessions in numbered order (schema before API before UI before tests).

---

## Phase 0 — Foundation ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s0.1 | `phase-0-foundation/s0.1-monorepo.md` | pnpm workspaces + shared TS packages |
| s0.2 | `phase-0-foundation/s0.2-docker-and-shared-backend.md` | Docker Compose + shared Python patterns |

---

## Phase 1 — Auth & Identity ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s1.1 | `phase-1-auth/s1.1-db-schema.md` | DB schema (companies, user_profiles) |
| s1.2 | `phase-1-auth/s1.2-keycloak-realm.md` | Keycloak realm config |
| s1.3 | `phase-1-auth/s1.3-backend-service.md` | Backend auth service + middleware |
| s1.4 | `phase-1-auth/s1.4-web-auth.md` | Web PKCE flow + protected routes |
| s1.5 | `phase-1-auth/s1.5-mobile-auth.md` | Mobile expo-auth-session PKCE |
| s1.6 | `phase-1-auth/s1.6-tests.md` | Integration tests |

---

## Phase 2 — UI Shell & Navigation ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s2.1 | `phase-2-shell/s2.1-web-shell.md` | Web sidebar layout |
| s2.2 | `phase-2-shell/s2.2-mobile-navigation.md` | Mobile bottom tabs + FAB |
| s2.3 | `phase-2-shell/s2.3-dashboard-cards.md` | Dashboard cards (web + mobile) |
| s2.4 | `phase-2-shell/s2.4-tests.md` | Component tests |

---

## Phase 3 — Banking & Transactions ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s3.1 | `phase-3-banking/s3.1-db-schema.md` | DB schema (accounts, transactions, virtual_cards) |
| s3.2 | `phase-3-banking/s3.2-api-endpoints.md` | 8 API endpoints |
| s3.3 | `phase-3-banking/s3.3-web-ui.md` | Web transactions + card UI |
| s3.4 | `phase-3-banking/s3.4-mobile-ui.md` | Mobile transactions + card UI |
| s3.5 | `phase-3-banking/s3.5-tests.md` | Integration tests |

---

## Phase 4 — Invoicing ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s4.1 | `phase-4-invoicing/s4.1-db-schema.md` | DB schema (invoices, invoice_events) |
| s4.2 | `phase-4-invoicing/s4.2-state-machine.md` | State machine + number generator |
| s4.3 | `phase-4-invoicing/s4.3-api-endpoints.md` | 9 API endpoints |
| s4.4 | `phase-4-invoicing/s4.4-pdf-generation.md` | PDF generation (all 9 VAT fields) |
| s4.5 | `phase-4-invoicing/s4.5-scheduler.md` | Overdue Celery beat task |
| s4.6 | `phase-4-invoicing/s4.6-web-ui.md` | Web invoice list + create + detail |
| s4.7 | `phase-4-invoicing/s4.7-mobile-ui.md` | Mobile invoice list + create + detail |
| s4.8 | `phase-4-invoicing/s4.8-tests.md` | Integration tests (incl. concurrent number test) |

---

## Phase 5 — Documents & Receipts ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s5.1 | `phase-5-documents/s5.1-db-schema.md` | DB schema (documents) |
| s5.2 | `phase-5-documents/s5.2-upload-api.md` | Upload API + MinIO |
| s5.3 | `phase-5-documents/s5.3-manual-entry.md` | Manual entry PATCH + AI stub |
| s5.4 | `phase-5-documents/s5.4-transaction-matching.md` | Match/unmatch + reconciliation count |
| s5.5 | `phase-5-documents/s5.5-web-ui.md` | Web drag-drop + detail + match modal |
| s5.6 | `phase-5-documents/s5.6-mobile-camera.md` | Mobile camera scan flow |
| s5.7 | `phase-5-documents/s5.7-tests.md` | Integration tests (incl. retention test) |

---

## Gap 1 — Settings Page (prerequisite for Phase 6)

| Session | File | Layer |
|---------|------|-------|
| sg1.1 | `gap-1-settings/sg1.1-db-schema.md` | DB schema additions to companies |
| sg1.2 | `gap-1-settings/sg1.2-api.md` | Company settings + logo + notification prefs API |
| sg1.3 | `gap-1-settings/sg1.3-web-ui.md` | Settings page (Company, Tax, Invoice, Notifications tabs) |
| sg1.4 | `gap-1-settings/sg1.4-tests.md` | Tests (incl. non-owner 403 + MinIO logo) |

---

## Phase 6 — Tax & Accounting ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s6.1 | `phase-6-tax/s6.1-vat-calculator.md` | VAT calculator (cash + accrual schemes) |
| s6.2 | `phase-6-tax/s6.2-ct-estimator.md` | CT estimator (marginal relief formula) |
| s6.3 | `phase-6-tax/s6.3-pay-optimiser.md` | Salary/dividends optimiser |
| s6.4 | `phase-6-tax/s6.4-api-endpoints.md` | Tax API endpoints + deadlines |
| s6.5 | `phase-6-tax/s6.5-web-ui.md` | Web VAT + CT + optimiser UI |
| s6.6 | `phase-6-tax/s6.6-mobile-ui.md` | Mobile tax screens |
| s6.7 | `phase-6-tax/s6.7-tests.md` | Integration tests (all CT rate bands) |

---

## Phase 7 — Notifications & Deadlines ✅ Done

| Session | File | Layer |
|---------|------|-------|
| s7.1 | `phase-7-notifications/s7.1-db-schema.md` | DB schema (notifications, device_tokens) |
| s7.2 | `phase-7-notifications/s7.2-event-consumers.md` | RabbitMQ consumers (all event types) |
| s7.3 | `phase-7-notifications/s7.3-push-service.md` | Expo Push API dispatch |
| s7.4 | `phase-7-notifications/s7.4-email-service.md` | Resend email dispatch + templates |
| s7.5 | `phase-7-notifications/s7.5-deadlines-service.md` | Deadline aggregator + Celery scheduler |
| s7.6 | `phase-7-notifications/s7.6-web-ui.md` | Notification bell + deadline banner |
| s7.7 | `phase-7-notifications/s7.7-mobile-push.md` | Mobile push setup + in-app list |
| s7.8 | `phase-7-notifications/s7.8-tests.md` | Integration tests (incl. idempotency) |

---

## Phase 8 — Payroll ⬜ Post-MVP

| Session | File | Layer |
|---------|------|-------|
| s8.1 | `phase-8-payroll/s8.1-db-schema.md` | DB schema (employees, payroll_runs, payslips) |
| s8.2 | `phase-8-payroll/s8.2-paye-nic-calculator.md` | PAYE + NIC calculator (all three tax bands) |
| s8.3 | `phase-8-payroll/s8.3-rti-submission.md` | HMRC RTI FPS submission |
| s8.4 | `phase-8-payroll/s8.4-api-endpoints.md` | Payroll CRUD + approve + submit endpoints |
| s8.5 | `phase-8-payroll/s8.5-web-ui.md` | Payroll web UI |
| s8.6 | `phase-8-payroll/s8.6-tests.md` | Integration tests |

---

## Phase 9 — AI Layer ⬜ Post-MVP

| Session | File | Layer |
|---------|------|-------|
| s9.1 | `phase-9-ai/s9.1-feature-flag-and-infra.md` | Feature flag + AI client + rate limiter |
| s9.2 | `phase-9-ai/s9.2-transaction-categorisation.md` | Transaction auto-categorisation (Claude) |
| s9.3 | `phase-9-ai/s9.3-receipt-extraction.md` | Receipt OCR + data extraction (Tesseract + Claude) |
| s9.4 | `phase-9-ai/s9.4-tax-chat.md` | Tax chat assistant (SSE streaming + tool calling) |
| s9.5 | `phase-9-ai/s9.5-tests-and-ui.md` | AI tests + chat UI (web + mobile) |

---

## Quick Reference — Guardrail Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Standing rules for every session |
| `.claude/guardrails/financial-rules.md` | Every HMRC rule (FR-1 through FR-24) |
| `.claude/guardrails/forbidden-patterns.md` | Banned code patterns with examples (FP-1 through FP-22) |

---

## `make verify` Contract

Every session defines a `make verify` command. The Makefile must route it to:

```makefile
verify:
	@echo "Running verify for SESSION=$(SESSION)"
	# Backend sessions: pytest with coverage
	# Web sessions:     pnpm --filter web test --run
	# Mobile sessions:  pnpm --filter mobile test --run
	# Schema sessions:  alembic upgrade head && alembic downgrade -1 && pytest
	# Combined:         run all relevant subsets
```

A session is **done** only when `make verify` exits 0 with all conditions in "Done when" met.
