"""Unit tests for tax calculation logic — no I/O, pure functions only."""
from decimal import Decimal

from services.tax.calculators import corp_tax, optimise_pay


# ── Corporation Tax ────────────────────────────────────────────────────────────

def test_corp_tax_zero_profit():
    assert corp_tax(Decimal("0")) == Decimal("0")

def test_corp_tax_negative_profit():
    assert corp_tax(Decimal("-5000")) == Decimal("0")

def test_corp_tax_small_profits_rate():
    # £30,000 × 19% = £5,700
    assert corp_tax(Decimal("30000")) == Decimal("5700.00")

def test_corp_tax_small_profits_at_threshold():
    # exactly £50,000 → still small profits rate
    assert corp_tax(Decimal("50000")) == Decimal("9500.00")

def test_corp_tax_main_rate():
    # £300,000 × 25% = £75,000
    assert corp_tax(Decimal("300000")) == Decimal("75000.00")

def test_corp_tax_main_rate_at_threshold():
    assert corp_tax(Decimal("250000")) == Decimal("62500.00")

def test_corp_tax_marginal_relief_between_thresholds():
    # £150,000 — effective rate must be between 19% and 25%
    tax = corp_tax(Decimal("150000"))
    assert tax > Decimal("28500")   # > 19%
    assert tax < Decimal("37500")   # < 25%

def test_corp_tax_marginal_relief_is_decimal():
    # Result should always be a Decimal, not int or float
    result = corp_tax(Decimal("100000"))
    assert isinstance(result, Decimal)

def test_corp_tax_marginal_increases_with_profit():
    # Tax should be monotonically increasing with profit
    assert corp_tax(Decimal("60000")) < corp_tax(Decimal("120000"))
    assert corp_tax(Decimal("120000")) < corp_tax(Decimal("200000"))


# ── Salary / Dividends optimiser ──────────────────────────────────────────────

def test_optimise_pay_below_personal_allowance():
    result = optimise_pay(Decimal("10000"))
    # Below personal allowance — no income tax, no employee NIC
    assert result["income_tax"] == Decimal("0")
    assert result["employee_nic"] == Decimal("0")

def test_optimise_pay_saving_is_positive_above_nic_threshold():
    # At £60k salary+dividends split always beats salary-only
    result = optimise_pay(Decimal("60000"))
    assert result["annual_saving"] > Decimal("0")

def test_optimise_pay_net_income_adds_up():
    desired = Decimal("60000")
    result = optimise_pay(desired)
    assert result["net_income"] == desired - result["total_personal_tax"]

def test_optimise_pay_salary_plus_dividends_equals_desired():
    desired = Decimal("50000")
    result = optimise_pay(desired)
    assert result["optimal_salary"] + result["optimal_dividends"] == desired

def test_optimise_pay_net_beats_salary_only():
    result = optimise_pay(Decimal("80000"))
    assert result["net_income"] > result["comparison"]["salary_only_net"]

def test_optimise_pay_zero_income():
    result = optimise_pay(Decimal("0"))
    assert result["net_income"] == Decimal("0")
    assert result["annual_saving"] == Decimal("0")

def test_optimise_pay_returns_all_keys():
    result = optimise_pay(Decimal("50000"))
    expected_keys = {
        "optimal_salary", "optimal_dividends", "income_tax", "employee_nic",
        "employer_nic", "dividend_tax", "total_personal_tax", "net_income",
        "comparison", "annual_saving",
    }
    assert expected_keys.issubset(result.keys())
