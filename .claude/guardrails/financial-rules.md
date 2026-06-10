# guardrails/financial-rules.md — HMRC & Financial Rules

> These rules are **ABSOLUTE**. The agent must never generate code that violates them.
> Every calculation, API response, and UI element must comply.
> Source of truth: UK GAAP, HMRC guidance, Companies Act 2006, VAT Act 1994.

---

## FR-1: Double-Entry Bookkeeping Foundation

Every financial event touches **two** accounts simultaneously. Credits always equal debits.

Keel v1 uses a simplified single-entry ledger but the data model **must** support v2 upgrade:
- Every transaction stores: `amount` (signed), `account_id`, `direction` (`credit`/`debit`), `category`
- Positive `amount` = credit (money in). Negative `amount` = debit (money out)
- Never design a schema that would require a destructive migration to add double-entry

---

## FR-2: Chart of Accounts — Valid HMRC Categories

Only these codes are valid for `category` on transactions and expenses:

| Code | Category | CT Allowable? | VAT Reclaimable? |
|------|----------|--------------|-----------------|
| `TRAVEL` | Travel & subsistence | Yes | Yes (20%) |
| `VEHICLE` | Motor expenses | Yes (business % only) | Partial |
| `OFFICE` | Office costs | Yes | Yes (20%) |
| `EQUIPMENT` | Equipment (capital) | AIA up to £1m | Yes (20%) |
| `SOFTWARE` | Software & subscriptions | Yes | Yes (20%) |
| `MARKETING` | Advertising & marketing | Yes | Yes (20%) |
| `PROFESSIONAL` | Professional fees | Yes | Yes (20%) |
| `TELEPHONE` | Phone & internet | Yes | Yes (20%) |
| `PREMISES` | Premises costs | Yes | Yes (20%) |
| `WAGES` | Wages & salaries | Yes | No |
| `BANK_CHARGES` | Bank charges | Yes | Exempt |
| `INSURANCE` | Insurance | Yes | Exempt |
| `TRAINING` | Training | Yes | Yes (20%) |
| `ENTERTAINMENT` | Entertainment | **NEVER** | No |
| `OTHER` | Uncategorised | Blocked | Unknown |

**Mandatory rules:**
- `ENTERTAINMENT` → **never** a CT allowable deduction → display a warning flag in every UI that shows it
- `EQUIPMENT` > £1,000 → capital expenditure (Annual Investment Allowance) → not immediately expensed
- `OTHER` → triggers "needs review" badge → **block** VAT return and CT submission until resolved
- Personal expenses → never allowable → system must flag mixed-use items
- The `CT_ALLOWABLE_CATEGORIES` constant must **exclude** `ENTERTAINMENT` and `OTHER`

---

## FR-3: VAT Registration Thresholds

- **Mandatory registration**: £90,000 turnover in any rolling 12-month period (2024/25 rate)
- **Keel warning threshold**: **£75,000** (15% buffer — warn before mandatory threshold)
- Never warn at £90,000 directly — the buffer exists to give the user preparation time
- Voluntary registration is allowed below threshold (to reclaim input VAT)
- Track cumulative rolling 12-month turnover continuously

---

## FR-4: VAT Rates — Valid Codes Only

| Rate | Code | Applied to |
|------|------|-----------|
| 20% | `STANDARD` | Most goods and services |
| 5% | `REDUCED` | Domestic fuel, children's car seats, mobility aids |
| 0% | `ZERO` | Food (most), books, children's clothing, public transport |
| — | `EXEMPT` | Insurance, financial services, education, health |
| — | `OUTSIDE_SCOPE` | Wages, dividends, HMRC penalties — not VAT |

No other VAT rates are valid. Never invent a rate.

---

## FR-5: VAT Schemes

| Scheme | VAT due when | Default? |
|--------|-------------|---------|
| `cash` | Invoice is **paid** | **Yes — default for new users** |
| `accrual` | Invoice is **issued/sent** | No |

- Company's scheme stored in `companies.vat_scheme` — **never hardcode**
- Default new users to `cash` — safer for freelancers with slow payers
- Output VAT calculation differs entirely between schemes — always branch on `vat_scheme`

