import logging
import random
import string
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Account, BankConnection, Transaction, VirtualCard

logger = logging.getLogger(__name__)

# ── Account helpers ───────────────────────────────────────────────────────────

def _random_account_number() -> str:
    return "".join(random.choices(string.digits, k=8))


async def get_account_by_company(db: AsyncSession, company_id: UUID) -> Account | None:
    result = await db.execute(
        select(Account).where(Account.company_id == company_id)
    )
    return result.scalar_one_or_none()


async def get_company_id_for_user(db: AsyncSession, keycloak_id: UUID) -> UUID | None:
    """Read company_id from user_profiles (owned by auth-service, same DB)."""
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT company_id FROM user_profiles WHERE keycloak_id = :kid"),
        {"kid": str(keycloak_id)},
    )
    row = result.one_or_none()
    return UUID(str(row[0])) if row and row[0] else None


async def get_or_create_account(db: AsyncSession, company_id: UUID) -> Account:
    account = await get_account_by_company(db, company_id)
    if not account:
        account = await create_account(db, company_id)
    return account


async def create_account(db: AsyncSession, company_id: UUID) -> Account:
    account = Account(
        company_id=company_id,
        sort_code="04-00-04",
        account_number=_random_account_number(),
        balance=Decimal("0.00"),
        currency="GBP",
    )
    db.add(account)
    await db.flush()
    await _seed_demo_transactions(db, account)
    # Update balance to reflect seeded transactions
    result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            Transaction.account_id == account.id,
            Transaction.deleted_at.is_(None),
        )
    )
    total = result.scalar() or Decimal("0.00")
    account.balance = total

    # Create virtual card
    card = VirtualCard(
        account_id=account.id,
        last_four=str(random.randint(1000, 9999)),
        expiry_month=12,
        expiry_year=date.today().year + 3,
        status="active",
    )
    db.add(card)
    await db.flush()
    return account


async def _seed_demo_transactions(db: AsyncSession, account: Account) -> None:
    today = date.today()
    demos = [
        (Decimal("5000.00"), "Client payment — Acme Corp", "PROFESSIONAL", False, "Acme Corp"),
        (Decimal("2500.00"), "Invoice #INV-2025-001 paid", "PROFESSIONAL", False, "TechStart Ltd"),
        (Decimal("-129.00"), "GitHub Copilot subscription", "SOFTWARE", True, "GitHub"),
        (Decimal("-49.99"), "Figma Pro", "SOFTWARE", True, "Figma"),
        (Decimal("-250.00"), "Hetzner server invoice", "SOFTWARE", True, "Hetzner"),
        (Decimal("-85.60"), "Train to London client meeting", "TRAVEL", True, "Great Western Railway"),
        (Decimal("-42.50"), "Office supplies — Staples", "OFFICE", True, "Staples"),
        (Decimal("1800.00"), "Consulting retainer — Bluewave", "PROFESSIONAL", False, "Bluewave Digital"),
        (Decimal("-19.99"), "Notion workspace", "SOFTWARE", True, "Notion"),
        (Decimal("-350.00"), "Accountancy fee Q1", "PROFESSIONAL", True, "Smith & Co Accountants"),
        (Decimal("-180.00"), "Business insurance renewal", "INSURANCE", True, "Hiscox"),
        (Decimal("3200.00"), "Project milestone payment", "PROFESSIONAL", False, "Meridian Solutions"),
    ]
    for i, (amount, desc, cat, is_exp, merchant) in enumerate(demos):
        txn = Transaction(
            account_id=account.id,
            amount=amount,
            description=desc,
            category=cat,
            merchant_name=merchant,
            transaction_date=today - timedelta(days=i * 2 + 1),
            is_expense=is_exp,
        )
        db.add(txn)


# ── Transaction helpers ───────────────────────────────────────────────────────

