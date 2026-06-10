# guardrails/forbidden-patterns.md — Code Patterns the Agent Must Never Generate

> If any pattern below appears in generated output, the session is **invalid**.
> These are bugs, security vulnerabilities, or legal violations — not style preferences.

---

## FP-1: Hard Delete on Any Financial Record

```python
# ❌ FORBIDDEN
await session.delete(invoice)
await session.execute(delete(Invoice).where(Invoice.id == invoice_id))
db.query(Invoice).filter(...).delete()
```

```python
# ✅ REQUIRED — soft delete + audit log
invoice.deleted_at = datetime.utcnow()
invoice.updated_by = user.id
await write_audit_log(session, table="invoices", record_id=invoice.id,
                      action="DELETE", old_values=invoice.to_dict(), user_id=user.id)
await session.commit()
```

---

## FP-2: Float Arithmetic for Money

```python
# ❌ FORBIDDEN
total = quantity * unit_price           # float multiplication
vat = total * 0.20                      # float VAT — introduces rounding errors
balance = account.balance + 1.50        # float addition
```

```python
# ✅ REQUIRED
from decimal import Decimal
total = Decimal(str(quantity)) * unit_price   # unit_price is already Decimal from DB
vat = total * Decimal("0.20")
```

```typescript
// ❌ FORBIDDEN
const total = quantity * unitPrice;
const vat = total * 0.2;
```

```typescript
// ✅ REQUIRED — integer pence arithmetic
const totalPence = Math.round(quantity * Math.round(unitPrice * 100));
const vatPence = Math.round(totalPence * 20 / 100);
const totalInPounds = totalPence / 100;
```

---

## FP-3: Missing company_id Scope (Cross-Tenant Data Leak)

```python
# ❌ FORBIDDEN — no tenant filter
invoices = await session.execute(select(Invoice).where(Invoice.id == invoice_id))
all_transactions = await session.execute(select(Transaction))
```

```python
# ✅ REQUIRED — always scope to company_id from JWT
invoices = await session.execute(
    select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.company_id == current_user.company_id,
        Invoice.deleted_at.is_(None)
    )
)
```

---

## FP-4: company_id from Request Body (Tenant Injection)

```python
# ❌ FORBIDDEN — user can forge company_id
class CreateInvoiceRequest(BaseModel):
    company_id: UUID   # user-supplied — attacker can access other companies
    client_name: str
```

```python
# ✅ REQUIRED — always from verified JWT
class CreateInvoiceRequest(BaseModel):
    client_name: str   # no company_id in request body

async def create_invoice(req: CreateInvoiceRequest, user: User = Depends(require_auth)):
    invoice = Invoice(company_id=user.company_id, ...)  # from JWT, never from body
```

---

## FP-5: Mutation Without Audit Log Entry

```python
# ❌ FORBIDDEN — state change with no audit trail (illegal under UK law)
invoice.status = "paid"
invoice.paid_at = datetime.utcnow()
await session.commit()
```

```python
# ✅ REQUIRED
old_values = {"status": invoice.status, "paid_at": None}
invoice.status = "paid"
invoice.paid_at = datetime.utcnow()
invoice.updated_by = user.id
new_values = {"status": "paid", "paid_at": invoice.paid_at.isoformat()}
await write_audit_log(session, table="invoices", record_id=invoice.id,
                      action="UPDATE", old_values=old_values, new_values=new_values,
                      company_id=invoice.company_id, user_id=user.id)
await session.commit()
```

---

## FP-6: Editing a Submitted VAT Return or Filed CT Return

```python
# ❌ FORBIDDEN — modifying a locked financial return
vat_return.box_1 = new_output_vat
ct_return.taxable_profit = revised_profit
await session.commit()
```

```python
# ✅ REQUIRED — check lock before any write
if vat_return.submitted_at is not None:
    raise HTTPException(
        status_code=409,
        detail={"error": "VAT return is locked after submission", "code": "VAT_RETURN_LOCKED"}
    )
```

---

## FP-7: Unprotected Endpoint

```python
# ❌ FORBIDDEN — no auth dependency
@router.get("/invoices")
async def list_invoices():
    ...

@router.post("/transactions")
async def create_transaction(body: TransactionCreate):
    ...
```

```python
# ✅ REQUIRED
@router.get("/invoices")
async def list_invoices(user: User = Depends(require_auth)):
    ...
```

---

## FP-8: Direct HTTP Between Microservices

```python
# ❌ FORBIDDEN — synchronous cross-service HTTP call
import httpx
response = await httpx.get("http://tax-service/api/v1/estimate")
await httpx.post("http://notification-service/api/v1/notify", json=payload)
```

```python
# ✅ REQUIRED — publish RabbitMQ event via outbox pattern
await publish_event(
    session,
    event_type="invoice.paid",
    payload={"invoice_id": str(invoice.id), "company_id": str(invoice.company_id), "amount": str(invoice.total)}
)
```

---