---

## FR-6: VAT Return Calculation

```
Box 1  Output VAT    = VAT on SENT invoices (accrual) OR PAID invoices (cash) in period
Box 4  Input VAT     = VAT on allowable business expenses in period
Box 5  Net VAT       = Box 1 − Box 4  (positive = owed to HMRC)
Box 6  Total sales   = Net value of all sales (ex-VAT)
Box 7  Total purchases = Net value of all purchases (ex-VAT)
```

**Filing deadline**: 1 month + 7 days after quarter end.

**Penalty regime (2023+)**:
- Late submission: points-based — 4 points = £200 fine
- Late payment: 2% of VAT owed after 15 days, 4% after 30 days, 4% p.a. thereafter

**Submission rules**:
- Digital submission via HMRC MTD API only
- Store submission reference number after each submission
- Once submitted: **permanently locked** — no edits, no re-submissions without formal amendment

---

## FR-7: VAT Quarter Stagger Groups

Company's stagger group stored in `companies.vat_stagger` (`A`, `B`, or `C`).

| Group | Quarter ends | Deadline |
|-------|-------------|---------|
| `A` | 31 Mar / 30 Jun / 30 Sep / 31 Dec | 7 May / 7 Aug / 7 Nov / 7 Feb |
| `B` | 30 Apr / 31 Jul / 31 Oct / 31 Jan | 7 Jun / 7 Sep / 7 Dec / 7 Mar |
| `C` | 31 May / 31 Aug / 30 Nov / 28 Feb | 7 Jul / 7 Oct / 7 Jan / 7 Apr |

Never hardcode quarter dates — always calculate from stagger group and registration date.

---

## FR-8: VAT Invoice Legal Requirements (UK VAT Act 1994)

A VAT invoice **must** include all of the following. Missing any = legally invalid:

1. Unique sequential invoice number
2. Supplier name, registered address, VAT registration number
3. Invoice date AND tax point date
4. Client name and address
5. Description of goods/services supplied
6. Quantity and unit price per line item
7. VAT rate applied to each line item
8. Total ex-VAT, VAT amount, total inc-VAT
9. For zero-rated or exempt items: reason stated explicitly

Validation must run before `SENT` status is allowed. The send endpoint must reject incomplete invoices.

---

## FR-9: Invoice Legal Status Rules

```
DRAFT      → Editable. Deletable. No tax or legal effect.

SENT       → Legal document. Creates accounts receivable.
             VAT liability starts (accrual) OR deferred until paid (cash).
             CANNOT be deleted. CANNOT have amounts edited.
             Must be cancelled via credit note.

VIEWED     → Client opened the invoice link/PDF. Tracking only. No financial effect.

PAID       → Income realised. Credits bank account. CT liability increases.
             VAT now due (cash accounting scheme).
             Triggers bank reconciliation matching.

OVERDUE    → Past due_date. Legally still owed. Bad debt provision after 6 months.

CANCELLED  → Requires a credit note referencing original invoice number.
             Original invoice stays on record permanently (audit trail).
             Net financial effect = zero.

WRITTEN_OFF → Bad debt. CT deduction allowable.
              VAT bad debt relief claimable after 6 months unpaid.
```

**Valid state transitions only:**
- `DRAFT` → `SENT`
- `SENT` → `VIEWED` (client opens PDF/link)
- `SENT` / `VIEWED` → `PAID`
- `SENT` / `VIEWED` → `OVERDUE` (Celery scheduler)
- `OVERDUE` → `PAID` (still collectible)
- `SENT` / `VIEWED` / `OVERDUE` → `CANCELLED`
- `SENT` / `VIEWED` / `OVERDUE` / `PAID` → `WRITTEN_OFF`

No other transitions are valid. Enforce at the service layer, not just the API layer.

---

## FR-10: Invoice Numbering Rules

- Format: `INV-YYYY-NNN` (e.g., `INV-2025-001`, `INV-2025-042`)
- Strictly sequential with **no gaps** — HMRC audits gaps in sequence
- System assigns number — user **cannot** edit or override it
- Once used (even on a cancelled invoice) — **never reused**
- Credit notes: `CN-NNN` format, separate sequence
- Uniqueness enforced by `UNIQUE` constraint in database
- Sequence protected by `SELECT ... FOR UPDATE` to prevent race conditions

