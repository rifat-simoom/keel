export interface CorpTaxEstimate {
  tax_year: number
  year_start: string
  year_end: string
  total_income: number
  total_expenses: number
  taxable_profit: number
  ct_due: number
  effective_rate: number
  payment_deadline: string
  days_until_deadline: number
}

export interface VATReturn {
  period_start: string
  period_end: string
  period_label: string
  output_vat: number
  input_vat: number
  net_vat: number
  invoice_count: number
  expense_count: number
}

export interface VATPeriodsResponse {
  vat_scheme: string
  periods: VATReturn[]
}

export interface SalaryComparison {
  salary_only_gross: number
  salary_only_income_tax: number
  salary_only_employee_nic: number
  salary_only_employer_nic: number
  salary_only_total_tax: number
  salary_only_net: number
}

export interface PayOptimiserResult {
  optimal_salary: number
  optimal_dividends: number
  income_tax: number
  employee_nic: number
  employer_nic: number
  dividend_tax: number
  total_personal_tax: number
  net_income: number
  comparison: SalaryComparison
  annual_saving: number
}
