// UK tax constants for the 2024/25 tax year
export const UK_TAX = {
  PERSONAL_ALLOWANCE: 12_570,
  BASIC_RATE_LIMIT: 50_270,
  HIGHER_RATE_LIMIT: 125_140,

  BASIC_RATE: 0.2,
  HIGHER_RATE: 0.4,
  ADDITIONAL_RATE: 0.45,

  NIC_PRIMARY_THRESHOLD: 12_570,
  NIC_UPPER_EARNINGS_LIMIT: 50_270,
  NIC_EMPLOYEE_MAIN_RATE: 0.08,
  NIC_EMPLOYEE_UPPER_RATE: 0.02,

  CORP_TAX_SMALL_PROFITS_THRESHOLD: 50_000,
  CORP_TAX_MAIN_THRESHOLD: 250_000,
  CORP_TAX_SMALL_RATE: 0.19,
  CORP_TAX_MAIN_RATE: 0.25,

  DIVIDEND_ALLOWANCE: 500,
  DIVIDEND_BASIC_RATE: 0.0875,
  DIVIDEND_HIGHER_RATE: 0.3375,
  DIVIDEND_ADDITIONAL_RATE: 0.3938,

  VAT_REGISTRATION_THRESHOLD: 90_000,
  VAT_STANDARD_RATE: 0.2,
  VAT_REDUCED_RATE: 0.05,
} as const

export function estimateCorpTax(profit: number): number {
  if (profit <= 0) return 0
  if (profit <= UK_TAX.CORP_TAX_SMALL_PROFITS_THRESHOLD) {
    return profit * UK_TAX.CORP_TAX_SMALL_RATE
  }
  if (profit >= UK_TAX.CORP_TAX_MAIN_THRESHOLD) {
    return profit * UK_TAX.CORP_TAX_MAIN_RATE
  }
  // Marginal relief between thresholds
  const fullRate = profit * UK_TAX.CORP_TAX_MAIN_RATE
  const relief =
    ((UK_TAX.CORP_TAX_MAIN_THRESHOLD - profit) /
      (UK_TAX.CORP_TAX_MAIN_THRESHOLD - UK_TAX.CORP_TAX_SMALL_PROFITS_THRESHOLD)) *
    (UK_TAX.CORP_TAX_MAIN_RATE - UK_TAX.CORP_TAX_SMALL_RATE) *
    UK_TAX.CORP_TAX_MAIN_THRESHOLD
  return fullRate - relief
}

export function ukTaxYear(date: Date = new Date()): number {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
}
