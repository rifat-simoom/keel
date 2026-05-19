# Keel — Full Product Specification

> **Keel** is a business banking and admin platform for freelancers and small businesses in the UK.
> Stable. Precise. Built to keep your finances on an even keel.

---

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Foundation — monorepo, Docker Compose, shared packages | ✅ **DONE** |
| 1 | Auth — Keycloak OIDC/PKCE, protected routes | ✅ **DONE** |
| 2 | UI Shell — sidebar (web), bottom tabs + FAB (mobile), dashboard cards | ✅ **DONE** |
| 3 | Banking — simulated ledger, transactions, virtual card | ✅ **DONE** |
| 4 | Invoicing — CRUD, PDF, send, status machine | ✅ **DONE** |
| 5 | Documents & Receipts — upload, manual entry, transaction matching | ✅ **DONE** |
| 6 | Tax — VAT returns, CT estimate, salary/dividends optimiser | ✅ **DONE** |
| 7 | Notifications — push, email, in-app, deadlines | ✅ **DONE** |
| 8 | Payroll — PAYE, NIC, RTI *(post-MVP)* | ⬜ |
| 9 | AI Layer — categorisation, extraction, tax chat *(post-MVP)* | ⬜ |

### MVP Definition

**Goal: launch a real product that competes with Anna Money.**
The minimum production-ready set is **Phases 0–7** (Banking + Invoicing + Receipts + Tax + Notifications).
Payroll (Phase 8) and the AI Layer (Phase 9) ship post-MVP.

**AI strategy**: UI hook buttons ("✦ Auto-categorise", "✦ Extract with AI", "✦ Ask Keel AI") are built as disabled stubs in Phases 3, 5, and 6. They show "Coming soon" until Phase 9 activates them via a single `FEATURE_AI_ENABLED` env var. No UI rework required when the time comes.

---

## Decisions Locked ✓

