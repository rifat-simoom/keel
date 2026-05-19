from fastapi import FastAPI

app = FastAPI(title="Keel Payroll Service", version="0.1.0")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "payroll"}


# Phase 7 — routes added here:
# GET  /api/v1/payroll/employees
# POST /api/v1/payroll/employees
# GET  /api/v1/payroll/runs
# POST /api/v1/payroll/runs
# POST /api/v1/payroll/runs/{id}/approve
# POST /api/v1/payroll/runs/{id}/submit-rti
