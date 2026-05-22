"""Unit tests for pure helper functions in the tax router."""
from datetime import date
import pytest

from services.tax.router import _tax_year_bounds, _ct_year_bounds, _vat_periods


# ── _tax_year_bounds ───────────────────────────────────────────────────────────

def test_tax_year_bounds_2025():
    start, end = _tax_year_bounds(2025)
    assert start == date(2024, 4, 6)
    assert end == date(2025, 4, 5)

def test_tax_year_bounds_2026():
    start, end = _tax_year_bounds(2026)
    assert start == date(2025, 4, 6)
    assert end == date(2026, 4, 5)

def test_tax_year_bounds_span_is_365_or_366_days():
    start, end = _tax_year_bounds(2025)
    delta = (end - start).days + 1
    assert delta in (365, 366)


# ── _ct_year_bounds ────────────────────────────────────────────────────────────

def test_ct_year_bounds_returns_three_values():
    assert len(_ct_year_bounds(3)) == 3

def test_ct_year_end_march_is_end_of_month():
    _, year_end, _ = _ct_year_bounds(3)
    assert year_end.month == 3
    assert year_end.day == 31

def test_ct_year_end_december_is_end_of_month():
    _, year_end, _ = _ct_year_bounds(12)
    assert year_end.month == 12
    assert year_end.day == 31

def test_ct_year_start_day_after_previous_year_end():
    year_start, year_end, _ = _ct_year_bounds(3)
    # start should be one day after the equivalent date a year earlier
    assert year_start < year_end
    assert (year_end - year_start).days > 300

def test_ct_year_end_is_in_past():
    # year_end should never be in the future (we always look at the last completed year)
    _, year_end, _ = _ct_year_bounds(3)
    assert year_end <= date.today()


# ── _vat_periods ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize("count", [1, 2, 4, 8])
def test_vat_periods_correct_count(count):
    assert len(_vat_periods("A", count=count)) == count

@pytest.mark.parametrize("stagger", ["A", "B", "C"])
def test_vat_periods_sorted_ascending(stagger):
    periods = _vat_periods(stagger, count=4)
    starts = [p[0] for p in periods]
    assert starts == sorted(starts)

def test_vat_periods_each_has_label():
    for start, end, label in _vat_periods("B", count=4):
        assert isinstance(label, str)
        assert "–" in label  # label format: "Jan–Mar 2025"

def test_vat_periods_start_before_end():
    for start, end, _ in _vat_periods("C", count=4):
        assert start < end

def test_vat_periods_all_in_past():
    # All periods should be completed (end date in the past)
    today = date.today()
    for _, end, _ in _vat_periods("A", count=4):
        assert end < today

def test_vat_periods_stagger_a_end_months():
    # Stagger A quarters end in Jan, Apr, Jul, Oct
    periods = _vat_periods("A", count=4)
    end_months = {p[1].month for p in periods}
    assert end_months.issubset({1, 4, 7, 10})
