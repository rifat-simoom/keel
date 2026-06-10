# guardrails/python-practices.md — Python + FastAPI + SQLAlchemy Best Practices

> Rules are **ABSOLUTE**. Any generated code that violates them makes the session invalid.
> Stack context: Python 3.12+, FastAPI (async), SQLAlchemy 2.0 (async), PostgreSQL 16,
> Pydantic v2, Alembic, Celery + Redis, aio-pika (RabbitMQ).

---

## Async Practices

### PY-1: Async all the way down — never block the event loop

```python
# ❌ FORBIDDEN — blocks the event loop, starves other requests
import time
time.sleep(5)

import requests
response = requests.get("https://api.example.com")

result = session.execute(select(Invoice))  # sync SQLAlchemy in async context

# ✅ REQUIRED
import asyncio
await asyncio.sleep(5)

import httpx
async with httpx.AsyncClient() as client:
    response = await client.get("https://api.example.com")

result = await session.execute(select(Invoice))  # async SQLAlchemy
```

### PY-2: Never use synchronous SQLAlchemy session in async context

```python
# ❌ FORBIDDEN
from sqlalchemy.orm import Session
def get_invoice(session: Session, invoice_id: UUID): ...

# ✅ REQUIRED
from sqlalchemy.ext.asyncio import AsyncSession
async def get_invoice(session: AsyncSession, invoice_id: UUID): ...
```

### PY-3: Database sessions via dependency injection — never global

```python
# ❌ FORBIDDEN — shared session across requests causes data corruption
db_session = AsyncSession(engine)

# ✅ REQUIRED
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/invoices")
async def list_invoices(session: AsyncSession = Depends(get_db)): ...
```

---

## Money & Types

### PY-4: Decimal only for money — never float

```python
# ❌ FORBIDDEN
amount = 1200.50  # float
total = subtotal * 1.20  # float multiplication

# ✅ REQUIRED
from decimal import Decimal, ROUND_HALF_UP
amount = Decimal("1200.50")
vat = (amount * Decimal("0.20")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
# FR-2: HMRC VAT Act 1994 §26 — always round half-up to 2dp
```

### PY-5: All external input validated via Pydantic models — never raw dict

```python
# ❌ FORBIDDEN — no validation, no type safety
@router.post("/invoices")
async def create_invoice(body: dict): ...

# ✅ REQUIRED
from pydantic import BaseModel, field_validator
class InvoiceCreate(BaseModel):
    client_name: str
    amount: Decimal
    vat_rate: Decimal = Decimal("0.20")

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

@router.post("/invoices")
async def create_invoice(body: InvoiceCreate, user: User = Depends(require_auth)): ...
```

### PY-6: UUID primary keys — never integer sequences for exposed IDs

```python
# ❌ FORBIDDEN — sequential IDs leak record counts, enable enumeration attacks
id: int = Column(Integer, primary_key=True, autoincrement=True)

# ✅ REQUIRED
import uuid
id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

---

## Error Handling

### PY-7: Never use bare except — always catch specific exceptions

```python
# ❌ FORBIDDEN — swallows everything including KeyboardInterrupt
try:
    await do_something()
except:
    pass

# ❌ ALSO FORBIDDEN — too broad
try:
    await do_something()
except Exception:
    pass

# ✅ REQUIRED — catch what you expect
try:
    await session.execute(...)
except IntegrityError as e:
    raise HTTPException(status_code=409, detail={"error": "Conflict", "code": "DUPLICATE"}) from e
except OperationalError as e:
    logger.exception("DB connection error", exc_info=e)
    raise HTTPException(status_code=503, detail={"error": "Service unavailable", "code": "DB_ERROR"})
```

### PY-8: Always use HTTPException with the standard error shape

```python
# ❌ FORBIDDEN — non-standard response shape
return JSONResponse({"message": "Not found"}, status_code=404)
return JSONResponse({"detail": "Not found"}, status_code=404)

# ✅ REQUIRED — shape: { "error": string, "code": string, "details"?: object }
raise HTTPException(
    status_code=404,
    detail={"error": "Invoice not found", "code": "INVOICE_NOT_FOUND"}
)
```

### PY-9: Never silence IntegrityError — it means a constraint was violated

```python
# ❌ FORBIDDEN
try:
    await session.commit()
except IntegrityError:
    await session.rollback()
    return None  # silent failure

# ✅ REQUIRED — map to a meaningful user error
except IntegrityError as e:
    await session.rollback()
    if "unique" in str(e.orig).lower():
        raise HTTPException(409, {"error": "Already exists", "code": "DUPLICATE_RECORD"})
    raise
```

---

## SQLAlchemy Practices

### PY-10: All queries must filter deleted_at IS NULL unless fetching deleted records

```python
# ❌ FORBIDDEN — returns soft-deleted records
result = await session.execute(select(Invoice).where(Invoice.company_id == company_id))

# ✅ REQUIRED
result = await session.execute(
    select(Invoice)
    .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
)
```

### PY-11: Use SELECT FOR UPDATE when updating sequential counters

```python
# ❌ FORBIDDEN — race condition produces duplicate invoice numbers
counter = await session.get(InvoiceCounter, company_id)
counter.last_number += 1