| Decision | Choice |
|----------|--------|
| Banking v1 | Simulated ledger (TrueLayer Open Banking in v2) |
| Banking v2 — transactions | TrueLayer Data API (read-only, connects user's existing bank) |
| Banking v2 — virtual card | Stripe Issuing (UK-supported, virtual Visa card) |
| Subscription billing | Stripe Payments (same integration as Stripe Issuing) |
| Hosting | Hetzner (EU, GDPR-friendly) |
| Domain | keelapp.co.uk |
| Mobile stores | iOS and Android simultaneously |
| Mobile framework | React Native (TypeScript — shares logic with web) |

---

## Vision

A single platform that replaces the accountant, the invoicing tool, the expense tracker, and the business bank account for UK freelancers and small business owners. Powered by AI. Available on web and mobile. Built with Python, React, and React Native.

---

## Guiding Principles

- **Feature by feature** — each vertical slice is complete (DB → API → UI) before the next begins
- **Production quality** — not a demo, a real deployable product
- **Event-driven** — services communicate via RabbitMQ events, not direct calls
- **AI-augmented** — intelligence layered on top of every domain
- **UK-first** — HMRC compliance, MTD, RTI, VAT rules baked in from day one
- **Shared logic** — types, validation, API clients shared between web and mobile

---

## Tech Stack

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI (async)
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL 16
- **Message broker**: RabbitMQ
- **Cache**: Redis
- **Task queue**: Celery + Redis
- **Auth**: Keycloak (OIDC/OAuth2)

### Web Frontend
- **Framework**: React 18 (TypeScript)
- **State**: Zustand
- **Data fetching**: TanStack Query (React Query)
- **UI components**: shadcn/ui + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Routing**: React Router v6

### Mobile (React Native)
- **Framework**: React Native 0.74+ (TypeScript)
- **Build tooling**: Expo (managed workflow)
- **State**: Zustand (shared with web)
- **Data fetching**: TanStack Query (shared with web)
- **Auth**: expo-auth-session (OIDC/PKCE)
- **Local storage**: expo-secure-store (tokens), MMKV (cache)
- **Navigation**: Expo Router (file-based, like Next.js)
- **Push notifications**: Expo Notifications + FCM/APNs
- **Camera**: expo-camera + expo-image-manipulator

### Shared (web + mobile)
- **Types**: shared TypeScript types package (`@keel/types`)
- **API client**: shared Axios instance (`@keel/api`)
- **Validation**: Zod schemas (`@keel/validation`)
- **Utils**: date formatting, currency, UK tax helpers (`@keel/utils`)

### Infrastructure
- **Containerisation**: Docker + Docker Compose (dev), Kubernetes (prod)
- **CI/CD**: GitHub Actions
- **Cloud**: Hetzner Cloud (CX series VMs)
- **Object storage**: MinIO (self-hosted, S3-compatible)
- **Email**: Resend
- **SSL**: Let's Encrypt via Caddy
- **Monitoring**: Prometheus + Grafana
- **Tracing**: OpenTelemetry + Jaeger

### AI
- **LLM**: Anthropic Claude (via API)
- **OCR**: Tesseract (self-hosted)
- **Embeddings**: pgvector for semantic search

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      Client Layer                         │
│      React Web (keelapp.co.uk)   React Native (iOS+Android)│
└────────────────────┬──────────────────┬──────────────────┘
                     │ HTTPS            │ HTTPS
┌────────────────────▼──────────────────▼──────────────────┐
│                     API Gateway                           │
│           (FastAPI — routing + auth middleware)           │
└────┬──────────┬──────────┬───────────┬───────────────────┘
     │          │          │           │
┌────▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼──────┐
│ Auth  │  │Invoice│  │  Tax  │  │Documents │  ...
│  Svc  │  │  Svc  │  │  Svc  │  │   Svc    │
└────┬──┘  └───┬───┘  └───┬───┘  └───┬──────┘
     │          │          │           │
┌────▼──────────▼──────────▼───────────▼──────────────┐
│                      RabbitMQ                         │
│               Event bus — all domain events           │
└───────────────────────────────────────────────────────┘
     │          │          │           │
┌────▼──┐  ┌───▼───┐  ┌───▼──────┐  ┌▼──────────┐
│  PG   │  │ Redis │  │  MinIO   │  │ Keycloak  │
└───────┘  └───────┘  └──────────┘  └───────────┘
```

---

## Monorepo Structure

```
keel/
├── backend/
│   ├── services/
│   │   ├── auth/
│   │   ├── invoice/
│   │   ├── tax/
│   │   ├── documents/
│   │   ├── banking/
│   │   ├── payroll/
│   │   └── notifications/
│   ├── shared/
│   │   ├── events/         # RabbitMQ event definitions
│   │   ├── middleware/      # Auth, logging, tracing
│   │   └── models/         # Shared Pydantic models
│   └── gateway/
├── packages/               # Shared TypeScript packages
│   ├── types/              # @keel/types — shared interfaces
│   ├── api/                # @keel/api — Axios API client
│   ├── validation/         # @keel/validation — Zod schemas
│   └── utils/              # @keel/utils — formatting, tax helpers
├── web/                    # React web app
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       └── lib/
├── mobile/                 # React Native app (Expo)
│   └── app/                # Expo Router file-based routes
│       ├── (auth)/
│       │   ├── login.tsx
│       │   └── callback.tsx
│       ├── (app)/
│       │   ├── _layout.tsx  # Bottom tab navigator
│       │   ├── index.tsx    # Dashboard
│       │   ├── invoices/
│       │   ├── scan.tsx
│       │   ├── transactions/
│       │   └── more/
│       └── _layout.tsx      # Root layout + auth guard
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── k8s/
│   └── keycloak/
│       └── realm-export.json
├── docs/
│   ├── SPEC.md              # This file
│   ├── ADR/
│   └── api/
├── package.json             # Monorepo root (pnpm workspaces)
└── .github/
    └── workflows/
```

### Why pnpm workspaces?

Lets `web` and `mobile` both import from `@keel/types`, `@keel/api`, `@keel/validation` without duplication. Change a type once — both apps pick it up. Change a Zod schema — both apps validate the same way.

---

## Accounting Standards & Business Rules

> These rules govern every financial feature in Keel.
> They are non-negotiable. Every API, every DB model, every UI must comply.
> When in doubt: follow UK GAAP + HMRC rules, not convenience.

---

### Foundational Principle — Double-Entry Bookkeeping

Every financial event touches **two** accounts simultaneously. Credits always equal debits. The books must always balance.

```
Invoice paid £1,200:
  DR  Bank account          +£1,200   (asset increases)
  CR  Accounts receivable   −£1,200   (liability decreases)

Expense paid £600:
  DR  Expense account       +£600     (expense increases)
  CR  Bank account          −£600     (asset decreases)
```

Keel v1 uses a **simplified single-entry ledger** (simulated bank) but the data model must be designed to upgrade to full double-entry in v2 without migration pain. Every transaction stores `amount` (signed), `account_id`, `direction` (credit/debit), and `category`.

---

### Chart of Accounts — HMRC Expense Categories

Every transaction and expense must be assigned one of these categories. They map directly to the Corporation Tax return (CT600) and HMRC's self-assessment categories.

| Code | Category | Examples | VAT Reclaimable? |
|------|----------|---------|-----------------|
| `TRAVEL` | Travel & subsistence | Train, taxi, hotel (business only) | Yes (20%) |
| `VEHICLE` | Motor expenses | Mileage, fuel (business %) | Partial |
| `OFFICE` | Office costs | Stationery, printer ink | Yes (20%) |
| `EQUIPMENT` | Equipment (capital) | Laptop, phone, camera | Yes (20%) |
| `SOFTWARE` | Software & subscriptions | SaaS tools, cloud services | Yes (20%) |
| `MARKETING` | Advertising & marketing | Ads, website, design | Yes (20%) |
| `PROFESSIONAL` | Professional fees | Accountant, solicitor, Keel subscription | Yes (20%) |
| `TELEPHONE` | Phone & internet | Mobile bill, broadband | Yes (20%) |
| `PREMISES` | Premises costs | Office rent, rates, utilities | Yes (20%) |
| `WAGES` | Wages & salaries | Employee pay, directors' salary | No |
| `BANK_CHARGES` | Bank charges | Bank fees, FX charges | Exempt |
| `INSURANCE` | Insurance | Business insurance | Exempt |
| `TRAINING` | Training | Courses, books | Yes (20%) |
| `ENTERTAINMENT` | Entertainment | Client meals *(not tax-deductible)* | No |
| `OTHER` | Other | Anything uncategorised — review required | Unknown |

**Rules**:
- `ENTERTAINMENT` is **never** an allowable CT deduction — flag it in the UI
- `EQUIPMENT` over £1,000 is **capital expenditure** — subject to Annual Investment Allowance, not expensed immediately
- Personal expenses are **never** allowable — system must flag mixed-use items
- `OTHER` triggers a "needs review" badge — never leave it in a VAT return or CT estimate

---

### VAT Rules

#### Registration
- Mandatory registration threshold: **£90,000** turnover in any rolling 12-month period (2024/25)
- Voluntary registration allowed below threshold (to reclaim input VAT)
- Keel tracks cumulative turnover and **warns at £75,000** (15% safety buffer)

#### VAT Rates

| Rate | Code | Applied to |
|------|------|-----------|
| 20% | `STANDARD` | Most goods and services |
| 5% | `REDUCED` | Domestic fuel, children's car seats, mobility aids |
| 0% | `ZERO` | Food (most), books, children's clothing, public transport |
| — | `EXEMPT` | Insurance, financial services, education, health |
| — | `OUTSIDE_SCOPE` | Wages, dividends, HMRC penalties — not subject to VAT |

#### VAT Schemes

Keel supports two schemes. The user selects on onboarding:

| Scheme | When VAT is due | Who it suits |
|--------|----------------|-------------|
| **Standard (Accrual)** | When invoice is *issued* | Businesses paid quickly |
| **Cash Accounting** | When invoice is *paid* | Freelancers with slow payers |

> Default to **Cash Accounting** for new users — it's safer for freelancers.

#### VAT Return (quarterly)

```
Box 1  Output VAT    = VAT charged on all SENT (accrual) or PAID (cash) invoices
Box 4  Input VAT     = VAT paid on allowable business expenses
Box 5  Net VAT       = Box 1 − Box 4  (payable to HMRC if positive)
Box 6  Total sales   = Net value of all sales (ex-VAT)
Box 7  Total purchases = Net value of all purchases (ex-VAT)
```

**Filing**: Digital submission via HMRC MTD API. Deadline: **1 month + 7 days** after quarter end.

**Penalty regime (2023+)**:
- Late submission: points-based (4 points = £200 fine)
- Late payment: 2% after 15 days, 4% after 30 days, 4% p.a. thereafter

Keel must: calculate the return automatically, show a breakdown, require user confirmation, submit digitally, store the submission reference.

#### VAT Invoice Requirements (UK law)

A VAT invoice **must** include:
- Unique sequential invoice number
- Supplier name, address, VAT registration number
- Invoice date + tax point date
- Client name and address
- Description of goods/services
- Quantity and unit price
- VAT rate applied to each line item
- Total ex-VAT, VAT amount, total inc-VAT
- For zero/exempt items: reason stated

Missing any of these = the invoice is **not a valid VAT invoice** and the client cannot reclaim VAT.

---

### Invoice Rules

#### Legal Status of Invoices

```
DRAFT      Can be edited freely. Has no legal or tax effect.
           Can be deleted.

SENT       Legal document. Creates an accounts receivable entry.
           VAT liability starts (accrual scheme) or when paid (cash scheme).
           CANNOT be deleted. Must be cancelled via credit note.

VIEWED     No financial effect. Tracking only.

PAID       Income realised. Bank balance credited. CT liability increases.
           VAT due now (cash scheme).
           Triggers reconciliation with bank transaction.

OVERDUE    Past due_date. Still legally owed.
           Bad debt provision may apply after 6 months.

CANCELLED  Legal cancellation. Requires a credit note.
           Original invoice stays on record permanently (audit trail).
           Net financial effect = zero.

WRITTEN_OFF Bad debt. The money is not coming.
           Allowable as a CT deduction.
           VAT bad debt relief claimable after 6 months unpaid.
```

#### Credit Notes

A credit note is a negative invoice. Issued when:
- Invoice was sent in error (wrong amount, wrong client)
- Goods/services returned or disputed
- Agreed discount after the fact

```
Credit note rules:
- Must reference the original invoice number
- Must use a separate sequential CN number (CN-001, CN-002...)
- Amount must not exceed the original invoice
- VAT on the credit note must match the original VAT treatment
- Reduces output VAT on the next VAT return
```

#### Invoice Numbering

- Must be **sequential with no gaps** — HMRC expects this
- Format: `INV-2025-001`, `INV-2025-002`, etc.
- Gaps in sequence trigger HMRC audit flags
- Once a number is used (even on a cancelled invoice), it cannot be reused
- System must validate uniqueness and enforce sequence on creation

---

### Expense Rules

#### What Makes an Expense Allowable

HMRC's test: **"wholly and exclusively for the purposes of the business"**.

```
ALLOWED:    Laptop used only for work
ALLOWED:    Train ticket to client meeting
ALLOWED:    Software subscription (Keel, GitHub, Figma)
NOT ALLOWED: Laptop also used for personal Netflix
NOT ALLOWED: Train ticket for holiday
NOT ALLOWED: Client dinner (entertainment — disallowed for CT)
PARTIAL:    Mobile phone (business % only)
PARTIAL:    Home office (proportion of rent/utilities)
```

#### Receipt Requirements

For an expense to be claimed:
- A receipt **must** exist for any expense over £25
- Receipts must show: supplier name, date, amount, VAT amount, VAT number
- Digital receipts are legally equivalent to paper (HMRC confirmed 2019)
- Receipts must be kept for **6 years** (CT) or **4 years** (VAT)

Keel must:
- Flag expenses over £25 with no attached receipt
- Store receipts in MinIO with a retention policy
- Never allow deletion of receipts linked to a submitted VAT return or CT period

#### Mileage (Vehicle Expenses)

HMRC approved mileage rates (2024/25):

| Vehicle | First 10,000 miles | Over 10,000 miles |
|---------|--------------------|-------------------|
| Car/van | 45p per mile | 25p per mile |
| Motorcycle | 24p per mile | 24p per mile |
| Bicycle | 20p per mile | 20p per mile |

Keel must track cumulative mileage per tax year and switch the rate automatically at 10,000 miles.

---

### Corporation Tax Rules

#### Tax Rates (2023/24 onwards)

| Profit | Rate | Notes |
|--------|------|-------|
| Up to £50,000 | 19% | Small profits rate |
| £50,001 – £250,000 | 19%–25% tapered | Marginal relief formula |
| Over £250,000 | 25% | Main rate |

**Marginal relief formula**:
```
Relief = (£250,000 − profit) × (profit / £250,000) × (25% − 19%)
```

#### CT Calculation

```
Gross profit       = All invoiced income (paid invoices only)
Less: allowable    = All categorised business expenses
Less: capital AIA  = Equipment purchased (Annual Investment Allowance up to £1m)
Less: directors' salary = Treated as wage expense, not profit
                   ─────────────────────────────
Taxable profit     = Result above
CT liability       = Taxable profit × applicable rate
```

#### Key Dates

- **Year end**: Company's accounting year end (set at registration, usually 31 March or 31 December)
- **CT payment deadline**: 9 months and 1 day after year end
- **CT return (CT600) deadline**: 12 months after year end
- **Late payment**: Interest at base rate + 2.5% from day 1

Keel must track the company's year end and show a countdown on the dashboard.

#### Dividends vs Salary

This is the core tax optimisation for limited company directors:

```
SALARY:
  - Deductible from CT (reduces company tax)
  - Subject to Income Tax + Employee NIC + Employer NIC
  - Optimal up to Personal Allowance (£12,570) — tax-free
  - Above that: 20% IT + 8% NIC = 28% effective rate

DIVIDENDS:
  - NOT deductible from CT (paid from post-tax profit)
  - Dividend allowance: £500 tax-free (2024/25)
  - Basic rate band: 8.75%
  - Higher rate band: 33.75%
  - No NIC on dividends (biggest saving)

OPTIMAL SPLIT (2024/25, basic rate taxpayer):
  Salary:    £12,570  (uses personal allowance, no tax)
  Dividends: Up to £37,700 at 8.75%
  Remaining: Dividends at 33.75% or pension contributions
```

Keel's salary/dividends optimiser must model this precisely and update in real-time as income changes.

---

### Bank Reconciliation Rules

Reconciliation = confirming that every bank transaction matches a document (invoice or receipt).

```
Unreconciled credit  → should match a paid invoice
Unreconciled debit   → should match an expense receipt
                    → OR a salary/dividend payment
                    → OR a tax payment (not an expense — balance sheet item)

HMRC payments are NOT expenses. They are balance sheet movements.
  - VAT payment:  DR VAT liability account / CR Bank
  - CT payment:   DR CT liability account  / CR Bank
  - PAYE payment: DR PAYE liability account / CR Bank
```

A business is audit-ready when **every bank transaction is reconciled**. Keel must show an "unreconciled transactions" count and flag it prominently until zero.

---

### Audit Trail Rules — Immutability

**Financial records can never be deleted.** This is UK law (Companies Act 2006, HMRC record-keeping rules).

```
Rule 1: No hard deletes on any financial record (invoices, transactions,
        expenses, payroll runs, VAT returns, tax filings).

Rule 2: Every change is recorded with: who changed it, when, old value, new value.

Rule 3: Submitted VAT returns and filed CT returns are permanently locked.
        No edits, ever. Amendments require a formal amendment submission.

Rule 4: Deleted receipts must use soft delete (deleted_at timestamp).
        The file in MinIO must be retained for the statutory period.

Rule 5: Audit log retention: 6 years minimum (CT), 10 years for some VAT cases.
```

Database implementation:

```sql
-- Every financial table gets:
deleted_at   TIMESTAMPTZ    -- soft delete only, never hard delete
created_by   UUID           -- user who created
updated_by   UUID           -- user who last modified

-- Separate audit log:
CREATE TABLE audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   UUID NOT NULL,
    user_id      UUID NOT NULL,
    table_name   TEXT NOT NULL,
    record_id    UUID NOT NULL,
    action       TEXT NOT NULL,  -- 'CREATE' | 'UPDATE' | 'DELETE'
    old_values   JSONB,
    new_values   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Financial Periods

#### UK Tax Calendar

| Date | Event |
|------|-------|
| 5 April | End of personal tax year |
| 6 April | Start of new personal tax year |
| 31 January | Self-assessment filing + payment deadline |
| 31 July | Second payment on account (self-assessment) |
| 31 March | Common company year end |
| Monthly | PAYE/NIC payment to HMRC (19th by post, 22nd electronically) |
| Quarterly | VAT return + payment |
| 9 months + 1 day | CT payment deadline after company year end |
| 12 months | CT600 filing deadline after company year end |

#### VAT Quarter Stagger Groups

HMRC assigns companies to one of three stagger groups:

| Group | Quarter ends | Return + payment due |
|-------|-------------|---------------------|
| A | 31 Mar, 30 Jun, 30 Sep, 31 Dec | 7 May, 7 Aug, 7 Nov, 7 Feb |
| B | 30 Apr, 31 Jul, 31 Oct, 31 Jan | 7 Jun, 7 Sep, 7 Dec, 7 Mar |
| C | 31 May, 31 Aug, 30 Nov, 28 Feb | 7 Jul, 7 Oct, 7 Jan, 7 Apr |

Keel must store the company's stagger group and calculate all future deadlines automatically.

---

### Payroll Rules (Phase 8)

#### PAYE Calculation

```
Gross salary
Less: Personal allowance (£12,570 for tax code 1257L)
      ─────────────────────────────────────────────
Taxable pay

Income Tax:
  Basic rate  (up to £37,700):  20%
  Higher rate (£37,701–£125,140): 40%
  Additional  (over £125,140):  45%

Employee NIC (Class 1):
  £12,570 – £50,270:  8%
  Over £50,270:       2%

Employer NIC (Class 1):
  Over £9,100 Secondary Threshold:  13.8%
  (Employer pays this — it's a cost to the company)
```

#### RTI (Real Time Information)

Every time payroll is run, Keel must submit a **Full Payment Submission (FPS)** to HMRC:
- Must be submitted on or before the pay date
- Contains: employee details, gross pay, tax deducted, NIC deducted
- Failure = automatic penalty (£100–£400 per month)

#### P60 and P11D

- **P60**: Annual summary of pay and tax for each employee. Must be issued by 31 May
- **P11D**: Benefits in kind report (company car, private medical, etc.). Due 6 July

---

### Statutory Retention Periods

| Record type | Minimum retention |
|-------------|------------------|
| VAT records | 4 years |
| CT records | 6 years |
| Payroll records | 3 years after tax year |
| Company accounts | 6 years (private), 3 years (public) |
| Receipts & invoices | 6 years |
| Bank statements | 6 years |

Keel must **never allow permanent deletion** within these periods. After expiry, offer archival export before deletion.

---

### What "World Class" Looks Like in the UI

Every rule above has a UI implication:

| Rule | UI requirement |
|------|---------------|
| Invoice numbering must be sequential | System assigns number — user cannot edit it |
| Sent invoices cannot be deleted | Delete button replaced by "Cancel (issue credit note)" |
| Expense needs receipt over £25 | Red warning badge until receipt attached |
| Entertainment is not deductible | Automatic warning on `ENTERTAINMENT` category |
| VAT return locked after submission | Read-only view with submission reference shown |
| Unreconciled transactions | Dashboard counter, cleared only when reconciled |
| CT estimate always current | Recalculated on every invoice paid / expense added |
| Missing VAT number on invoice | Validation error — cannot send without it |
| Mileage rate switches at 10,000 miles | Automatic, shown in mileage log |
| HMRC deadline approaching | Warning at 30 days, urgent at 7 days, critical at 1 day |

---

### 0.1 Monorepo Setup

```bash
# Root package.json
{
  "private": true,
  "workspaces": ["packages/*", "web", "mobile"]
}
```

### 0.2 Docker Compose (Dev)

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]

  rabbitmq:
    image: rabbitmq:3-management
    ports: ["5672:5672", "15672:15672"]  # 15672 = management UI

  redis:
    image: redis:7
    ports: ["6379:6379"]

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    ports: ["8080:8080"]
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]  # 9001 = MinIO console
    command: server /data --console-address ":9001"
