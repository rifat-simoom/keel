import logging

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Keel API Gateway",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://keelapp.co.uk",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_ROUTES: dict[str, str] = {
    "/api/v1/auth":          "http://auth-service:8001",
    "/api/v1/accounts":      "http://banking-service:8002",
    "/api/v1/transactions":  "http://banking-service:8002",
    "/api/v1/banking":       "http://banking-service:8002",
    "/api/v1/invoices":      "http://invoice-service:8003",
    "/api/v1/documents":     "http://documents-service:8004",
    "/api/v1/tax":           "http://tax-service:8005",
    "/api/v1/notifications": "http://notifications-service:8006",
    "/api/v1/deadlines":     "http://notifications-service:8006",
    "/api/v1/payroll":       "http://notifications-service:8006",  # placeholder until payroll service exists
    "/api/v1/dashboard":     "http://tax-service:8005",
}


def _resolve_service(path: str) -> str | None:
    for prefix, target in SERVICE_ROUTES.items():
        if path.startswith(prefix):
            return target
    return None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "gateway"}


@app.api_route(
    "/api/v1/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy(path: str, request: Request) -> Response:
    target_base = _resolve_service(request.url.path)
    if target_base is None:
        return Response(status_code=404, content=b'{"error": "Not found"}')

    url = f"{target_base}{request.url.path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)

    body = await request.body()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=dict(resp.headers),
    )
