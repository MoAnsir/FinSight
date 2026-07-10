import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats positive GBP amounts', () => {
    expect(formatCurrency(1234.56)).toBe('£1,234.56')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-42.5)).toBe('-£42.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('£0.00')
  })

  it('accepts a custom currency', () => {
    expect(formatCurrency(100, 'USD')).toMatch(/\$100/)
  })
})

describe('formatDate', () => {
  it('formats a date string in en-GB style', () => {
    // 2024-03-15 → "15 Mar 2024"
    expect(formatDate('2024-03-15')).toBe('15 Mar 2024')
  })

  it('accepts a Date object', () => {
    expect(formatDate(new Date('2024-01-01'))).toBe('1 Jan 2024')
  })
})