```

### 0.3 Shared Backend Patterns

**Result pattern**
```python
@dataclass
class Result(Generic[T]):
    value: Optional[T] = None
    error: Optional[str] = None

    @property
    def is_success(self) -> bool:
        return self.error is None
```

**Outbox pattern** — every event written to DB before publishing.
Guarantees at-least-once delivery. Background worker polls and publishes.

**Idempotency** — every mutation endpoint accepts `Idempotency-Key` header.

**Audit log** — every write logged with user, timestamp, before/after state.

---

## Phase 1 — Auth & Identity

**Goal**: Users can register, log in, and access protected routes on web and mobile.

### Auth Strategy

**Keycloak** as the identity provider:
- OIDC-compliant, OAuth2 flows
- PKCE for web and mobile (no client secret exposed to clients)
- Social login — Google, Apple (via Keycloak identity providers)
- Role-based access control (RBAC)
- Self-hosted on Hetzner — zero per-user cost

### Keycloak Realm: `keel`

```
Realm: keel
Clients:
  - keel-web    (public, PKCE)
                redirect: https://keelapp.co.uk/callback
  - keel-mobile (public, PKCE)
                redirect: com.keelapp://callback
  - keel-api    (confidential, token introspection)

Roles:
  - owner        (full access — company owner/director)
  - accountant   (read + tax access)
  - employee     (payroll view only)
