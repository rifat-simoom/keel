# guardrails/owasp-top10.md — OWASP Top 10 (2021) for Keel Stack

> Rules are **ABSOLUTE**. Any generated code that violates them makes the session invalid.
> Stack context: FastAPI + SQLAlchemy 2.0 async + PostgreSQL + React 18 + Zustand.

---

## A01 — Broken Access Control

### A01-1: Never trust company_id from request body

```python
# ❌ FORBIDDEN — attacker can pass any company_id
@router.get("/invoices")
async def list_invoices(company_id: UUID, user: User = Depends(require_auth)):
    return await repo.list_by_company(company_id)

# ✅ REQUIRED — always from verified JWT
@router.get("/invoices")
async def list_invoices(user: User = Depends(require_auth)):
    return await repo.list_by_company(user.company_id)
```

### A01-2: Every query must filter by company_id

```python
# ❌ FORBIDDEN — returns data across all tenants
result = await session.execute(select(Invoice).where(Invoice.id == invoice_id))

# ✅ REQUIRED — always scope to tenant
result = await session.execute(
    select(Invoice).where(Invoice.id == invoice_id, Invoice.company_id == user.company_id)
)
if not result.scalar_one_or_none():
    raise HTTPException(status_code=404)
```

### A01-3: Role checks on destructive operations

```python
# ❌ FORBIDDEN — any authenticated user can delete
@router.delete("/company")
async def delete_company(user: User = Depends(require_auth)): ...

# ✅ REQUIRED
@router.delete("/company")
async def delete_company(user: User = Depends(require_role("owner"))): ...
```

---

## A02 — Cryptographic Failures

### A02-1: Never store secrets in code or env files committed to git

```python
# ❌ FORBIDDEN
SECRET_KEY = "hardcoded-secret-abc123"
KEYCLOAK_CLIENT_SECRET = "my-secret"

# ✅ REQUIRED — read from environment, validated at startup
import os
SECRET_KEY = os.environ["SECRET_KEY"]  # fails fast if missing
```

### A02-2: Never log sensitive fields

```python
# ❌ FORBIDDEN
logger.info(f"User login: {user.email} token={access_token}")

# ✅ REQUIRED
logger.info("User login", extra={"user_id": str(user.id)})
```

### A02-3: Passwords never stored — Keycloak owns auth

```python
# ❌ FORBIDDEN — implementing custom password storage
user.password_hash = bcrypt.hash(password)

# ✅ REQUIRED — Keycloak handles all credential storage
# If you find yourself hashing passwords, you are in the wrong layer
```

---

## A03 — Injection

### A03-1: Never concatenate SQL strings

```python
# ❌ FORBIDDEN — SQL injection
query = f"SELECT * FROM invoices WHERE client_name = '{client_name}'"
await session.execute(text(query))

# ✅ REQUIRED — parameterised always
result = await session.execute(
    select(Invoice).where(Invoice.client_name == client_name)
)
# If you must use raw SQL:
result = await session.execute(
    text("SELECT * FROM invoices WHERE client_name = :name"),
    {"name": client_name}
)
```

### A03-2: Never pass user input to shell commands

```python
# ❌ FORBIDDEN
import subprocess
subprocess.run(f"convert {filename} output.pdf", shell=True)

# ✅ REQUIRED — always use list form, never shell=True with user input
subprocess.run(["convert", filename, "output.pdf"], shell=False)
```

### A03-3: Validate and sanitise all file upload names

```python
# ❌ FORBIDDEN — path traversal
file_path = f"/uploads/{filename}"

# ✅ REQUIRED
import pathlib
safe_name = pathlib.Path(filename).name  # strips directory components
if not safe_name or safe_name.startswith("."):
    raise HTTPException(400, "Invalid filename")
```

---

## A04 — Insecure Design

### A04-1: Invoice numbers assigned by system only — never user input

```python
# ❌ FORBIDDEN
invoice.invoice_number = request.invoice_number  # user-supplied

# ✅ REQUIRED — system-generated, sequential, guarded by SELECT FOR UPDATE
invoice.invoice_number = await generate_invoice_number(session, company_id)
```

### A04-2: Idempotency keys checked before processing mutations

```python
# ❌ FORBIDDEN — no idempotency check
@router.post("/invoices")
async def create_invoice(body: InvoiceCreate, user: User = Depends(require_auth)): ...

# ✅ REQUIRED
@router.post("/invoices")
async def create_invoice(
    body: InvoiceCreate,
    idempotency_key: str = Header(...),
    user: User = Depends(require_auth),
): ...
```

---

## A05 — Security Misconfiguration

### A05-1: CORS must whitelist origins — never wildcard in production

```python
# ❌ FORBIDDEN
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# ✅ REQUIRED
ALLOWED_ORIGINS = os.environ["CORS_ALLOWED_ORIGINS"].split(",")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True)
```

### A05-2: Never expose stack traces in API responses

