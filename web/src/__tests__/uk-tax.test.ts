import { describe, it, expect } from 'vitest'
import { estimateCorpTax, ukTaxYear, UK_TAX } from '@keel/utils'

describe('estimateCorpTax', () => {
  it('returns 0 for zero profit', () => expect(estimateCorpTax(0)).toBe(0))
  it('returns 0 for negative profit', () => expect(estimateCorpTax(-1000)).toBe(0))

  it('applies small profits rate (19%) at £30k', () => {
    expect(estimateCorpTax(30_000)).toBeCloseTo(5_700)
  })

  it('applies small profits rate at threshold £50k', () => {
    expect(estimateCorpTax(50_000)).toBeCloseTo(9_500)
  })

  it('applies main rate (25%) at £300k', () => {
    expect(estimateCorpTax(300_000)).toBe(75_000)
  })

  it('applies marginal relief between thresholds', () => {
    const tax = estimateCorpTax(150_000)
    expect(tax).toBeGreaterThan(28_500)  // > 19%
    expect(tax).toBeLessThan(37_500)     // < 25%
  })

  it('is monotonically increasing with profit', () => {
    expect(estimateCorpTax(40_000)).toBeLessThan(estimateCorpTax(80_000))
    expect(estimateCorpTax(80_000)).toBeLessThan(estimateCorpTax(200_000))
  })
})

describe('ukTaxYear', () => {
  it('returns current year for May (post-April)', () => {
    expect(ukTaxYear(new Date('2026-05-01'))).toBe(2026)
  })
  it('returns previous year for March (pre-April)', () => {
    expect(ukTaxYear(new Date('2026-03-31'))).toBe(2025)
  })
  it('returns current year for April 6 (new tax year starts)', () => {
    expect(ukTaxYear(new Date('2026-04-06'))).toBe(2026)
  })
  it('returns previous year for April 5 (last day of old tax year)', () => {
    expect(ukTaxYear(new Date('2026-04-05'))).toBe(2025)
  })
})

describe('UK_TAX constants', () => {
  it('personal allowance is £12,570', () => {
    expect(UK_TAX.PERSONAL_ALLOWANCE).toBe(12_570)
  })
  it('VAT standard rate is 20%', () => {
    expect(UK_TAX.VAT_STANDARD_RATE).toBe(0.2)
  })
  it('small profits CT threshold is £50k', () => {
    expect(UK_TAX.CORP_TAX_SMALL_PROFITS_THRESHOLD).toBe(50_000)
  })
})