---

## FR-11: Credit Note Rules

- Must reference the original invoice number (`original_invoice_id`)
- Separate sequential `CN-NNN` number
- Amount must not exceed the original invoice amount
- VAT treatment must match the original invoice exactly
- Reduces output VAT on the **next** VAT return period

---

## FR-12: Expense Allowability (HMRC "Wholly and Exclusively" Test)

```
ALLOWED:   Laptop used only for work
ALLOWED:   Train ticket to client meeting
ALLOWED:   SaaS subscription (Keel, GitHub, Figma)
BLOCKED:   Client dinner → ENTERTAINMENT → disallowed for CT
BLOCKED:   Personal purchases of any kind
PARTIAL:   Mobile phone (business % only — user must declare %)
PARTIAL:   Home office (proportion of rent/utilities)
```

---

## FR-13: Receipt Requirements

- Required for every expense > **£25**
- Must show: supplier name, date, amount, VAT amount, VAT number
- Digital receipts are legally equivalent to paper (HMRC confirmed 2019)
- Retention: 6 years (CT) / 4 years (VAT)
- **Never** allow deletion of receipts linked to a submitted VAT return or CT period
- Soft delete only (`deleted_at` timestamp); MinIO file must be retained regardless

**UI enforcement**:
- Expenses > £25 with no receipt: red warning badge
- VAT return submission blocked if any unreceipted expense > £25 remains in the period

---

## FR-14: HMRC Approved Mileage Rates (AMAP 2024/25)

| Vehicle | First 10,000 miles | Over 10,000 miles |
|---------|-------------------|------------------|
| Car/van | **45p per mile** | **25p per mile** |
| Motorcycle | 24p per mile | 24p per mile |
| Bicycle | 20p per mile | 20p per mile |

- Track cumulative mileage **per tax year** per user
- Switch rate automatically when cumulative miles crosses 10,000 — never apply 45p beyond threshold
- Tax year resets 6 April each year — reset cumulative counter

---

## FR-15: Corporation Tax Rates (2023/24 onwards — current)

| Taxable Profit | Rate |
|---------------|------|
| ≤ £50,000 | **19%** (small profits rate) |
| £50,001 – £250,000 | **19%–25% tapered** (marginal relief) |
| > £250,000 | **25%** (main rate) |

**Marginal Relief Formula** (must implement exactly):
```
Relief = (£250,000 − profit) × (profit ÷ £250,000) × (25% − 19%)
Effective CT = (profit × 25%) − Relief
```

Never interpolate linearly — always apply the formula.

---

## FR-16: Corporation Tax Calculation

```
Gross profit       = Sum of all PAID invoices in the accounting year
Less: allowable    = All categorised expenses (excl. ENTERTAINMENT, OTHER)
Less: capital AIA  = Equipment (EQUIPMENT category) up to £1,000,000 AIA limit
Less: directors' salary (WAGES category — reduces taxable profit as a cost)
                   ─────────────────────────────────
Taxable profit     = Result above
CT liability       = Apply FR-15 rates to taxable profit
```

**Key dates:**
- CT payment deadline: **9 months + 1 day** after company year end
- CT600 filing deadline: **12 months** after company year end
- Late payment interest: Bank of England base rate + 2.5% from day 1

Company's year-end month stored in `companies.year_end_month` (1–12).

---

## FR-17: Dividends vs Salary Optimisation (2024/25 rates)

```
Personal allowance:          £12,570 (earnings below this = no IT or NIC)
Employee NIC primary threshold: £12,570
Dividend allowance:          £500 (tax-free)
Basic rate band:             up to £37,700

SALARY above £12,570:
  Income Tax:   20% (basic rate)
  Employee NIC: 8% (£12,570–£50,270) then 2%
  Employer NIC: 13.8% (above £9,100 secondary threshold — company cost)
  → effective rate on margin ≈ 28%+ (income tax + NIC)
  → BUT deductible from CT (saves 19–25% corporation tax)

DIVIDENDS:
  Dividend allowance: £500 tax-free
  Basic rate band:    8.75%
  Higher rate band:   33.75%
  No NIC on dividends (biggest advantage)
  NOT deductible from CT (paid from post-tax profit)

OPTIMAL SPLIT (basic rate taxpayer 2024/25):
  Salary:    £12,570 (uses personal allowance, zero IT, zero NIC below threshold)
  Dividends: Up to £37,700 at 8.75%
  Remainder: 33.75% or pension contributions
```

