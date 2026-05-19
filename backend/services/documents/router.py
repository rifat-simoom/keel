import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.middleware.auth import CurrentUser, require_auth

from .database import get_db
from . import repository as repo
from . import storage
from .schemas import (
    DocumentListResponse,
    DocumentResponse,
    MatchTransactionRequest,
    UpdateDocumentRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["documents"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/pdf",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


async def _get_company(db: AsyncSession, user: CurrentUser) -> UUID:
    company_id = await repo.get_company_id_for_user(db, user.sub)
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found — complete onboarding first",
        )
    return company_id


def _with_url(doc, company_id: UUID) -> DocumentResponse:
    resp = DocumentResponse.model_validate(doc)
    resp.url = storage.presign_url(doc.file_key)
    return resp


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, WEBP, HEIC, or PDF.",
        )
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 20 MB limit",
        )

    company_id = await _get_company(db, current_user)
    file_key = storage.upload_file(data, file.filename or "receipt", file.content_type, str(company_id))

    doc = await repo.create_document(
        db,
        company_id=company_id,
        file_key=file_key,
        file_name=file.filename or "receipt",
        mime_type=file.content_type,
        file_size=len(data),
    )
    await db.commit()
    await db.refresh(doc)
    return _with_url(doc, company_id)


# ── List & Get ────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    company_id = await _get_company(db, current_user)
    items, total = await repo.list_documents(db, company_id, page, page_size, status_filter)
    return DocumentListResponse(
        items=[_with_url(d, company_id) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    company_id = await _get_company(db, current_user)
    doc = await repo.get_document(db, doc_id, company_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _with_url(doc, company_id)


# ── Update (manual fields) ────────────────────────────────────────────────────

@router.put("/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(
    doc_id: UUID,
    body: UpdateDocumentRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    company_id = await _get_company(db, current_user)
    doc = await repo.get_document(db, doc_id, company_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    doc = await repo.update_document(db, doc, body)
    await db.commit()
    await db.refresh(doc)
    return _with_url(doc, company_id)


# ── Match / Unmatch ───────────────────────────────────────────────────────────

@router.post("/documents/{doc_id}/match", response_model=DocumentResponse)
async def match_document(
    doc_id: UUID,
    body: MatchTransactionRequest,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    company_id = await _get_company(db, current_user)
    doc = await repo.get_document(db, doc_id, company_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    doc = await repo.match_transaction(db, doc, body.transaction_id)
    await db.commit()
    await db.refresh(doc)
    return _with_url(doc, company_id)


@router.post("/documents/{doc_id}/unmatch", response_model=DocumentResponse)
async def unmatch_document(
    doc_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    company_id = await _get_company(db, current_user)
    doc = await repo.get_document(db, doc_id, company_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not doc.transaction_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document is not matched to a transaction")
    doc = await repo.unmatch_transaction(db, doc)
    await db.commit()
    await db.refresh(doc)
    return _with_url(doc, company_id)


# ── AI Extract stub (Phase 9) ─────────────────────────────────────────────────

@router.post("/documents/{doc_id}/extract", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def extract_document(
    doc_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
) -> dict:
    return {
        "detail": "AI extraction not yet available — coming in Phase 9",
        "feature": "FEATURE_AI_ENABLED",
    }


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: UUID,
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> None:
    company_id = await _get_company(db, current_user)
    doc = await repo.get_document(db, doc_id, company_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await repo.soft_delete(db, doc)
    await db.commit()