```

### Web Auth Flow (OIDC Authorization Code + PKCE)

```
1. User clicks "Sign in"
2. React generates code_verifier + code_challenge (PKCE)
3. Redirect to Keycloak: https://auth.keelapp.co.uk/realms/keel/...
4. User authenticates (email/password or Google)
5. Keycloak redirects to /callback?code=...
6. React exchanges code + code_verifier for tokens
7. Access token → memory (Zustand), refresh token → httpOnly cookie
8. Every API call: Authorization: Bearer {access_token}
9. API Gateway validates against Keycloak JWKS
10. Automatic silent refresh when access token expires
```

### Mobile Auth Flow (OIDC + PKCE via expo-auth-session)

```
1. User taps "Sign in"
2. expo-auth-session opens Keycloak in system browser
   (SFSafariViewController on iOS, Chrome Custom Tab on Android)
3. User authenticates in the secure system browser
4. Keycloak redirects to: com.keelapp://callback?code=...
5. Expo deep link handler catches the redirect
6. expo-auth-session exchanges code + PKCE verifier for tokens
7. Access token → memory (Zustand)
8. Refresh token → expo-secure-store (keychain/keystore encrypted)
9. Axios interceptor silently refreshes expired access tokens
10. On app restart → read refresh token → silently re-authenticate
```

**Why system browser and not WebView?**
Keycloak explicitly rejects WebView-based auth for security — the app could intercept credentials. The system browser is sandboxed and trusted by Keycloak. `expo-auth-session` handles this correctly on both platforms.

### Mobile Deep Link Setup

```
app.json (Expo):
  scheme: "com.keelapp"

iOS: automatically handled by Expo
Android: intent-filter added to AndroidManifest by Expo
```

### Shared API Client (`@keel/api`)

```typescript
// packages/api/src/client.ts
// Used by BOTH web and mobile — same file

import axios from 'axios'
import { getAccessToken, refreshAccessToken } from './auth'

export const apiClient = axios.create({
  baseURL: process.env.KEEL_API_URL,
})

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken()
  config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshAccessToken()
      return apiClient.request(error.config)
    }
    return Promise.reject(error)
  }
)
```

### Backend Auth Service

```
POST /api/v1/auth/register    # Create user + company on first Keycloak login
GET  /api/v1/auth/me          # Current user profile
PUT  /api/v1/auth/me          # Update profile
POST /api/v1/auth/logout      # Revoke refresh token in Keycloak
```

### Database

```sql
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    company_number  TEXT,
    vat_number      TEXT,
    utr             TEXT,
    address         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id  UUID NOT NULL UNIQUE,
    email        TEXT NOT NULL,
    full_name    TEXT,
    company_id   UUID REFERENCES companies(id),
    role         TEXT NOT NULL DEFAULT 'owner',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Auth Middleware (all backend services)

```python
from shared.middleware.auth import require_auth, require_role

@router.get("/invoices")
async def list_invoices(user = Depends(require_auth)):
    ...

@router.delete("/invoices/{id}")
async def delete_invoice(user = Depends(require_role("owner"))):
    ...
```

JWKS keys fetched from Keycloak and cached in Redis (refreshed every 24h).

---

## Phase 2 — UI Shell & Navigation

**Goal**: Authenticated users see a proper app shell on both platforms.

### Web Layout

```
┌──────────────────────────────────────────────┐
│ Sidebar (240px fixed) │  Main content area    │
│                       │                       │
│  Keel logo            │  Page header          │
│                       │                       │
│  Dashboard            │  Page content         │
│  Invoices             │                       │
│  Transactions         │                       │
│  Tax                  │                       │
│  Documents            │                       │
│  Payroll              │                       │
│  Calendar             │                       │
│                       │                       │
│  Settings             │                       │
│  User avatar + name   │                       │
└──────────────────────────────────────────────┘
```

### Mobile Navigation (React Native / Expo Router)

```
Bottom tab bar — 5 tabs:

  [Dashboard]  [Invoices]  [  Scan  ]  [Transactions]  [More]
                           (centre — FAB style, camera icon)

- Dashboard     → summary cards, balance, upcoming deadlines
- Invoices      → list + create
- Scan          → camera opens directly (most common mobile action)
- Transactions  → account activity, search, filter
- More          → Tax, Payroll, Documents, Settings, Help
```