async def list_transactions(
    db: AsyncSession,
    account_id: UUID,
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[Transaction], int]:
    filters = [
        Transaction.account_id == account_id,
        Transaction.deleted_at.is_(None),
    ]
    if category:
        filters.append(Transaction.category == category)
    if search:
        filters.append(Transaction.description.ilike(f"%{search}%"))
    if date_from:
        filters.append(Transaction.transaction_date >= date_from)
    if date_to:
        filters.append(Transaction.transaction_date <= date_to)

    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(and_(*filters))
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(Transaction)
        .where(and_(*filters))
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


async def get_transactions_for_export(
    db: AsyncSession,
    account_id: UUID,
    date_from: date,
    date_to: date,
) -> list[Transaction]:
    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.account_id == account_id,
            Transaction.deleted_at.is_(None),
            Transaction.transaction_date >= date_from,
            Transaction.transaction_date <= date_to,
        )
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
    )
    return list(result.scalars().all())


async def get_transaction(
    db: AsyncSession, transaction_id: UUID, account_id: UUID
) -> Transaction | None:
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.account_id == account_id,
            Transaction.deleted_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def create_transaction(
    db: AsyncSession,
    account: Account,
    amount: Decimal,
    description: str,
    transaction_date: date,
    category: str | None = None,
    merchant_name: str | None = None,
    is_expense: bool = False,
) -> Transaction:
    txn = Transaction(
        account_id=account.id,
        amount=amount,
        description=description,
        category=category,
        merchant_name=merchant_name,
        transaction_date=transaction_date,
        is_expense=is_expense,
    )
    db.add(txn)
    account.balance += amount
    await db.flush()
    return txn


async def update_transaction_category(
    db: AsyncSession, txn: Transaction, category: str
) -> Transaction:
    txn.category = category
    await db.flush()
    return txn


async def get_account_stats(
    db: AsyncSession, account_id: UUID, period_days: int = 30
) -> dict:
    cutoff = date.today() - timedelta(days=period_days)
    result = await db.execute(
        select(Transaction).where(
            Transaction.account_id == account_id,
            Transaction.transaction_date >= cutoff,
            Transaction.deleted_at.is_(None),
        )
    )
    txns = result.scalars().all()

    income = sum(t.amount for t in txns if t.amount > 0)
    expenses = sum(t.amount for t in txns if t.amount < 0)
    return {
        "period_days": period_days,
        "total_income": income,
        "total_expenses": abs(expenses),
        "net": income + expenses,
        "transaction_count": len(txns),
    }


# ── Virtual card helpers ──────────────────────────────────────────────────────

async def get_card(db: AsyncSession, account_id: UUID) -> VirtualCard | None:
    result = await db.execute(
        select(VirtualCard).where(VirtualCard.account_id == account_id)
    )
    return result.scalar_one_or_none()


async def set_card_status(db: AsyncSession, card: VirtualCard, status: str) -> VirtualCard:
    card.status = status
    await db.flush()
    return card


# ── TrueLayer connection ──────────────────────────────────────────────────────

async def get_bank_connection(db: AsyncSession, company_id: UUID) -> BankConnection | None:
    result = await db.execute(
        select(BankConnection).where(
            BankConnection.company_id == company_id,
            BankConnection.status != "disconnected",
        )
    )
    return result.scalar_one_or_none()


async def save_bank_connection(
    db: AsyncSession,
    company_id: UUID,
    truelayer_account_id: str,
    provider_id: str,
    provider_name: str,
    display_name: str,
    access_token: str,
    refresh_token: str,
    token_expiry: datetime,
) -> BankConnection:
    existing = await db.execute(
        select(BankConnection).where(BankConnection.company_id == company_id)
    )
    conn = existing.scalar_one_or_none()
    if conn:
        conn.truelayer_account_id = truelayer_account_id
        conn.provider_id = provider_id
        conn.provider_name = provider_name
        conn.display_name = display_name
        conn.access_token = access_token
        conn.refresh_token = refresh_token
        conn.token_expiry = token_expiry
        conn.status = "active"
    else:
        conn = BankConnection(
            company_id=company_id,
            truelayer_account_id=truelayer_account_id,
            provider_id=provider_id,
            provider_name=provider_name,
            display_name=display_name,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=token_expiry,
            status="active",
        )
        db.add(conn)
    await db.flush()
    return conn


