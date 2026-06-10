# CLAUDE.md — Keel Agent Standing Rules

> These rules apply to **every agent session** unless a session brief explicitly overrides one.
> Never deviate without a human-approved ADR in `/docs/ADR/`.

---

## 1. Tech Stack — Non-Negotiable

### Backend
- Python 3.12+, FastAPI (async), SQLAlchemy 2.0 (async), PostgreSQL 16
- RabbitMQ for all inter-service events — never direct service-to-service HTTP
- Redis for caching + Celery task queue
- Keycloak for all auth — never implement custom auth

### Web Frontend
- React 18 TypeScript, Zustand state, TanStack Query
- shadcn/ui + Tailwind CSS, React Hook Form + Zod, React Router v6

### Mobile
- React Native 0.74+ (Expo managed workflow), Expo Router, TypeScript
- expo-auth-session (PKCE), expo-secure-store (tokens), MMKV (offline cache)

### Shared Packages (used by BOTH web and mobile — never duplicate)
- `@keel/types` — all shared TypeScript interfaces
- `@keel/api` — shared Axios client with interceptors
- `@keel/validation` — Zod schemas
- `@keel/utils` — formatting, UK tax helpers

---

## 2. Money — Decimal Only, Never Float

- PostgreSQL: `NUMERIC(12,2)` for all monetary columns
- Python: `Decimal` (from `decimal` module), never `float`
- TypeScript: integer pence arithmetic or a money library — never `number` for currency math
- Rounding errors in tax calculations are legal errors — treat as bugs

---

## 3. Multi-Tenancy — company_id on Everything

- Every financial record has `company_id UUID NOT NULL`
- Every query filters by `company_id` extracted from the verified JWT
- **Never** trust a `company_id` from the request body — always from `user.company_id`
- Cross-tenant data access is a critical security vulnerability

---

## 4. Financial Records — Immutability (UK Law)

- **No hard deletes** on any financial table (invoices, transactions, expenses, payroll_runs, vat_returns, ct_filings, documents)
- Every financial table has `deleted_at TIMESTAMPTZ` (soft delete only)
- Every financial table has `created_by UUID` and `updated_by UUID`
- Every mutation writes an `audit_log` row: `table_name`, `record_id`, `action`, `old_values`, `new_values`, `user_id`, `created_at`
- Submitted VAT returns and filed CT returns are permanently locked — no edits ever
- Receipt files in MinIO retained for statutory periods (6 years CT, 4 years VAT)

---

## 5. API Conventions

- All endpoints: `/api/v1/`
- JSON body and response, `snake_case` field names, ISO 8601 dates, UUID primary keys
- Pagination: `?page=1&page_size=20`
- Error response shape: `{ "error": string, "code": string, "details"?: object }`
- Every mutation endpoint accepts `Idempotency-Key` header and checks it before processing
- Auth required on every endpoint via `Depends(require_auth)` — no exceptions

---

## 6. Auth Rules

- All protected endpoints: `user: User = Depends(require_auth)`
- Role restrictions: `Depends(require_role("owner"))` for destructive operations
- JWKS fetched from Keycloak, cached in Redis, refreshed every 24h
- Access token stored in memory only (Zustand on web/mobile)
- Refresh token: httpOnly cookie (web) or `expo-secure-store` (mobile)
- Never store access tokens in `localStorage`, `AsyncStorage`, or any persistent store

---

## 7. Event-Driven Architecture

- Services communicate **only** via RabbitMQ — never direct HTTP between services
- Every event written to outbox table before publishing (outbox pattern guarantees delivery)
- Only events in the SPEC event catalogue are valid — add new ones to the catalogue first
- Event schema: `{ event_type, company_id, payload, published_at, idempotency_key }`

---

## 8. AI Feature Flag

- All three AI features gated by `FEATURE_AI_ENABLED` env var
- If `false` or unset: endpoints return `501 Not Implemented`
- UI renders AI hook buttons at all times — shows "Coming soon" toast when flag is off
- Never conditionally render AI buttons based on the flag (UX consistency)
- No code changes needed to enable — flip env var and redeploy

---

## 9. Testing Requirements

- **Backend**: pytest + testcontainers (real Postgres, real RabbitMQ) — no DB mocks
- **Web**: Vitest + React Testing Library
- **Mobile**: Jest + React Native Testing Library
- **E2E**: Playwright (web)
- Coverage target: **80%** on all business logic (calculators, state machines, validators)
- Financial calculation tests must cover HMRC boundary conditions (e.g., £50,000 / £250,000 CT bands)
- Every state machine transition must have a test

---

## 10. Database Conventions

- All tables: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Financial tables additionally: `deleted_at TIMESTAMPTZ`, `created_by UUID`, `updated_by UUID`
- Alembic for all migrations — never `ALTER` production tables manually
- Indexes on: all FKs, `company_id`, `status`, `created_at` on every financial table
- All queries must filter `deleted_at IS NULL` unless explicitly fetching deleted records

---

## 11. Invoice State Machine — Hard Rules

- `DRAFT` is the only status that allows edits and deletion
- `SENT` and beyond: never delete, never edit amounts — cancel only via credit note
- Invoice numbers: format `INV-YYYY-NNN`, sequential, no gaps — **system assigns**, user cannot override
- Once a number is used (even on a cancelled invoice), it is never reused
- Credit note numbers: `CN-NNN`, separate sequence
- Uniqueness enforced by DB `UNIQUE` constraint, sequence guarded by `SELECT FOR UPDATE`

---

## 12. VAT Compliance Rules

- VAT scheme (`cash` or `accrual`) read from `companies.vat_scheme` — never hardcoded
- Default scheme for new users: `cash` (safer for freelancers)
- `ENTERTAINMENT` expenses are **never** CT-deductible — always flag in UI
- `OTHER` category triggers "needs review" badge — block VAT return submission if any remain
- Expenses over £25 without a receipt: warn in UI, block VAT return submission
- HMRC tax payments (VAT, CT, PAYE) are **not expenses** — they are balance sheet movements

---

## 13. Shared Type Discipline

- Every new domain entity: TypeScript interface in `packages/types/src/`
- Every new form: Zod schema in `packages/validation/src/`
- Never duplicate types between web and mobile
- Export everything from `packages/types/src/index.ts`

---

## 14. Git Conventions

- Branch: `feature/phase-{n}-{short-name}`
- Commit: `feat({scope}): {description}` / `fix({scope}): {description}`
- One concern per commit (schema, then service, then API, then UI — separate commits)
- Never commit `.env` files or secrets

---

## 15. Scope Discipline

- Build only what the current session brief specifies
- Do not add features not described in the SPEC
- Do not refactor code outside the session's designated layer
- If you discover a bug in another layer, add a `# FIXME:` comment — do not fix it
- Do not modify migration files that have already been applied

---

## 16. UK Compliance — Always Mandatory

- See `.claude/guardrails/financial-rules.md` for every HMRC rule
- See `.claude/guardrails/forbidden-patterns.md` for banned code patterns
- When in doubt: follow UK GAAP + HMRC rules, not convenience
- Every financial calculation must link to the rule it implements (inline comment with rule source)