Mobile design decisions:
- Bottom tabs (thumb zone — not hamburger)
- Scan in centre position — most frequent action
- Cards not tables (tables don't work on small screens)
- Pull-to-refresh on every list screen
- Optimistic UI updates throughout

### Dashboard Cards (both platforms)

- Account balance (simulated ledger)
- Outstanding invoices — total £ amount
- Overdue invoices — count + red badge
- Estimated tax liability (CT running estimate)
- Next deadline — countdown chip

---

## Phase 3 — Banking & Transactions ✅ NEXT

**Goal**: Users have a real business account with a balance, transaction history, and a virtual debit card.

> Rationale: you need a bank account before you invoice *from* it. Banking is the core product — everything else (invoicing, tax, receipts) hangs off it.

### Simulated Ledger (v1)

Internal ledger only — no real bank integration yet.
Architecture is clean: TrueLayer slots in as a data source in v2 without changing the service interface.

### Banking v2 — Provider Decisions

**Transactions & balance — TrueLayer Data API**
- User connects their existing UK business bank (Barclays, HSBC, Monzo Business, Starling, etc.) via Open Banking consent flow
- TrueLayer returns: account number, sort code, IBAN, GBP balance (current + available), full transaction history
- Transaction fields: `amount`, `description`, `category`, `merchant_name`, `transaction_date`
- Transaction categories map directly to Keel's HMRC chart of accounts (PURCHASE, DIRECT_DEBIT, STANDING_ORDER, TRANSFER, BILL_PAYMENT)
- Consent expires after 90 days — user re-authenticates via TrueLayer Connect
- Sandbox: free mock bank (`john`/`doe` credentials), no real bank needed during development
- Production: TrueLayer application required (reviewed, paid per-call)
- **Not** a bank account — read-only view of the user's existing account

**Virtual card — Stripe Issuing**
- Issues real virtual Visa cards: card number, CVV, expiry returned via API
- UK explicitly supported (GB cardholder, GBP currency, BACS/FPS funding)
- Freeze/unfreeze, spending limits, single-use card numbers all available via API
- Sandbox: free, simulate card creation and transactions with no real funds
- Production: Stripe Issuing application required (KYC/compliance review)
- Same Stripe account handles subscription billing — one dashboard, one integration

**Why not Lithic?** Lithic is US-only (expanding to Canada only as of 2024). Not available for UK card issuing.

### Database

```sql
CREATE TABLE accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    sort_code   TEXT NOT NULL DEFAULT '04-00-04',
    account_number TEXT NOT NULL,
    balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'GBP',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id       UUID NOT NULL REFERENCES accounts(id),
    amount           NUMERIC(12,2) NOT NULL,  -- positive = credit, negative = debit
    description      TEXT NOT NULL,
    category         TEXT,
    merchant_name    TEXT,
    transaction_date DATE NOT NULL,
    is_expense       BOOLEAN NOT NULL DEFAULT FALSE,
    invoice_id       UUID REFERENCES invoices(id),  -- if reconciled
    receipt_id       UUID,                           -- after Phase 5
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE virtual_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id),
    last_four       TEXT NOT NULL,
    expiry_month    INT NOT NULL,
    expiry_year     INT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',  -- active | frozen | cancelled
    spending_limit  NUMERIC(12,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints

```
GET    /api/v1/accounts/me                  # Current account (balance, sort code, account no.)
GET    /api/v1/transactions                 # Paginated list, filterable by date/category/amount
GET    /api/v1/transactions/{id}            # Single transaction detail
POST   /api/v1/transactions                 # Add manual transaction (top-up / test data)
GET    /api/v1/accounts/me/card             # Virtual card details
POST   /api/v1/accounts/me/card/freeze      # Freeze card
POST   /api/v1/accounts/me/card/unfreeze    # Unfreeze card
GET    /api/v1/accounts/me/stats            # Summary: income, expenses, balance over period
```

### Web Features
- Account header: balance, sort code, account number (masked), copy button
- Transaction list: infinite scroll, search, filter by category/date/amount
- Transaction detail: category selector (manual), receipt attachment slot (enabled in Phase 5)
  - **AI hook**: "✦ Auto-categorise" button — disabled, labelled "Coming soon" — wired up in Phase 9
- Virtual card panel: card image, freeze toggle, spending limit

### Mobile Features
- Balance hero card on dashboard (already scaffolded)
- Transaction list: infinite scroll, category chips, pull-to-refresh
- Tap transaction → detail sheet with category picker
  - **AI hook**: "✦ Suggest category" chip — disabled in Phase 3, active in Phase 9
- Card screen: freeze/unfreeze with haptic feedback

### Events Published

```
transaction.created      → Notification svc
```

---

## Phase 4 — Invoicing

**Goal**: Freelancers can create, send, and track invoices. Paid invoices credit the simulated account automatically.

### Shared Types (`@keel/types`)

```typescript
// packages/types/src/invoice.ts

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'overdue'
  | 'cancelled'

export interface LineItem {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number  // 0 | 0.05 | 0.20
}

export interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  client_address?: Address
  line_items: LineItem[]
  subtotal: number
  vat_amount: number
  total: number
  currency: 'GBP'
  issue_date: string  // ISO 8601
  due_date: string
  status: InvoiceStatus
  paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
}
```

### Database

```sql
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    invoice_number  TEXT NOT NULL,
    client_name     TEXT NOT NULL,
    client_email    TEXT NOT NULL,
    client_address  JSONB,
    line_items      JSONB NOT NULL,
    subtotal        NUMERIC(12,2) NOT NULL,
    vat_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'GBP',
    issue_date      DATE NOT NULL,
    due_date        DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft',
    paid_at         TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id  UUID NOT NULL REFERENCES invoices(id),
    event_type  TEXT NOT NULL,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints

```
GET    /api/v1/invoices
POST   /api/v1/invoices
GET    /api/v1/invoices/{id}
PUT    /api/v1/invoices/{id}
POST   /api/v1/invoices/{id}/send
POST   /api/v1/invoices/{id}/mark-paid
POST   /api/v1/invoices/{id}/cancel
GET    /api/v1/invoices/{id}/pdf
GET    /api/v1/invoices/stats
```

### State Machine

```
draft ──send──► sent ──client opens──► viewed
                │                        │
                └────────────────────────┼──mark-paid──► paid
                                         │
                                  due_date passes
                                         ▼
                                      overdue ──mark-paid──► paid
```

### Events Published

```
invoice.created  → notification svc
invoice.sent     → notification svc
invoice.viewed   → notification svc
invoice.paid     → banking svc, tax svc
invoice.overdue  → notification svc
```

### Scheduler (Celery beat)

```python
# Runs every hour
# Finds invoices: due_date < NOW() and status IN ('sent', 'viewed')
# Transitions to 'overdue'
# Publishes invoice.overdue event
```

### Mobile Invoice Features

- Invoice list — status badges, swipe to send/mark paid
- Create invoice — mobile-optimised form, client autocomplete
- Quick actions — one-tap send, mark paid
- PDF share — native iOS/Android share sheet
- Push notification when client views invoice

---

---

## Phase 5 — Documents & Receipts

**Goal**: Users can photograph receipts on mobile and attach them to transactions manually. AI extraction is wired up as a stub — activated in Phase 9.

### Document Pipeline

```
Upload (web drag-drop or mobile camera)
  → MinIO storage
  → document.uploaded event
  → status: 'uploaded'
  → user fills in fields manually (amount, vendor, date, VAT)   ← Phase 5
  → [AI hook] "✦ Extract with AI" button calls POST /api/v1/documents/{id}/extract
             → returns 501 Not Implemented until Phase 9
  → user confirms or edits fields
  → document.matched manually or left unmatched
```

### Mobile Receipt Scanning

Receipt scanning is the killer mobile feature:

```
Tap Scan tab
  → expo-camera opens
  → user photographs receipt
  → expo-image-manipulator crops + corrects perspective
  → upload to MinIO
  → receipt detail screen opens with empty form
  → [AI hook] "✦ Extract with AI" button (visible but shows "Coming soon" toast)
  → user fills in amount, vendor, date, VAT manually
  → one-tap save + match to transaction
```

### Database

