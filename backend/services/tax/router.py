import logging
from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.middleware.auth import CurrentUser, require_auth

from .database import get_db
from . import queries, calculators
from .schemas import (
    CorpTaxEstimateResponse,
    DashboardSummaryResponse,
    PayOptimiserResponse,
    SalaryComparisonResponse,
    VATPeriodsResponse,
    VATReturnResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["tax"])


async def _get_company(db: AsyncSession, user: CurrentUser) -> UUID:
    company_id = await queries.get_company_id_for_user(db, user.sub)
    if not company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return company_id


def _tax_year_bounds(year: int) -> tuple[date, date]:
    """UK tax year: 6 April YEAR-1 → 5 April YEAR."""
    return date(year - 1, 4, 6), date(year, 4, 5)


def _ct_year_bounds(year_end_month: int) -> tuple[date, int]:
    """Company tax year ending in month year_end_month of the current year."""
    today = date.today()
    year_end = date(today.year, year_end_month, 1)
    # Adjust to last day of month
    if year_end_month == 12:
        year_end = date(today.year, 12, 31)
    else:
        year_end = date(today.year, year_end_month + 1, 1) - timedelta(days=1)

    if year_end > today:
        year_end = date(today.year - 1, year_end.month, year_end.day)

    year_start = date(year_end.year - 1, year_end.month, year_end.day) + timedelta(days=1)
    ct_year = year_end.year
    return year_start, year_end, ct_year


def _vat_periods(stagger: str, count: int = 4) -> list[tuple[date, date, str]]:
    """Return the last `count` completed VAT quarters for a given stagger group."""
    # Stagger A: quarters end Jan/Apr/Jul/Oct
    # Stagger B: quarters end Feb/May/Aug/Nov
    # Stagger C: quarters end Mar/Jun/Sep/Dec
    stagger_end_months = {
        "A": [1, 4, 7, 10],
        "B": [2, 5, 8, 11],
        "C": [3, 6, 9, 12],
    }
    end_months = stagger_end_months.get(stagger.upper(), [3, 6, 9, 12])
    today = date.today()
    periods = []

    # Work backwards from today to find completed quarters
    for _ in range(count * 4):  # scan enough months
        if len(periods) >= count:
            break
        for month in sorted(end_months, reverse=True):
            year = today.year
            quarter_end = date(year, month, 1)
            # last day of end month
            if month == 12:
                quarter_end = date(year, 12, 31)
            else:
                quarter_end = date(year, month + 1, 1) - timedelta(days=1)

            if quarter_end < today and quarter_end not in [p[1] for p in periods]:
                # quarter start = first day 3 months before end month
                start_month = month - 2
                start_year = year
                if start_month <= 0:
                    start_month += 12
                    start_year -= 1
                quarter_start = date(start_year, start_month, 1)
                label = f"{quarter_start.strftime('%b')}–{quarter_end.strftime('%b %Y')}"
                periods.append((quarter_start, quarter_end, label))
                if len(periods) >= count:
                    break
        today = date(today.year - 1, today.month, today.day)

    return sorted(periods, key=lambda p: p[0])


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> DashboardSummaryResponse:
    """Lightweight summary for the dashboard — just the running CT estimate."""
    company_id = await _get_company(db, current_user)
    settings = await queries.get_company_settings(db, company_id)
    year_end_month = (settings or {}).get("year_end_month") or 3
    year_start, year_end, _ = _ct_year_bounds(year_end_month)

    invoices = await queries.get_paid_invoices_for_year(db, company_id, year_start, year_end)
    expenses = await queries.get_expenses_for_year(db, company_id, year_start, year_end)

    total_income = sum(Decimal(str(i["subtotal"])) for i in invoices)
    total_expenses = sum(abs(Decimal(str(e["amount"]))) for e in expenses)
    taxable_profit = max(Decimal("0"), total_income - total_expenses)
    ct_due = calculators.corp_tax(taxable_profit)

    return DashboardSummaryResponse(tax_estimate=ct_due)


