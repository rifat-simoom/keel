from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Document
from .schemas import UpdateDocumentRequest


# ── Company lookup (shared DB) ────────────────────────────────────────────────

async def get_company_id_for_user(db: AsyncSession, keycloak_id: UUID) -> UUID | None:
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT company_id FROM user_profiles WHERE keycloak_id = :kid"),
        {"kid": str(keycloak_id)},
    )
    row = result.one_or_none()
    return UUID(str(row[0])) if row and row[0] else None


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_document(
    db: AsyncSession,
    company_id: UUID,
    file_key: str,
    file_name: str,
    mime_type: str,
    file_size: int | None,
) -> Document:
    doc = Document(
        company_id=company_id,
        file_key=file_key,
        file_name=file_name,
        mime_type=mime_type,
        file_size=file_size,
        status="uploaded",
    )
    db.add(doc)
    await db.flush()
    return doc


async def get_document(db: AsyncSession, doc_id: UUID, company_id: UUID) -> Document | None:
    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.company_id == company_id,
            Document.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def list_documents(
    db: AsyncSession,
    company_id: UUID,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
) -> tuple[list[Document], int]:
    filters = [Document.company_id == company_id, Document.deleted_at.is_(None)]
    if status:
        filters.append(Document.status == status)

    count = (await db.execute(
        select(func.count()).select_from(Document).where(and_(*filters))
    )).scalar() or 0

    result = await db.execute(
        select(Document)
        .where(and_(*filters))
        .order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), count


async def update_document(
    db: AsyncSession,
    doc: Document,
    body: UpdateDocumentRequest,
) -> Document:
    if body.vendor_name is not None:
        doc.vendor_name = body.vendor_name
    if body.amount is not None:
        doc.amount = body.amount
    if body.vat_amount is not None:
        doc.vat_amount = body.vat_amount
    if body.expense_date is not None:
        doc.expense_date = body.expense_date
    if body.category is not None:
        doc.category = body.category
    if body.notes is not None:
        doc.notes = body.notes
    doc.status = "reviewed"
    doc.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return doc


async def match_transaction(
    db: AsyncSession,
    doc: Document,
    transaction_id: UUID,
) -> Document:
    doc.transaction_id = transaction_id
    doc.status = "matched"
    doc.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return doc


async def unmatch_transaction(db: AsyncSession, doc: Document) -> Document:
    doc.transaction_id = None
    doc.status = "reviewed" if doc.vendor_name else "uploaded"
    doc.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return doc


async def soft_delete(db: AsyncSession, doc: Document) -> None:
    doc.deleted_at = datetime.now(timezone.utc)
    await db.flush()