```sql
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES companies(id),
    file_key        TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'processing',
    extracted_data  JSONB,
    transaction_id  UUID REFERENCES transactions(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Phase 6 — Tax & Accounting

**Goal**: Running CT estimate on dashboard. VAT return prep from invoices + expenses. Salary/dividends optimiser. No manual spreadsheets needed.

### VAT Service

```python
class VATCalculator:
    async def calculate_return(
        self, company_id: UUID, period_start: date, period_end: date
    ) -> VATReturn:
        # Sum output VAT from invoices in period
        # Sum input VAT from flagged expenses
        # Return net VAT liability
        # Submit via HMRC MTD API
```

### Corporation Tax Estimator

```python
class CorpTaxEstimator:
    async def estimate(
        self, company_id: UUID, tax_year: int
    ) -> CorpTaxEstimate:
        # Total income from paid invoices
        # Less allowable expenses
        # Apply CT rate (25% main, 19% small profits relief)
        # Return running estimate updated in real-time
```

### Salary vs Dividends Calculator

```python
class PayOptimiser:
    def optimise(
        self, company_id: UUID, desired_income: Decimal
    ) -> PayRecommendation:
        # Optimal salary up to NIC primary threshold
        # Remainder as dividends within dividend allowance
        # Return tax-efficient split with comparison table
```

### Mobile Tax Features

- Running CT estimate on dashboard card (already scaffolded in Phase 2)
- VAT return: period selector, output/input VAT summary, one-tap submit
- Salary/dividends optimiser — slider UI, instant recalculation
- Deadline countdown badges
- **AI hook**: "✦ Ask Keel AI" button on the tax screen — disabled, labelled "Coming soon" — activated in Phase 9

---

## Phase 7 — Notifications & Deadlines

**Goal**: Users never miss a payment, invoice, or HMRC deadline. Push on mobile, email on web.

### Notification Service

Consumes RabbitMQ events and dispatches:
- **Push** — Expo Notifications + FCM/APNs (mobile)
- **Email** — Resend (web + mobile)
- **In-app** — stored in DB, polled via `GET /api/v1/notifications`

### Mobile Push Setup

```typescript
const token = await Notifications.getExpoPushTokenAsync()
await apiClient.post('/api/v1/notifications/register-device', { token })