@router.get("/tax/corp-tax/estimate", response_model=CorpTaxEstimateResponse)
async def get_corp_tax_estimate(
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> CorpTaxEstimateResponse:
    company_id = await _get_company(db, current_user)
    settings = await queries.get_company_settings(db, company_id)
    year_end_month = (settings or {}).get("year_end_month") or 3

    year_start, year_end, ct_year = _ct_year_bounds(year_end_month)

    invoices = await queries.get_paid_invoices_for_year(db, company_id, year_start, year_end)
    expenses = await queries.get_expenses_for_year(db, company_id, year_start, year_end)

    # Income = sum of invoice subtotals (net of VAT)
    total_income = sum(Decimal(str(i["subtotal"])) for i in invoices)
    # Expenses = absolute value of negative transactions flagged as expense
    total_expenses = sum(abs(Decimal(str(e["amount"]))) for e in expenses)

    taxable_profit = max(Decimal("0"), total_income - total_expenses)
    ct_due = calculators.corp_tax(taxable_profit)
    effective_rate = (ct_due / taxable_profit) if taxable_profit > 0 else Decimal("0")

    # CT payment deadline: 9 months + 1 day after year end
    payment_deadline = date(year_end.year, year_end.month, year_end.day) + timedelta(days=274)
    days_until = (payment_deadline - date.today()).days

    return CorpTaxEstimateResponse(
        tax_year=ct_year,
        year_start=year_start,
        year_end=year_end,
        total_income=total_income.quantize(Decimal("0.01")),
        total_expenses=total_expenses.quantize(Decimal("0.01")),
        taxable_profit=taxable_profit.quantize(Decimal("0.01")),
        ct_due=ct_due,
        effective_rate=effective_rate.quantize(Decimal("0.0001")),
        payment_deadline=payment_deadline,
        days_until_deadline=days_until,
    )


@router.get("/tax/vat/periods", response_model=VATPeriodsResponse)
async def get_vat_periods(
    count: int = Query(default=4, ge=1, le=8),
    current_user: CurrentUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> VATPeriodsResponse:
    company_id = await _get_company(db, current_user)
    settings = await queries.get_company_settings(db, company_id)
    vat_scheme = (settings or {}).get("vat_scheme") or "cash"
    vat_stagger = (settings or {}).get("vat_stagger") or "A"

    periods = _vat_periods(vat_stagger, count)
    results = []

    for p_start, p_end, label in periods:
        inv = await queries.get_invoices_for_vat_period(db, company_id, p_start, p_end, vat_scheme)
        exp = await queries.get_input_vat_for_period(db, company_id, p_start, p_end)

        output_vat = sum(Decimal(str(i["vat_amount"] or 0)) for i in inv)
        input_vat = sum(Decimal(str(e["vat_amount"] or 0)) for e in exp)
        net_vat = output_vat - input_vat

        results.append(VATReturnResponse(
            period_start=p_start,
            period_end=p_end,
            period_label=label,
            output_vat=output_vat.quantize(Decimal("0.01")),
            input_vat=input_vat.quantize(Decimal("0.01")),
            net_vat=net_vat.quantize(Decimal("0.01")),
            invoice_count=len(inv),
            expense_count=len(exp),
        ))

    return VATPeriodsResponse(vat_scheme=vat_scheme, periods=results)


@router.get("/tax/salary-optimiser", response_model=PayOptimiserResponse)
async def salary_optimiser(
    desired_income: Decimal = Query(..., description="Desired annual gross income in GBP"),
) -> PayOptimiserResponse:
    result = calculators.optimise_pay(desired_income)
    return PayOptimiserResponse(
        optimal_salary=result["optimal_salary"],
        optimal_dividends=result["optimal_dividends"],
        income_tax=result["income_tax"],
        employee_nic=result["employee_nic"],
        employer_nic=result["employer_nic"],
        dividend_tax=result["dividend_tax"],
        total_personal_tax=result["total_personal_tax"],
        net_income=result["net_income"],
        comparison=SalaryComparisonResponse(**result["comparison"]),
        annual_saving=result["annual_saving"],
    )
