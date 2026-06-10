# Guardrails Quick Reference

> Load this every session. Load the full guardrail file only when writing code that touches
> that domain. Full files: `financial-rules.md`, `forbidden-patterns.md`, `owasp-top10.md`,
> `python-practices.md`, `frontend-practices.md`.

---

## Money (load `financial-rules.md` for full detail)
- `NUMERIC(12,2)` in PostgreSQL — never `FLOAT` or `REAL`
- Python: `Decimal` from `decimal` module — never `float` for any money math
- TypeScript: integer pence arithmetic via `@keel/utils` — never `number` for currency
- VAT always rounded half-up to 2dp — `ROUND_HALF_UP`

## Multi-tenancy — critical security (load `owasp-top10.md` A01)
- `company_id` always from `user.company_id` (JWT) — **never** from request body
- Every DB query filters `company_id = user.company_id` — no exceptions
- Every DB query filters `deleted_at IS NULL` — unless explicitly fetching deleted records

## Financial record immutability (load `forbidden-patterns.md` FP-1)
- No hard deletes on invoices, transactions, expenses, payroll_runs, vat_returns, documents
- Every mutation writes an `audit_log` row — table, record_id, action, old/new values, user_id

## Auth (load `owasp-top10.md` A07)
- JWT validated: signature + `exp` + `iss` + `aud` — never `verify_signature=False`
- Access token in memory only — never `localStorage`, `AsyncStorage`, or any persistent store
- Rate-limit `/auth/register` and `/auth/token` endpoints

## API security (load `owasp-top10.md` A03, A05)
- No SQL string concatenation — parameterised queries or SQLAlchemy ORM always
- No wildcard CORS — `CORS_ALLOWED_ORIGINS` env var, whitelist only
- No stack traces in responses — log internally, return `{ error, code }` shape only
- Security headers middleware on every FastAPI app (X-Content-Type-Options, X-Frame-Options)

## Events (load `owasp-top10.md` A08)
- All RabbitMQ publishes go through the outbox table first — never fire-and-forget
- Every event type must exist in `.claude/contracts/events.schema.json` before writing producer/consumer

## Python (load `python-practices.md` for full detail)
- Async all the way down — never `time.sleep`, `requests.get`, or sync SQLAlchemy in async context
- Pydantic models on all external input — never raw `dict`
- Response models (`response_model=`) on every endpoint — never return raw ORM objects
- Structured logging via `structlog` — never `print`, never log PII

## Frontend (load `frontend-practices.md` for full detail)
- Always use `@keel/api` — never raw `fetch` or `axios`
- TanStack Query for all data fetching — never `useEffect` for data
- All types from `@keel/types` — never define domain types locally
- All forms: React Hook Form + Zod schema from `@keel/validation`
- Invalidate query cache after mutations — never manually update state
- No `dangerouslySetInnerHTML` with user content — sanitise with DOMPurify if HTML required

## Tailwind (load `frontend-practices.md` T-rules)
- No arbitrary values `[13px]` when a scale token exists — use `text-sm`, `mt-4` etc.
- No inline `style={}` competing with Tailwind classes
- shadcn/ui primitives before writing any custom component
- Mobile-first responsive: base = mobile, scale up with `sm:` `lg:`

## Scope discipline
- Build only what the current session brief specifies
- Out-of-scope bug: add `# FIXME(session-id): description` — do not fix it
- Do not modify migrations that have already been applied
