"""Unit tests for deadline calculation engine — all dates pinned to TODAY."""
from datetime import date
import pytest

from services.notifications.deadlines import (
    vat_deadlines,
    corp_tax_deadlines,
    self_assessment_deadlines,
    invoice_deadlines,
)

TODAY = date(2026, 5, 20)


# ── VAT deadlines ──────────────────────────────────────────────────────────────

def test_vat_deadlines_returns_four():
    assert len(vat_deadlines("A", today=TODAY)) == 4

@pytest.mark.parametrize("stagger", ["A", "B", "C"])
def test_vat_deadlines_all_future(stagger):
    for d in vat_deadlines(stagger, today=TODAY):
        assert d["due_date"] >= TODAY

@pytest.mark.parametrize("stagger", ["A", "B", "C"])
def test_vat_deadlines_sorted(stagger):
    dates = [d["due_date"] for d in vat_deadlines(stagger, today=TODAY)]
    assert dates == sorted(dates)

def test_vat_deadlines_unknown_stagger_defaults_to_c():
    # Unknown stagger falls back to C (Mar/Jun/Sep/Dec)
    result = vat_deadlines("X", today=TODAY)
    assert len(result) == 4

def test_vat_deadlines_has_required_fields():
    for d in vat_deadlines("A", today=TODAY):
        assert "deadline_type" in d
        assert "title" in d
        assert "due_date" in d
        assert "days_until" in d
        assert "urgency" in d

def test_vat_deadlines_days_until_matches_due_date():
    for d in vat_deadlines("A", today=TODAY):
        expected = (d["due_date"] - TODAY).days
        assert d["days_until"] == expected


# ── Corporation Tax deadlines ──────────────────────────────────────────────────

def test_corp_tax_deadlines_not_empty():
    assert len(corp_tax_deadlines(3, today=TODAY)) > 0

def test_corp_tax_deadlines_all_future():
    for d in corp_tax_deadlines(3, today=TODAY):
        assert d["due_date"] >= TODAY

def test_corp_tax_deadlines_includes_payment_type():
    types = {d["deadline_type"] for d in corp_tax_deadlines(3, today=TODAY)}
    assert "corp_tax_payment" in types

def test_corp_tax_deadlines_includes_filing_type():
    types = {d["deadline_type"] for d in corp_tax_deadlines(3, today=TODAY)}
    assert "corp_tax_filing" in types

@pytest.mark.parametrize("month", [3, 6, 9, 12])
def test_corp_tax_deadlines_different_year_ends(month):
    result = corp_tax_deadlines(month, today=TODAY)
    assert len(result) > 0


# ── Self-assessment deadlines ──────────────────────────────────────────────────

def test_self_assessment_due_jan_31():
    for d in self_assessment_deadlines(today=TODAY):
        assert d["due_date"].month == 1
        assert d["due_date"].day == 31

def test_self_assessment_all_future():
    for d in self_assessment_deadlines(today=TODAY):
        assert d["due_date"] >= TODAY

def test_self_assessment_correct_type():
    for d in self_assessment_deadlines(today=TODAY):
        assert d["deadline_type"] == "self_assessment"


# ── Invoice deadlines ──────────────────────────────────────────────────────────

INVOICES = [
    {"id": "a1", "invoice_number": "INV-001", "client_name": "Acme", "total": "1000",
     "due_date": date(2026, 6, 1), "status": "sent"},
    {"id": "a2", "invoice_number": "INV-002", "client_name": "Beta", "total": "2000",
     "due_date": date(2026, 6, 15), "status": "viewed"},
    {"id": "a3", "invoice_number": "INV-003", "client_name": "Gamma", "total": "500",
     "due_date": date(2026, 6, 20), "status": "paid"},   # should be excluded
    {"id": "a4", "invoice_number": "INV-004", "client_name": "Delta", "total": "750",
     "due_date": date(2026, 4, 1), "status": "sent"},    # past due — excluded
]

def test_invoice_deadlines_excludes_paid():
    result = invoice_deadlines(INVOICES, today=TODAY)
    ids = [d["route"] for d in result]
    assert "/invoices/a3" not in ids

def test_invoice_deadlines_excludes_past():
    result = invoice_deadlines(INVOICES, today=TODAY)
    ids = [d["route"] for d in result]
    assert "/invoices/a4" not in ids

def test_invoice_deadlines_includes_sent_and_viewed():
    result = invoice_deadlines(INVOICES, today=TODAY)
    ids = {d["route"] for d in result}
    assert "/invoices/a1" in ids
    assert "/invoices/a2" in ids

def test_invoice_deadlines_urgency_critical():
    invoices = [{"id": "x", "invoice_number": "INV-X", "client_name": "X", "total": "100",
                 "due_date": date(2026, 5, 22), "status": "sent"}]
    result = invoice_deadlines(invoices, today=TODAY)
    assert result[0]["urgency"] == "critical"  # 2 days away

def test_invoice_deadlines_urgency_ok():
    invoices = [{"id": "x", "invoice_number": "INV-X", "client_name": "X", "total": "100",
                 "due_date": date(2026, 7, 1), "status": "sent"}]
    result = invoice_deadlines(invoices, today=TODAY)
    assert result[0]["urgency"] == "ok"  # 42 days away