The optimiser must update in real-time as income changes. Always model **both** CT and personal tax together.

---

## FR-18: PAYE Calculation (Phase 8)

```
Taxable pay = Gross salary − Personal allowance (£12,570 for tax code 1257L)

Income Tax bands:
  Basic rate   (£0–£37,700):        20%
  Higher rate  (£37,701–£125,140):  40%
  Additional   (over £125,140):     45%

Employee NIC (Class 1):
  £12,570–£50,270:  8%
  Over £50,270:     2%

Employer NIC (Class 1):
  Over £9,100 secondary threshold: 13.8% (this is a company cost)
```

---

## FR-19: RTI (Real Time Information) — Phase 8

- **Full Payment Submission (FPS)** must be submitted to HMRC **on or before** each pay date
- FPS contains: employee NI number, tax code, gross pay, PAYE tax deducted, NIC deducted
- Failure penalty: **£100–£400 per month** automatic fine
- P60 issued to each employee by **31 May** after tax year end
- P11D (benefits in kind) due by **6 July**

---

## FR-20: Bank Reconciliation Rules

```
Unreconciled credit  → must match a paid invoice
Unreconciled debit   → must match an expense receipt
                    → OR a salary/dividend payment
                    → OR a tax payment (NOT an expense)
```

**HMRC tax payments are balance sheet movements, NOT expenses:**
- VAT payment to HMRC:  DR VAT Liability / CR Bank
- CT payment to HMRC:   DR CT Liability / CR Bank
- PAYE payment to HMRC: DR PAYE Liability / CR Bank

A business is audit-ready when every transaction is reconciled.
Dashboard must show "unreconciled transactions" count — prominent red badge until zero.

---

## FR-21: Audit Trail Immutability (Companies Act 2006 + HMRC)

```
Rule 1: No hard deletes on any financial record
Rule 2: Every change recorded: who changed it, when, old value, new value
Rule 3: Submitted VAT returns + filed CT returns permanently locked — no edits
Rule 4: Deleted receipts = soft delete (deleted_at); MinIO file retained
Rule 5: Audit log retention: 6 years minimum (CT standard)
```

---

## FR-22: Statutory Retention Periods

| Record Type | Minimum Retention |
|-------------|------------------|
| VAT records | **4 years** |
| CT records | **6 years** |
| Payroll records | **3 years** after the tax year |
| Company accounts | **6 years** (private company) |
| Receipts & invoices | **6 years** |
| Bank statements | **6 years** |

**Never** allow permanent deletion within these periods.
After expiry: offer archival export before any deletion — never silent purge.

---

## FR-23: UK Tax Calendar — Deadlines to Track and Warn

| Date | Event |
|------|-------|
| 5 April | End of personal tax year |
| 6 April | Start of new personal tax year — reset NIC/mileage counters |
| 31 January | Self-assessment filing + payment deadline |
| 31 July | Second payment on account |
| 31 March | Common company year end |
| Monthly (19th post / 22nd electronic) | PAYE/NIC payment to HMRC |
| Quarterly (stagger-dependent) | VAT return + payment |
| 9 months + 1 day after year end | CT payment |
| 12 months after year end | CT600 filing |

**Warning thresholds — mandatory UI behaviour:**
- 30 days before deadline → yellow warning chip
- 7 days before deadline → orange urgent badge
- 1 day before deadline → red critical alert

---

## FR-24: Multi-Currency Design Constraint

- All monetary storage includes a `currency` column (even if GBP only in v1)
- Never store amounts as bare `NUMERIC` without `currency` context
- Display warning if invoice currency ≠ `GBP` (no FX conversion in MVP)
- The `Invoice.currency` type must be `string` not a union literal — future-proofed