# ✅ REQUIRED — row-level lock prevents concurrent duplicate
result = await session.execute(
    select(InvoiceCounter)
    .where(InvoiceCounter.company_id == company_id)
    .with_for_update()
)
counter = result.scalar_one()
counter.last_number += 1
```

### PY-12: Never load entire result sets — always paginate

```python
# ❌ FORBIDDEN — loads every row into memory
invoices = (await session.execute(select(Invoice))).scalars().all()

# ✅ REQUIRED
invoices = (await session.execute(
    select(Invoice)
    .where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    .order_by(Invoice.created_at.desc())
    .offset((page - 1) * page_size)
    .limit(page_size)
)).scalars().all()
```

### PY-13: Use eager loading for known relationships — avoid N+1 queries

```python
# ❌ FORBIDDEN — N+1: one query per invoice to get line items
invoices = (await session.execute(select(Invoice))).scalars().all()
for inv in invoices:
    print(inv.line_items)  # triggers a query per invoice

# ✅ REQUIRED
from sqlalchemy.orm import selectinload
result = await session.execute(
    select(Invoice).options(selectinload(Invoice.line_items))
)
```

---

## FastAPI Practices

### PY-14: Use dependency injection for all cross-cutting concerns

```python
# ❌ FORBIDDEN — hardcoded dependencies, untestable
@router.get("/invoices")
async def list_invoices():
    session = AsyncSessionLocal()
    user = get_current_user_from_header()

# ✅ REQUIRED
@router.get("/invoices")
async def list_invoices(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(require_auth),
): ...
```

### PY-15: Router prefix and tags — always declared at router creation

```python
# ❌ FORBIDDEN — prefix on every route, easy to get wrong
@router.get("/api/v1/invoices")
@router.post("/api/v1/invoices")

# ✅ REQUIRED
router = APIRouter(prefix="/api/v1/invoices", tags=["invoices"])

@router.get("")
@router.post("")
```

### PY-16: Response models on every endpoint — never return raw ORM objects

```python
# ❌ FORBIDDEN — leaks internal fields, no serialisation control
@router.get("/invoices/{id}")
async def get_invoice(id: UUID, ...):
    return await repo.get(id)  # returns ORM model directly

# ✅ REQUIRED
class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    amount_total: Decimal
    status: str
    model_config = ConfigDict(from_attributes=True)

@router.get("/invoices/{id}", response_model=InvoiceResponse)
async def get_invoice(id: UUID, ...):
    invoice = await repo.get(id)
    return InvoiceResponse.model_validate(invoice)
```

---

## Logging & Observability

### PY-17: Structured logging only — never print or f-string log messages

```python
# ❌ FORBIDDEN
print(f"Creating invoice for company {company_id}")
logger.info(f"Invoice {invoice_id} created by {user_id}")

# ✅ REQUIRED — structured key-value pairs for log aggregation
import structlog
logger = structlog.get_logger()
logger.info("invoice.created", invoice_id=str(invoice_id), company_id=str(company_id))
```

### PY-18: Never log PII — no emails, names, addresses in log messages

```python
# ❌ FORBIDDEN
logger.info("invoice.sent", client_email=invoice.client_email, client_name=invoice.client_name)

# ✅ REQUIRED — log IDs only; join to names in the data layer if needed
logger.info("invoice.sent", invoice_id=str(invoice.id), company_id=str(invoice.company_id))
```

---

## Code Quality

### PY-19: Type hints on every function signature — no untyped functions

```python
# ❌ FORBIDDEN
def calculate_vat(amount, rate):
    return amount * rate

# ✅ REQUIRED
from decimal import Decimal
def calculate_vat(amount: Decimal, rate: Decimal) -> Decimal:
    # FR-3: VAT Act 1994 §26
    return (amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

### PY-20: Constants in uppercase at module level — never magic numbers inline

```python
# ❌ FORBIDDEN
if profit > 250000:  # what is this number?
    rate = Decimal("0.25")

# ✅ REQUIRED — named, with source comment
CT_UPPER_LIMIT = Decimal("250000")   # HMRC CT600 — marginal relief upper limit
CT_MAIN_RATE = Decimal("0.25")       # Finance Act 2023 §7

if profit > CT_UPPER_LIMIT:
    rate = CT_MAIN_RATE
```

### PY-21: Celery tasks must be idempotent — always check before acting

```python
# ❌ FORBIDDEN — running twice sends two emails
@celery_app.task
def send_overdue_email(invoice_id: str):
    invoice = get_invoice(invoice_id)
    send_email(invoice.client_email, ...)

# ✅ REQUIRED — guard with idempotency check
@celery_app.task
def send_overdue_email(invoice_id: str):
    invoice = get_invoice(invoice_id)
    if invoice.overdue_email_sent_at is not None:
        return  # already sent, skip
    send_email(invoice.client_email, ...)
    mark_overdue_email_sent(invoice_id)
```

### PY-22: Use ruff for linting and formatting — never pylint or black separately

```toml
# pyproject.toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "S", "B", "A", "C4", "T20"]
# S = bandit security rules, T20 = no print statements, B = bugbear
```