async def disconnect_bank(db: AsyncSession, company_id: UUID) -> None:
    conn = await get_bank_connection(db, company_id)
    if conn:
        conn.status = "disconnected"
        conn.access_token = ""
        conn.refresh_token = ""
        await db.flush()


async def ensure_fresh_token(db: AsyncSession, conn: BankConnection) -> str:
    """Return a valid access token, refreshing if it expires within 5 minutes."""
    from . import truelayer as tl
    buffer = timedelta(minutes=5)
    if conn.token_expiry.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc) + buffer:
        return conn.access_token
    logger.info("TrueLayer token expiring soon, refreshing for company %s", conn.company_id)
    tokens = await tl.refresh_access_token(conn.refresh_token)
    conn.access_token = tokens["access_token"]
    conn.refresh_token = tokens.get("refresh_token", conn.refresh_token)
    conn.token_expiry = tokens["expiry"]
    await db.flush()
    return conn.access_token


# ── TrueLayer sync ────────────────────────────────────────────────────────────

async def sync_from_truelayer(
    db: AsyncSession,
    account: Account,
    conn: BankConnection,
) -> int:
    """Pull latest data from TrueLayer into the local DB. Returns count of new transactions."""
    from . import truelayer as tl

    access_token = await ensure_fresh_token(db, conn)

    # Fetch balance and update account
    try:
        balance_data = await tl.get_balance(access_token, conn.truelayer_account_id)
        account.balance = Decimal(str(balance_data["current"]))
    except Exception:
        logger.warning("Failed to fetch balance from TrueLayer", exc_info=True)

    # Fetch transactions — 90 days on first sync, 2 days since last sync otherwise
    if conn.last_synced_at:
        from_date = (conn.last_synced_at - timedelta(days=2)).date()
    else:
        from_date = date.today() - timedelta(days=90)
    to_date = date.today()

    try:
        raw_txns = await tl.get_transactions(
            access_token, conn.truelayer_account_id, from_date, to_date
        )
    except Exception:
        logger.error("Failed to fetch transactions from TrueLayer", exc_info=True)
        raw_txns = []

    new_count = 0
    for raw in raw_txns:
        tl_id = raw.get("transaction_id")
        if not tl_id:
            continue

        # Check if already imported
        existing = await db.execute(
            select(Transaction).where(Transaction.truelayer_transaction_id == tl_id)
        )
        if existing.scalar_one_or_none():
            continue

        amount = Decimal(str(raw.get("amount", 0)))
        tl_category = raw.get("transaction_category", "UNKNOWN")
        is_expense = amount < 0 and tl_category not in ("TRANSFER", "CREDIT")

        # Parse timestamp — TrueLayer returns ISO 8601
        ts = raw.get("timestamp", "")
        try:
            txn_date = datetime.fromisoformat(ts.replace("Z", "+00:00")).date()
        except (ValueError, AttributeError):
            txn_date = date.today()

        txn = Transaction(
            account_id=account.id,
            amount=amount,
            description=raw.get("description", ""),
            category=tl.map_category(tl_category),
            merchant_name=raw.get("merchant_name"),
            transaction_date=txn_date,
            is_expense=is_expense,
            truelayer_transaction_id=tl_id,
        )
        db.add(txn)
        new_count += 1

    conn.last_synced_at = datetime.now(timezone.utc)
    await db.flush()
    logger.info("TrueLayer sync: %d new transactions for company %s", new_count, conn.company_id)
    return new_count
