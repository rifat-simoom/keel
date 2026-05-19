"""Pure tax calculation logic — all Decimal, no I/O."""
from decimal import Decimal

from . import uk_rates as R


# ── Corporation Tax ────────────────────────────────────────────────────────────

def corp_tax(taxable_profit: Decimal) -> Decimal:
    """CT liability for the given taxable profit using 2024/25 rates."""
    if taxable_profit <= 0:
        return Decimal("0")
    if taxable_profit <= R.CT_SMALL_PROFITS_THRESHOLD:
        return (taxable_profit * R.CT_SMALL_RATE).quantize(Decimal("0.01"))
    if taxable_profit >= R.CT_MAIN_THRESHOLD:
        return (taxable_profit * R.CT_MAIN_RATE).quantize(Decimal("0.01"))
    # Marginal relief: main rate × profit – marginal_fraction × (upper – profit)
    upper = R.CT_MAIN_THRESHOLD
    ct = taxable_profit * R.CT_MAIN_RATE - R.CT_MARGINAL_FRACTION * (upper - taxable_profit)
    return ct.quantize(Decimal("0.01"))


# ── Salary / Dividends optimiser ──────────────────────────────────────────────

def _income_tax_on_salary(salary: Decimal) -> Decimal:
    taxable = max(Decimal("0"), salary - R.PERSONAL_ALLOWANCE)
    if taxable <= 0:
        return Decimal("0")
    basic = min(taxable, R.BASIC_RATE_LIMIT - R.PERSONAL_ALLOWANCE)
    higher = max(Decimal("0"), taxable - (R.BASIC_RATE_LIMIT - R.PERSONAL_ALLOWANCE))
    return (basic * R.INCOME_TAX_BASIC + higher * R.INCOME_TAX_HIGHER).quantize(Decimal("0.01"))


def _employee_nic(salary: Decimal) -> Decimal:
    main = max(Decimal("0"), min(salary, R.NIC_UPPER_EARNINGS) - R.NIC_PRIMARY_THRESHOLD)
    upper = max(Decimal("0"), salary - R.NIC_UPPER_EARNINGS)
    return (main * R.NIC_EMPLOYEE_MAIN + upper * R.NIC_EMPLOYEE_UPPER).quantize(Decimal("0.01"))


def _employer_nic(salary: Decimal) -> Decimal:
    return (max(Decimal("0"), salary - R.NIC_SECONDARY_THRESHOLD) * R.NIC_EMPLOYER).quantize(Decimal("0.01"))


def _dividend_tax(dividends: Decimal, salary: Decimal) -> Decimal:
    if dividends <= 0:
        return Decimal("0")
    taxable = max(Decimal("0"), dividends - R.DIVIDEND_ALLOWANCE)
    if taxable <= 0:
        return Decimal("0")
    # Dividends sit on top of salary for band purposes
    remaining_basic = max(Decimal("0"), R.BASIC_RATE_LIMIT - salary)
    div_basic = min(taxable, remaining_basic)
    div_higher = max(Decimal("0"), taxable - remaining_basic)
    return (div_basic * R.DIV_BASIC_RATE + div_higher * R.DIV_HIGHER_RATE).quantize(Decimal("0.01"))


def optimise_pay(desired_income: Decimal) -> dict:
    """
    Return the optimal salary + dividends split for a sole Ltd director.
    Also returns a salary-only comparison to show the saving.
    """
    desired = max(Decimal("0"), desired_income)

    # ── Strategy A: salary only ───────────────────────────────────────────────
    it_a = _income_tax_on_salary(desired)
    enic_a = _employee_nic(desired)
    employer_nic_a = _employer_nic(desired)
    total_personal_tax_a = it_a + enic_a
    net_a = desired - total_personal_tax_a

    # ── Strategy B: optimal salary + dividends ────────────────────────────────
    # Salary at NIC primary threshold (£12,570) — no employee NIC, no income tax
    optimal_salary = min(R.NIC_PRIMARY_THRESHOLD, desired)
    dividends = max(Decimal("0"), desired - optimal_salary)

    it_b = _income_tax_on_salary(optimal_salary)       # zero
    enic_b = _employee_nic(optimal_salary)              # zero
    employer_nic_b = _employer_nic(optimal_salary)     # ~£479/yr
    div_tax = _dividend_tax(dividends, optimal_salary)
    total_personal_tax_b = it_b + enic_b + div_tax
    net_b = desired - total_personal_tax_b

    return {
        "optimal_salary": optimal_salary,
        "optimal_dividends": dividends,
        "income_tax": it_b,
        "employee_nic": enic_b,
        "employer_nic": employer_nic_b,
        "dividend_tax": div_tax,
        "total_personal_tax": total_personal_tax_b,
        "net_income": net_b,
        "comparison": {
            "salary_only_gross": desired,
            "salary_only_income_tax": it_a,
            "salary_only_employee_nic": enic_a,
            "salary_only_employer_nic": employer_nic_a,
            "salary_only_total_tax": total_personal_tax_a,
            "salary_only_net": net_a,
        },
        "annual_saving": net_b - net_a,
    }
