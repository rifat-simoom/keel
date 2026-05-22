import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from shared.models.base import Base
from .router import router
from .scanner import run_scanner

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_scanner_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scanner_task
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _scanner_task = asyncio.create_task(run_scanner(interval_seconds=3600))
    logger.info("Background scanner started")
    yield
    if _scanner_task:
        _scanner_task.cancel()
    await engine.dispose()


app = FastAPI(title="Keel Notification Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "notifications"}
