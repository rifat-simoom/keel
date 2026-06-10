"""
Tests for GET /api/v1/transactions/export.

# FIXME(gap-2.1): tests use dependency overrides rather than testcontainers — migrate
# to real Postgres when integration test infrastructure is set up (CLAUDE.md rule 9).
"""
import csv
import io
from datetime import date
from decimal import Decimal
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from services.banking.main import app
from services.banking import repository as repo
from services.banking.database import get_db
from services.banking.models import Account, Transaction
from shared.middleware.auth import CurrentUser, require_auth


# ── Fixtures ──────────────────────────────────────────────────────────────────

COMPANY_A = uuid4()
COMPANY_B = uuid4()
ACCOUNT_A_ID = uuid4()
ACCOUNT_B_ID = uuid4()

_FAKE_USER_A = CurrentUser(sub=uuid4(), email="a@test.com", roles=[])
_FAKE_USER_B = CurrentUser(sub=uuid4(), email="b@test.com", roles=[])

_FAKE_ACCOUNT_A = MagicMock(spec=Account)
_FAKE_ACCOUNT_A.id = ACCOUNT_A_ID
_FAKE_ACCOUNT_A.company_id = COMPANY_A

_FAKE_ACCOUNT_B = MagicMock(spec=Account)
_FAKE_ACCOUNT_B.id = ACCOUNT_B_ID
_FAKE_ACCOUNT_B.company_id = COMPANY_B


def _make_txn(
    amount: Decimal,
    description: str,
    txn_date: date,
    category: str | None = "SOFTWARE",
    merchant: str | None = "Acme",
    receipt_id: UUID | None = None,
) -> MagicMock:
    t = MagicMock(spec=Transaction)
    t.amount = amount
    t.description = description
    t.transaction_date = txn_date
    t.category = category
    t.merchant_name = merchant
    t.receipt_id = receipt_id
    return t


def _parse_csv(text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


async def _fake_db() -> AsyncGenerator[AsyncSession, None]:
    yield AsyncMock(spec=AsyncSession)


def _client_for_user(user: CurrentUser) -> TestClient:
    app.dependency_overrides[require_auth] = lambda: user
    app.dependency_overrides[get_db] = _fake_db
    return TestClient(app, raise_server_exceptions=True)


# ── Validation tests ──────────────────────────────────────────────────────────

def test_export_missing_date_from_returns_422():
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)):
        r = client.get("/api/v1/transactions/export?date_to=2026-03-31")
    assert r.status_code == 422


def test_export_missing_date_to_returns_422():
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01")
    assert r.status_code == 422


def test_export_date_from_after_date_to_returns_422():
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=[])):
        r = client.get("/api/v1/transactions/export?date_from=2026-03-31&date_to=2026-01-01")
    assert r.status_code == 422


def test_export_requires_auth():
    app.dependency_overrides.pop(require_auth, None)
    app.dependency_overrides[get_db] = _fake_db
    client = TestClient(app, raise_server_exceptions=False)
    r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    assert r.status_code in (401, 403)


# ── Response format tests ─────────────────────────────────────────────────────

def test_export_returns_csv_content_type():
    txns = [_make_txn(Decimal("100.00"), "Test", date(2026, 2, 1))]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]


def test_export_content_disposition_filename():
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=[])):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    assert r.status_code == 200
    cd = r.headers.get("content-disposition", "")
    assert "transactions-2026-01-01-2026-03-31.csv" in cd
    assert "attachment" in cd


def test_export_csv_has_expected_headers():
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=[])):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    # Even empty export should have header row — DictReader returns empty list but fieldnames exist
    reader = csv.reader(io.StringIO(r.text))
    header = next(reader)
    assert header == ["Date", "Description", "Merchant", "Amount (£)", "Direction", "Category", "Receipt Attached"]


def test_export_empty_range_returns_header_only():
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=[])):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-01-01")
    rows = _parse_csv(r.text)
    assert rows == []


# ── Amount formatting tests ───────────────────────────────────────────────────

def test_export_credit_amount_formatted_as_pounds():
    """Decimal 5000.00 must appear as '5000.00', never '500000' (pence) or float."""
    txns = [_make_txn(Decimal("5000.00"), "Client payment", date(2026, 2, 1))]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Amount (£)"] == "5000.00"


def test_export_debit_amount_is_positive_pounds():
    """Negative DB amount appears as positive value (abs) in the Amount column."""
    txns = [_make_txn(Decimal("-129.00"), "GitHub subscription", date(2026, 2, 1))]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Amount (£)"] == "129.00"
    assert rows[0]["Direction"] == "debit"


def test_export_credit_direction():
    txns = [_make_txn(Decimal("1000.00"), "Invoice paid", date(2026, 2, 1))]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Direction"] == "credit"


# ── Field mapping tests ───────────────────────────────────────────────────────

def test_export_receipt_attached_yes_when_receipt_id_set():
    txns = [_make_txn(Decimal("-50.00"), "Office supplies", date(2026, 2, 1), receipt_id=uuid4())]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Receipt Attached"] == "yes"


def test_export_receipt_attached_no_when_no_receipt():
    txns = [_make_txn(Decimal("-50.00"), "Office supplies", date(2026, 2, 1), receipt_id=None)]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Receipt Attached"] == "no"


def test_export_empty_category_when_uncategorised():
    txns = [_make_txn(Decimal("-20.00"), "Misc", date(2026, 2, 1), category=None)]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Category"] == ""


def test_export_empty_merchant_when_none():
    txns = [_make_txn(Decimal("500.00"), "Bank transfer", date(2026, 2, 1), merchant=None)]
    client = _client_for_user(_FAKE_USER_A)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_A)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_A)), \
         patch.object(repo, "get_transactions_for_export", new=AsyncMock(return_value=txns)):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    assert rows[0]["Merchant"] == ""


# ── Multi-tenancy test ────────────────────────────────────────────────────────

def test_export_company_b_cannot_see_company_a_transactions():
    """Company B's export must query only Company B's account — never Company A's data."""
    a_txns = [_make_txn(Decimal("9999.00"), "Secret payment", date(2026, 2, 1))]

    async def _fake_export(db, account_id, date_from, date_to):
        # Only return data when queried with Company B's account id
        if account_id == ACCOUNT_B_ID:
            return []
        return a_txns  # should never be reached for user B

    client = _client_for_user(_FAKE_USER_B)
    with patch.object(repo, "get_company_id_for_user", new=AsyncMock(return_value=COMPANY_B)), \
         patch.object(repo, "get_or_create_account", new=AsyncMock(return_value=_FAKE_ACCOUNT_B)), \
         patch.object(repo, "get_transactions_for_export", side_effect=_fake_export):
        r = client.get("/api/v1/transactions/export?date_from=2026-01-01&date_to=2026-03-31")
    rows = _parse_csv(r.text)
    # Company B gets 0 rows — never Company A's 9999.00 transaction
    assert rows == []
    for row in rows:
        assert row["Amount (£)"] != "9999.00"