```python
# ❌ FORBIDDEN
@app.exception_handler(Exception)
async def handler(request, exc):
    return JSONResponse({"error": str(exc), "traceback": traceback.format_exc()})

# ✅ REQUIRED
@app.exception_handler(Exception)
async def handler(request, exc):
    logger.exception("Unhandled error", exc_info=exc)
    return JSONResponse({"error": "Internal server error", "code": "INTERNAL_ERROR"}, status_code=500)
```

### A05-3: Debug mode never enabled via code — only env var

```python
# ❌ FORBIDDEN
app = FastAPI(debug=True)

# ✅ REQUIRED
app = FastAPI(debug=os.getenv("DEBUG", "false").lower() == "true")
```

### A05-4: Security headers on every response

```python
# ✅ REQUIRED — add this middleware to every FastAPI app
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response
```

---

## A06 — Vulnerable and Outdated Components

### A06-1: Pin all dependency versions — no floating ranges in production

```toml
# ❌ FORBIDDEN in pyproject.toml
fastapi = ">=0.100"
sqlalchemy = "*"

# ✅ REQUIRED — exact or tightly bounded
fastapi = "==0.111.0"
sqlalchemy = "==2.0.30"
```

```json
// ❌ FORBIDDEN in package.json
"react": "^18.0.0"

// ✅ REQUIRED
"react": "18.3.1"
```

---

## A07 — Identification and Authentication Failures

### A07-1: JWT must be validated — signature, expiry, issuer

```python
# ❌ FORBIDDEN — decoding without verification
payload = jwt.decode(token, options={"verify_signature": False})

# ✅ REQUIRED
payload = jwt.decode(
    token,
    key=jwks_client.get_signing_key_from_jwt(token).key,
    algorithms=["RS256"],
    audience=settings.KEYCLOAK_CLIENT_ID,
    issuer=settings.KEYCLOAK_ISSUER,
)
```

### A07-2: Access tokens in memory only — never persisted

```typescript
// ❌ FORBIDDEN
localStorage.setItem("access_token", token)
AsyncStorage.setItem("access_token", token)

// ✅ REQUIRED — web: Zustand in-memory only
useAuthStore.setState({ accessToken: token })
// ✅ REQUIRED — mobile: refresh token in expo-secure-store, access token in MMKV memory only
```

### A07-3: Rate limit auth endpoints

```python
# ✅ REQUIRED on /auth/register and /auth/token endpoints
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/register")
@limiter.limit("10/minute")
async def register(request: Request, ...): ...
```

---

## A08 — Software and Data Integrity Failures

### A08-1: Outbox pattern for all RabbitMQ publishes — never fire-and-forget

```python
# ❌ FORBIDDEN — message lost if broker is down
await rabbit_channel.publish(event_payload)
await session.commit()

# ✅ REQUIRED — write to outbox first, worker delivers
await write_to_outbox(session, event_type="invoice.created", payload=payload)
await session.commit()
# Outbox worker picks up and publishes with at-least-once guarantee
```

### A08-2: Validate event payloads against the catalogue schema

```python
# ✅ REQUIRED — before publishing, validate against contracts/events.schema.json
from backend.shared.events.validator import validate_event_payload
validate_event_payload("invoice.created", payload)  # raises if schema mismatch
```

---

## A09 — Security Logging and Monitoring Failures

### A09-1: All auth events must be logged

```python
# ✅ REQUIRED — log login, failed auth, role escalation, logout
logger.info("auth.login", extra={"user_id": str(user.id), "ip": request.client.host})
logger.warning("auth.failed", extra={"reason": "expired_token", "ip": request.client.host})
```

### A09-2: All financial mutations must write an audit log row

```python
# ✅ REQUIRED — enforced by FP-5 in forbidden-patterns.md, repeated here for OWASP compliance
await write_audit_log(session, table="invoices", record_id=invoice.id,
                      action="UPDATE", old_values=old, new_values=new, user_id=user.id)
```

### A09-3: Never log request bodies containing financial data

```python
# ❌ FORBIDDEN
logger.debug(f"Request body: {await request.json()}")

# ✅ REQUIRED — log intent, not content
logger.info("invoice.create_attempted", extra={"user_id": str(user.id)})
```

---

## A10 — Server-Side Request Forgery (SSRF)

### A10-1: Never fetch user-supplied URLs server-side

```python
# ❌ FORBIDDEN — attacker can target internal services
@router.post("/fetch-logo")
async def fetch_logo(url: str):
    response = httpx.get(url)  # attacker passes http://internal-service/admin

# ✅ REQUIRED — only fetch from known, whitelisted domains
ALLOWED_LOGO_DOMAINS = {"storage.googleapis.com", "s3.amazonaws.com"}

async def fetch_external_resource(url: str):
    parsed = urlparse(url)
    if parsed.hostname not in ALLOWED_LOGO_DOMAINS:
        raise ValueError(f"Domain not allowed: {parsed.hostname}")
    return await http_client.get(url)
```
