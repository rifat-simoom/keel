import { describe, it, expect } from 'vitest'
import { penceToGBP, gbpToPence, calculateVat, calculateSubtotal } from '@keel/utils'

describe('penceToGBP', () => {
  it('converts 100p to £1', () => expect(penceToGBP(100)).toBe(1))
  it('converts 0p to £0', () => expect(penceToGBP(0)).toBe(0))
  it('converts 250p to £2.50', () => expect(penceToGBP(250)).toBe(2.5))
})

describe('gbpToPence', () => {
  it('converts £1 to 100p', () => expect(gbpToPence(1)).toBe(100))
  it('converts £0 to 0p', () => expect(gbpToPence(0)).toBe(0))
  it('rounds correctly', () => expect(gbpToPence(1.506)).toBe(151))
  it('handles large amounts', () => expect(gbpToPence(10000)).toBe(1_000_000))
})

describe('calculateVat', () => {
  it('calculates 20% VAT on £100', () => expect(calculateVat(100, 0.2)).toBe(20))
  it('calculates 5% VAT on £100', () => expect(calculateVat(100, 0.05)).toBe(5))
  it('calculates 0% VAT', () => expect(calculateVat(100, 0)).toBe(0))
  it('handles fractional amounts', () => expect(calculateVat(33.33, 0.2)).toBe(6.67))
})

describe('calculateSubtotal', () => {
  it('sums line items', () => {
    expect(calculateSubtotal([
      { quantity: 2, unit_price: 50 },
      { quantity: 1, unit_price: 100 },
    ])).toBe(200)
  })
  it('returns 0 for empty list', () => expect(calculateSubtotal([])).toBe(0))
  it('handles single item', () => {
    expect(calculateSubtotal([{ quantity: 3, unit_price: 33.33 }])).toBeCloseTo(99.99)
  })
})