## FP-9: Hardcoded Tax Rates or HMRC Thresholds

```python
# ❌ FORBIDDEN — hardcoded rates break when HMRC changes them
vat_amount = amount * 0.20
ct_rate = 0.25
mileage_rate = 0.45
vat_threshold = 85000
```

```python
# ✅ REQUIRED — named constants, sourced from shared module
from shared.constants.tax import (
    VAT_STANDARD_RATE,          # Decimal("0.20")
    CT_MAIN_RATE,               # Decimal("0.25")
    CT_SMALL_PROFITS_RATE,      # Decimal("0.19")
    CT_SMALL_PROFITS_LIMIT,     # Decimal("50000")
    CT_MAIN_RATE_LIMIT,         # Decimal("250000")
    MILEAGE_RATE_CAR_STANDARD,  # Decimal("0.45")
    MILEAGE_RATE_CAR_UPPER,     # Decimal("0.25")
    MILEAGE_THRESHOLD,          # 10000
    VAT_REGISTRATION_THRESHOLD, # Decimal("90000")
    VAT_WARNING_THRESHOLD,      # Decimal("75000")
)
```

---

## FP-10: Access Token in Persistent Storage

```typescript
// ❌ FORBIDDEN — access token must never persist across sessions
localStorage.setItem("access_token", token);
sessionStorage.setItem("access_token", token);
AsyncStorage.setItem("access_token", token);  // React Native
await SecureStore.setItemAsync("access_token", token);  // Expo — wrong for access token
```

```typescript
// ✅ REQUIRED — access token in Zustand (memory) only
useAuthStore.setState({ accessToken: token });
// Only refresh token goes in SecureStore on mobile:
await SecureStore.setItemAsync("refresh_token", refreshToken);
```

---

## FP-11: User-Editable or User-Supplied Invoice Number

```python
# ❌ FORBIDDEN — user can create gaps, duplicates, or non-sequential numbers
class CreateInvoiceRequest(BaseModel):
    invoice_number: str  # user-supplied = HMRC audit risk
```

```python
# ✅ REQUIRED — system generates, sequence locked
async def generate_invoice_number(session: AsyncSession, company_id: UUID, year: int) -> str:
    result = await session.execute(
        select(func.max(Invoice.invoice_number))
        .where(Invoice.company_id == company_id,
               extract("year", Invoice.created_at) == year)
        .with_for_update()   # prevents race condition gap
    )
    last = result.scalar()
    next_seq = (int(last.split("-")[2]) + 1) if last else 1
    return f"INV-{year}-{next_seq:03d}"
```

---

## FP-12: Blocking External API Call in Async Request Handler

```python
# ❌ FORBIDDEN — blocks the event loop, can timeout the HTTP request
@router.post("/documents/{id}/extract")
async def extract_document(id: UUID, user: User = Depends(require_auth)):
    result = anthropic_client.messages.create(...)  # long-running — blocks
    return result
```

```python
# ✅ REQUIRED — offload to Celery
@router.post("/documents/{id}/extract")
async def extract_document(id: UUID, user: User = Depends(require_auth)):
    document = await get_document_or_404(session, id, user.company_id)
    task = extract_document_task.delay(str(id))
    return {"task_id": task.id, "status": "processing"}
```

---

## FP-13: ENTERTAINMENT in CT Deduction Calculation

```python
# ❌ FORBIDDEN — entertainment is never CT-deductible (HMRC rule)
ALLOWABLE_CATEGORIES = [
    "TRAVEL", "VEHICLE", "OFFICE", "EQUIPMENT", "SOFTWARE",
    "MARKETING", "PROFESSIONAL", "TELEPHONE", "PREMISES",
    "WAGES", "TRAINING", "ENTERTAINMENT"  # ← ILLEGAL — removes this
]
```

```python
# ✅ REQUIRED — ENTERTAINMENT explicitly excluded
CT_ALLOWABLE_CATEGORIES = frozenset({
    "TRAVEL", "VEHICLE", "OFFICE", "EQUIPMENT", "SOFTWARE",
    "MARKETING", "PROFESSIONAL", "TELEPHONE", "PREMISES",
    "WAGES", "TRAINING",
    # ENTERTAINMENT: never allowable per HMRC — see guardrails/financial-rules.md FR-2
    # OTHER: blocked until categorised — never in CT calculation
})
```

---

## FP-14: Mutation Endpoint Without Idempotency Check

```python
# ❌ FORBIDDEN — double-execution on client retry credits the account twice
@router.post("/invoices/{id}/mark-paid")
async def mark_paid(id: UUID, user: User = Depends(require_auth)):
    invoice.status = "paid"
    account.balance += invoice.total   # runs twice on retry = double credit
```

```python
# ✅ REQUIRED
@router.post("/invoices/{id}/mark-paid")
async def mark_paid(
    id: UUID,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    user: User = Depends(require_auth)
):
    cached = await redis.get(f"idem:{idempotency_key}")
    if cached:
        return JSONResponse(content=json.loads(cached))
    # ... perform operation ...
    await redis.setex(f"idem:{idempotency_key}", 86400, json.dumps(result))
    return result
```

