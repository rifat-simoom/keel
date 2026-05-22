import { describe, it, expect } from 'vitest'
import { addDays, isOverdue } from '@keel/utils'

describe('addDays', () => {
  it('adds days correctly', () => {
    expect(addDays('2026-01-01', 30)).toBe('2026-01-31')
  })
  it('crosses month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })
  it('crosses year boundary', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })
  it('adding 0 returns same date', () => {
    expect(addDays('2026-05-20', 0)).toBe('2026-05-20')
  })
})

describe('isOverdue', () => {
  it('past date is overdue', () => {
    expect(isOverdue('2020-01-01')).toBe(true)
  })
  it('far future date is not overdue', () => {
    expect(isOverdue('2099-12-31')).toBe(false)
  })
})
