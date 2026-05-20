from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CorpTaxEstimateResponse(BaseModel):
    tax_year: int                    # e.g. 2025 = April 2024 – April 2025
    year_start: date
    year_end: date
    total_income: Decimal
    total_expenses: Decimal
    taxable_profit: Decimal
    ct_due: Decimal
    effective_rate: Decimal          # 0–1
    payment_deadline: date
    days_until_deadline: int


class VATReturnResponse(BaseModel):
    period_start: date
    period_end: date
    period_label: str                # e.g. "Q1 2025 (Jan–Mar)"
    output_vat: Decimal              # VAT charged on sales
    input_vat: Decimal               # VAT paid on purchases
    net_vat: Decimal                 # output – input (positive = you owe HMRC)
    invoice_count: int
    expense_count: int


class VATPeriodsResponse(BaseModel):
    vat_scheme: str
    periods: list[VATReturnResponse]


class SalaryComparisonResponse(BaseModel):
    salary_only_gross: Decimal
    salary_only_income_tax: Decimal
    salary_only_employee_nic: Decimal
    salary_only_employer_nic: Decimal
    salary_only_total_tax: Decimal
    salary_only_net: Decimal


class PayOptimiserResponse(BaseModel):
    optimal_salary: Decimal
    optimal_dividends: Decimal
    income_tax: Decimal
    employee_nic: Decimal
    employer_nic: Decimal
    dividend_tax: Decimal
    total_personal_tax: Decimal
    net_income: Decimal
    comparison: SalaryComparisonResponse
    annual_saving: Decimal


class DashboardSummaryResponse(BaseModel):
    tax_estimate: Decimal