---

## FP-15: HMRC Tax Payment Classified as an Expense

```python
# ❌ FORBIDDEN — VAT/CT/PAYE payments to HMRC are not expenses
transaction = Transaction(
    description="VAT payment to HMRC",
    category="PROFESSIONAL",   # ← WRONG — this understates profit
    is_expense=True             # ← WRONG — creates false CT deduction
)
```

```python
# ✅ REQUIRED — HMRC payments are balance sheet movements
transaction = Transaction(
    description="VAT payment to HMRC Q1",
    category="HMRC_VAT_PAYMENT",  # special non-expense category
    is_expense=False,              # NOT an expense
    # These reduce the VAT liability account, not the P&L
)
```

---

## FP-16: Querying Without Soft-Delete Filter

```python
# ❌ FORBIDDEN — returns records the user "deleted" — legal + UX problem
result = await session.execute(
    select(Invoice).where(Invoice.company_id == company_id)
)
```

```python
# ✅ REQUIRED — always filter unless explicitly fetching deleted records
result = await session.execute(
    select(Invoice).where(
        Invoice.company_id == company_id,
        Invoice.deleted_at.is_(None)   # always exclude soft-deleted
    )
)
```

---

## FP-17: Synchronous SQLAlchemy Session in Async FastAPI Handler

```python
# ❌ FORBIDDEN — sync session in async context blocks event loop
from sqlalchemy.orm import Session

def get_db():
    db = SessionLocal()   # sync session
    ...

@router.get("/invoices")
async def list_invoices(db: Session = Depends(get_db)):
    return db.query(Invoice).all()   # sync query in async handler
```

```python
# ✅ REQUIRED
from sqlalchemy.ext.asyncio import AsyncSession

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session

@router.get("/invoices")
async def list_invoices(session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(Invoice))
    return result.scalars().all()
```

---

## FP-18: Logging PII or Financial Amounts in Plain Logs

```python
# ❌ FORBIDDEN — exposes PII and financial data in log aggregators
logger.info(f"Invoice total: £{invoice.total} for client {invoice.client_email}")
logger.debug(f"VAT return data: {vat_return.__dict__}")
logger.error(f"Failed payment for {user.full_name} ({user.email})")
```

```python
# ✅ REQUIRED — log IDs and status only
logger.info("Invoice status transition",
            extra={"invoice_id": str(invoice.id), "status": invoice.status,
                   "company_id": str(invoice.company_id)})
```

---

## FP-19: Invoice State Transition Without Validation

```python
# ❌ FORBIDDEN — direct status assignment bypasses state machine
invoice.status = "paid"   # what if it was CANCELLED? Now it's both.
invoice.status = "sent"   # what if it was already PAID?
```

```python
# ✅ REQUIRED — always validate via state machine
from services.invoice.state_machine import InvoiceStateMachine

sm = InvoiceStateMachine(invoice)
if not sm.can_transition_to("paid"):
    raise HTTPException(
        status_code=409,
        detail={"error": f"Cannot transition from {invoice.status} to paid",
                "code": "INVALID_STATE_TRANSITION"}
    )
sm.transition_to("paid")
```

---

## FP-20: Missing Currency Column on Monetary Table

```python
# ❌ FORBIDDEN — bare monetary amount with no currency
class Transaction(Base):
    amount: Mapped[Decimal]   # no currency — multi-currency migration nightmare
```

```python
# ✅ REQUIRED — currency always present
class Transaction(Base):
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="GBP")
```

---

## FP-21: Exposing Internal Stack Traces in API Responses

```python
# ❌ FORBIDDEN — leaks service internals, paths, library versions
@app.exception_handler(Exception)
async def generic_handler(request, exc):
    return JSONResponse({"error": str(exc), "traceback": traceback.format_exc()})
```

```python
# ✅ REQUIRED — log internally, return sanitised response
@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error", extra={"path": request.url.path})
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred", "code": "INTERNAL_ERROR"}
    )
```

---

## FP-22: Creating an Invoice Without Validating VAT Invoice Requirements

```python
# ❌ FORBIDDEN — send invoice without checking legal requirements
@router.post("/invoices/{id}/send")
async def send_invoice(id: UUID, user: User = Depends(require_auth)):
    invoice.status = "sent"   # no validation — may be missing VAT number, address, etc.
    await session.commit()
```

```python
# ✅ REQUIRED — validate all VAT invoice fields before allowing SENT status
from services.invoice.validators import validate_vat_invoice_requirements

errors = validate_vat_invoice_requirements(invoice, company)
if errors:
    raise HTTPException(
        status_code=422,
        detail={"error": "Invoice does not meet VAT invoice requirements",
                "code": "INVALID_VAT_INVOICE", "details": errors}
    )
```