Notifications.addNotificationResponseReceivedListener(response => {
  router.push(response.notification.request.content.data.route)
})
```

### Notification Types

| Trigger | Channel | Deep link |
|---------|---------|-----------|
| Invoice viewed by client | Push + email | `/invoices/{id}` |
| Invoice overdue | Push + email | `/invoices/{id}` |
| Payment received | Push | `/transactions/{id}` |
| Receipt matched | Push | `/documents/{id}` |
| Tax deadline 30d away | Push + email | `/tax` |
| Tax deadline 7d away | Push + email + in-app banner | `/tax` |
| Tax deadline 1d away | Push + email + in-app banner | `/tax` |
| Payroll due | Push + email | `/payroll` |

### Calendar / Deadlines Service

Aggregates all deadlines into a single feed:
- HMRC VAT return dates (calculated from VAT registration date)
- Corporation Tax deadline (9 months + 1 day after year end)
- Self-assessment 31 Jan
- Payroll RTI dates
- Invoice due dates

```
GET /api/v1/deadlines          # All upcoming deadlines, sorted
GET /api/v1/deadlines/next     # Next single deadline (for dashboard card)
```

Mobile syncs to device calendar via `expo-calendar` (optional, user opt-in).

---

## Phase 8 — Payroll *(Post-MVP)*

> Payroll is complex (PAYE, NIC, RTI) and affects only users with employees. Build it after launch when user demand is confirmed.

### Database

```sql
CREATE TABLE employees (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    full_name   TEXT NOT NULL,
    ni_number   TEXT,
    tax_code    TEXT NOT NULL DEFAULT '1257L',
    salary      NUMERIC(12,2) NOT NULL,
    start_date  DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES companies(id),
    pay_period          DATE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'draft',
    total_gross         NUMERIC(12,2),
    total_paye          NUMERIC(12,2),
    total_nic           NUMERIC(12,2),
    total_net           NUMERIC(12,2),
    submitted_to_hmrc   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Payroll Flow

```
1. Create payroll run (draft)
2. System calculates PAYE + NIC per employee
3. Director reviews + approves
4. Payments triggered (simulated ledger in v1)
5. RTI submission to HMRC
6. payroll.run event published
```

---

## RabbitMQ Event Catalogue

| Event | Published by | Consumed by |
|-------|-------------|-------------|
| `invoice.created` | Invoice svc | Notification svc |
| `invoice.sent` | Invoice svc | Notification svc |
| `invoice.viewed` | Invoice svc | Notification svc |
| `invoice.paid` | Invoice svc | Banking svc, Tax svc |
| `invoice.overdue` | Invoice svc | Notification svc |
| `transaction.created` | Banking svc | Notification svc |
| `transaction.categorised` | Banking svc *(Phase 9)* | Tax svc *(Phase 9)* |
| `document.uploaded` | Document svc | Notification svc |
| `document.parsed` | Document svc *(Phase 9)* | Document svc *(Phase 9)* |
| `document.matched` | Document svc | Notification svc |
| `document.attention_required` | Document svc | Notification svc |
| `payroll.run` | Payroll svc | Banking svc, Notification svc |
| `tax.deadline_approaching` | Tax svc | Notification svc, Calendar svc |

---

## Build Order

| Phase | What | Status | MVP? | Depends on |
|-------|------|--------|------|-----------|
| 0 | Foundation — monorepo, Docker, shared packages | ✅ Done | ✅ | — |
| 1 | Auth — Keycloak OIDC/PKCE, protected routes | ✅ Done | ✅ | 0 |
| 2 | UI Shell — sidebar, bottom tabs, dashboard cards | ✅ Done | ✅ | 1 |
| 3 | Banking — account, transactions, virtual card, AI categorisation | 🔜 Next | ✅ | 2 |
| 4 | Invoicing — CRUD, PDF, send, state machine | ⬜ | ✅ | 2 |
| 5 | Documents — upload, manual entry, transaction matching | ✅ | ✅ | 3, 4 |
| 6 | Tax — VAT, CT estimate, salary/dividends calc, AI chat | ✅ | ✅ | 4, 5 |
| 7 | Notifications — push, email, in-app, deadline calendar | ⬜ | ✅ | 3–6 |
| 8 | Payroll — PAYE, NIC, RTI *(post-MVP)* | ⬜ | ❌ | 6 |
| 9 | AI Layer — categorisation, extraction, tax chat *(post-MVP)* | ⬜ | ❌ | 3–7 |

**MVP = Phases 0–7.** Phases 8 and 9 ship after first paying users confirm demand.
AI hook buttons are built into the UI in Phases 3, 5, and 6 — they show "Coming soon" until Phase 9 activates them.

---

## Known Gaps — Must Address Before Launch

These areas are missing from the phase specifications above. They must be designed and built before Keel can go live.

---

### Gap 1 — Settings Page *(needed before Phase 6)*

The settings page is currently a placeholder. Phase 6 (Tax) and Phase 7 (Notifications) cannot work correctly without the company's VAT scheme, stagger group, and year-end date.

**Required settings fields**:

| Field | Used by | Where stored |
|-------|---------|-------------|
| Company name, registered address | Invoices, VAT returns | `companies` table |
| Trading name (if different) | Invoice letterhead | `companies` table |
| Company number | CT600 | `companies` table |
| UTR (Unique Taxpayer Reference) | CT600 submission | `companies` table |
| VAT number | VAT invoices, VAT returns | `companies` table |
| VAT scheme | VAT return calculation | `companies.vat_scheme` |
| VAT stagger group (A/B/C) | Deadline calculation | `companies.vat_stagger` |
| Company year-end date | CT deadlines | `companies.year_end_month` (1–12) |
| Invoice payment terms (default days) | New invoice due_date default | `companies.payment_terms_days` |
| Invoice footer / bank details shown on PDF | PDF generation | `companies.invoice_footer` |
| Logo upload (for invoice PDF) | PDF generation | MinIO `company-logos/` bucket |
| Notification preferences | Phase 7 | `notification_prefs` table |

**Schema additions needed**:

```sql
ALTER TABLE companies ADD COLUMN vat_scheme         TEXT DEFAULT 'cash';   -- 'cash' | 'accrual'
ALTER TABLE companies ADD COLUMN vat_stagger        TEXT DEFAULT 'A';      -- 'A' | 'B' | 'C'
ALTER TABLE companies ADD COLUMN year_end_month     INT  DEFAULT 3;        -- 1–12 (3 = March)
ALTER TABLE companies ADD COLUMN payment_terms_days INT  DEFAULT 30;
ALTER TABLE companies ADD COLUMN invoice_footer     TEXT;
ALTER TABLE companies ADD COLUMN logo_key           TEXT;                  -- MinIO key
```

**Settings API additions** (auth-service):

```
PUT  /api/v1/auth/me/company          # Update company settings
POST /api/v1/auth/me/company/logo     # Upload logo → MinIO
```

---

### Gap 2 — Pricing & Subscription Model *(needed before launch)*

Keel has no monetisation model defined. Anna Money charges ~£9–14/month for their basic plan.
This must be decided and built before launch — the entire revenue model depends on it.

**Recommended model** (based on Anna Money benchmark):

| Plan | Price | Limits |
|------|-------|--------|
| **Starter** (free) | £0/month | 5 invoices/month, no VAT returns, no CT estimate |
| **Pro** | £9/month | Unlimited invoices, VAT returns, CT estimate, PDF downloads |
| **Business** | £19/month | Everything + payroll (Phase 8), priority support |

**Technical approach**:
- Stripe for payment processing + subscription management
- `subscriptions` table: `company_id`, `plan`, `stripe_subscription_id`, `current_period_end`
- Middleware that checks plan limits before allowing invoice creation / VAT return submission
- Webhook handler for Stripe events (`invoice.paid`, `subscription.cancelled`)
- Downgrade path: data preserved, operations blocked

**Phase placement**: Build as Phase 2.5 (between Shell and Banking) or as a parallel track during Phase 4–5. Cannot go live without it.

---

### Gap 3 — Onboarding Improvements *(needed before Phase 6)*

The current onboarding captures: full name, company name, Companies House number, VAT number.

**Missing fields** that Phase 6 (Tax) requires:

| Field | Why needed |
|-------|-----------|
| VAT scheme (Cash / Standard Accrual) | VAT return calculation differs entirely |
| VAT stagger group (A / B / C) | Deadline dates differ per group |
| Company year-end date (month) | CT payment deadline = year_end + 9m1d |
| Registered address | Required on VAT invoices by law |
| Are you VAT registered? (Yes/No) | If No, skip all VAT functionality |

**UX recommendation**: Multi-step onboarding wizard (3 steps):
1. Your details (name, email) — current
2. Your company (name, number, address) — current + registered address
3. Tax setup (VAT registered? → if yes: VAT number, scheme, stagger group; company year-end) — new

---

### Gap 4 — Client Invoice Portal *(needed for Phase 4)*

When a client receives an invoice email, where do they view it?

**Option A (MVP)**: PDF attached to email — no portal, just a PDF. Simple. Done.

**Option B (post-MVP)**: Hosted invoice page at `keelapp.co.uk/i/{token}` — client can view, download, and (future) pay online.

**Decision for MVP**: Option A. Attach PDF to email. No public portal.
If Stripe payment links are added later, the email can include a "Pay now" button.

---

### Gap 5 — Bank Reconciliation UI *(needed for Phase 5)*

The spec defines the reconciliation rules but not the UI. Phase 5 links receipts to transactions. Phase 4 links invoices to transactions (when marked paid). The reconciliation **view** showing unmatched items is never designed.

**Required**:
- Dashboard badge: "X unreconciled transactions" — red if >0
- Reconciliation page (`/reconcile` or tab in Transactions): two-column view matching bank transactions ↔ invoices/receipts
- Auto-suggest: when invoice is paid → auto-match to corresponding bank credit
- Manual override: drag/select to link any transaction to any invoice/receipt

---

### Gap 6 — Multi-Currency *(post-MVP, but design now)*

The spec says GBP only. UK freelancers frequently invoice EU and US clients in EUR/USD.

**Risk**: Adding multi-currency later is a data migration nightmare if amounts are stored as plain `NUMERIC` with no currency column.

**Mitigation already in place**: `transactions.currency` and `accounts.currency` columns exist. `Invoice.currency` type is `'GBP'` (union type) — change to `string` in Phase 4.

**Phase 4 action**: Store currency on every invoice. Display in UI. Do not do FX conversion yet — show a warning if client currency ≠ GBP.

---

## Phase 9 — AI Layer *(Post-MVP)*

> All AI hook buttons are already built into the UI in Phases 3, 5, and 6. They show "Coming soon" until this phase ships. Enabling them is a backend + feature-flag change — no UI rework needed.

### 9.1 Transaction Categorisation (Phase 3 hook)

```
Endpoint: POST /api/v1/transactions/{id}/categorise
  → Claude API: merchant_name + description → HMRC expense category
  → confidence > 0.85 → auto-applied
  → confidence < 0.85 → suggestion shown, user confirms
  → updates transaction.category
  → publishes transaction.categorised event → Tax svc
```

UI: "✦ Auto-categorise" button on transaction detail becomes active.

### 9.2 Receipt Data Extraction (Phase 5 hook)

```
Endpoint: POST /api/v1/documents/{id}/extract
  → Tesseract OCR → raw text
  → Claude API structured output:
     { amount, date, vendor, vat_amount, category, confidence }
  → prefills the document form
  → low confidence fields highlighted for user review
  → publishes document.parsed event
```

UI: "✦ Extract with AI" button on receipt form becomes active.

### 9.3 Tax Chat Assistant (Phase 6 hook)

```
Endpoint: POST /api/v1/ai/chat
  Body: { message: string }
  → Claude with function calling
  → read-only DB views scoped to company_id (never cross-tenant)
  → functions: get_balance(), get_ct_estimate(), get_vat_liability(),
               get_expenses_by_category(), get_invoices_outstanding()
  → streamed response (SSE)
```

UI: "✦ Ask Keel AI" button on tax screen opens a chat sheet.

### 9.4 Feature Flag

All three AI features gated by `FEATURE_AI_ENABLED=true` env var.
Set to `false` by default — UI shows "Coming soon" badges automatically.
No code changes needed to enable — just set the env var and redeploy.

---

## Mobile Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | React Native + Expo | TypeScript shared with web; Expo simplifies builds |
| Auth | expo-auth-session (PKCE) | Keycloak rejects WebView; system browser required |
| Token storage | expo-secure-store | Encrypted keychain (iOS) / keystore (Android) |
| Offline cache | MMKV | Fastest RN key-value store; transactions readable offline |
| Navigation | Expo Router | File-based routing, deep links, parity with web URLs |
| State | Zustand (shared) | Same store structure as web; less to learn |
| Data fetching | TanStack Query (shared) | Same hooks as web; caching, background refresh |
| Push | Expo Notifications + FCM | Cross-platform; Expo handles APNs complexity |
| Camera | expo-camera | Managed Expo workflow; no native module config |
| HTTP | Axios (shared client) | Same interceptors as web; token refresh handled once |

---

## Development Conventions

### API
- All endpoints: `/api/v1/`
- JSON, snake_case, ISO 8601 dates, UUID PKs
- Pagination: `?page=1&page_size=20`
- Errors: `{ error: string, code: string, details?: object }`

### Git
- Branch: `feature/phase-1-auth`, `feature/phase-3-invoices`
- Commit: `feat(invoice): add overdue state transition`
- PR per feature, squash merge to main

### Testing
- Backend: pytest + testcontainers (real Postgres, real RabbitMQ)
- Web: Vitest + React Testing Library
- Mobile: Jest + React Native Testing Library
- E2E: Playwright (web), Detox (mobile)
- Coverage target: 80% on business logic

---

## Environment Variables

```env
# ── Backend ──────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/keel
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=keel-documents
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
RESEND_API_KEY=re_...
ANTHROPIC_API_KEY=sk-ant-...

# ── Keycloak ──────────────────────────────────────
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=keel
KEYCLOAK_CLIENT_ID=keel-api
KEYCLOAK_CLIENT_SECRET=secret

# ── Web (.env.local) ──────────────────────────────
VITE_API_URL=https://api.keelapp.co.uk
VITE_KEYCLOAK_URL=https://auth.keelapp.co.uk
VITE_KEYCLOAK_REALM=keel
VITE_KEYCLOAK_CLIENT_ID=keel-web

# ── Mobile (app.config.ts extra) ─────────────────
EXPO_PUBLIC_API_URL=https://api.keelapp.co.uk
EXPO_PUBLIC_KEYCLOAK_URL=https://auth.keelapp.co.uk
EXPO_PUBLIC_KEYCLOAK_REALM=keel
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=keel-mobile
EXPO_PUBLIC_REDIRECT_SCHEME=com.keelapp
```

---

## DNS Layout (keelapp.co.uk)

```
keelapp.co.uk          → React web app
api.keelapp.co.uk      → API Gateway
auth.keelapp.co.uk     → Keycloak
minio.keelapp.co.uk    → MinIO console (internal only)
grafana.keelapp.co.uk  → Monitoring (internal only)
```

---

---

## Future Enhancements *(post Phase 9, v2+)*

Ideas worth building once the MVP is live and generating revenue. Not in scope now.

---

### FE-1 — Expense Studio (Anna Money pattern)

Rather than a form-based expense entry, build a **receipt-first** flow matching Anna Money's approach:

- Everything starts with a photo or file upload
- Two receipt types: `TRANSACTION_ATTACHMENT` (match to existing bank debit) and `STANDALONE` (cash / no bank entry)
- System suggests matching bank transactions automatically (merchant name similarity + amount + date proximity)
- "Transactions without receipts" screen — bank debits that have no receipt matched yet (killer UX for accountability)
- No mileage in Anna's implementation — Keel differentiates by adding HMRC AMAP mileage log
- `/api/expense-studio/` as a dedicated service (separate from documents service)

**Differentiators over Anna Money**:
- Mileage log with automatic HMRC rate switching at 10,000 miles
- Manual cash expense entry (Anna requires a receipt)
- HMRC "wholly and exclusively" flag on mixed-use items
- Receipt-required enforcement for expenses > £25

---

### FE-2 — Chat-Driven Workflow (Anna Money's biggest UX pattern)

Anna Money's most sophisticated feature is a **scenario system** — every complex action is driven through a chat interface rather than forms. WebSocket-connected, backend-orchestrated finite state machine.

```
User taps "Create Invoice" in chat
  → backend sends structured message cards (not plain text)
  → client renders interactive UI cards (not bubbles)
  → user taps card responses
  → backend advances scenario state
  → invoice is created when scenario completes
```

Anna's implementation is entirely **rule-based** (no LLM) — scripts defined on the backend, delivered as structured JSON. Very fast, very predictable, zero AI cost.

**For Keel**: Build this as a Phase 10 feature. The chat layer sits on top of existing APIs — it doesn't replace them. Implementation:
- WebSocket channel per user session
- `scenarios` table: scenario_type, state, context (JSONB), created_at
- Backend FSM advances state on each user input
- Frontend renders scenario message cards (not chat bubbles)
- Phase 9 AI upgrades individual scenario steps (replace scripted responses with Claude)

---

### FE-3 — Real Banking Layer (TrueLayer + Stripe Issuing)

Replace the simulated ledger and fake virtual card with real providers.

**FE-3a — TrueLayer Open Banking (transactions + balance)**
- TrueLayer Connect UI for bank authorisation (90-day consent flow)
- User connects their existing Barclays/HSBC/Monzo Business/Starling account
- Historical import: 90 days of transactions on first connect
- Webhooks for real-time transaction sync (new transactions pushed immediately)
- Multi-bank support: business account + personal for directors
- Automatic re-consent flow shown 7 days before 90-day expiry
- Banking service interface stays identical — only the data source changes (seeded DB → TrueLayer API)
- Sandbox: TrueLayer mock bank (`john`/`doe`) — free, covers full Data API during development

**FE-3b — Stripe Issuing (virtual card)**
- Replace fake virtual card data with a real Stripe-issued virtual Visa card
- Card number, CVV, expiry returned from Stripe API (PCI-compliant retrieval)
- Freeze/unfreeze maps directly to existing UI toggle
- GBP spending limits per card
- Single-use card numbers (Phase 3 extension — see FE-6)
- Push funding via BACS/FPS to top up Issuing balance
- Same Stripe account as subscription billing — no second onboarding
- Sandbox: free test cards with simulated authorisations
- Note: Stripe Issuing in production requires Stripe approval and makes Keel the card programme manager — legal/compliance review needed before launch

---

### FE-4 — Stripe Payment Links on Invoices

Add "Pay now" button to invoice emails:
- Create Stripe PaymentIntent when invoice is sent
- Embed payment link in email template
- Webhook: `payment_intent.succeeded` → auto mark invoice paid → credit banking account
- 1.4% + 20p per transaction (Stripe EU rate) — offer as optional add-on, not default

---

### FE-5 — Accountant Access Portal

Many UK SMEs have an accountant who needs read-only access:
- Invite accountant by email → Keycloak `accountant` role
- Read-only view of all transactions, invoices, VAT returns, CT estimate
- Export pack: one-click ZIP of all documents for a tax year (invoices PDF, receipts, bank statements CSV)
- Audit trail export for Companies House compliance

---

### FE-6 — Mobile Card Controls (Anna Money pattern)

Anna Money's card activation is chat-driven. Keel's virtual card (Phase 3 + FE-3b Stripe Issuing) can be extended:
- Spending category locks via Stripe Issuing spending controls (block gambling, restrict to specific MCC codes)
- Single-use virtual card numbers for online purchases (Stripe Issuing `SINGLE_USE` card type)
- Real-time spend notifications (Stripe Issuing webhook → push notification)
- Weekly/monthly spend reports pushed to user

---

### FE-7 — AI Self-Hosting with Ollama *(replaces Anthropic API for Phase 9)*

If Anthropic API costs are a concern at scale, the entire Phase 9 AI layer can run on self-hosted open-source models via **Ollama**:

```
Ollama server on Hetzner CX52 (16 vCPU, 32GB RAM, ~€35/month)
  → serves Mistral 7B or Llama 3.1 8B locally
  → OpenAI-compatible API (drop-in replacement for Anthropic calls)
  → zero per-token cost — fixed server cost only
```

| Model | Task | Quality vs Claude |
|-------|------|------------------|
| Llama 3.1 8B | Transaction categorisation | ~85% as good |
| Mistral 7B | Receipt OCR extraction | ~80% as good |
| Llama 3.1 70B | Tax chat assistant | ~90% as good (needs bigger server) |

Categorisation and extraction (Phases 9.1 and 9.2) work well on smaller models. The tax chat (9.3) benefits most from a larger model or Claude.

**Switching cost**: Change `ANTHROPIC_API_KEY` config to point at Ollama endpoint. The OpenAI-compatible API means the code barely changes.

---

*This document is the source of truth for Keel.*
*All decisions are locked. Update it as the product evolves.*
*Every architecture decision record goes in `/docs/ADR/`.*
