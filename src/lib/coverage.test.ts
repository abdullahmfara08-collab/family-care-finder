import { describe, expect, it } from 'vitest'
import { checkCoverage, povertyLine } from './coverage'
import { milesBetween, tileKeysAround } from './geo'

const base = { householdSize: 4, hasKids: true, pregnant: false }

describe('coverage', () => {
  it('uses the 2026 guideline for a family of four', () => {
    expect(povertyLine(4)).toBe(33000)
    expect(povertyLine(1, 'AK')).toBe(19950)
  })
  it('covers adults to 138% in expansion states', () => {
    expect(checkCoverage({ ...base, yearlyIncome: 40000, state: 'IL' })).toMatchObject({ adults: 'medicaid', kids: 'likely', clinicDiscount: 'partial' })
    expect(checkCoverage({ ...base, yearlyIncome: 50000, state: 'IL' }).adults).toBe('marketplace')
  })
  it('flags the coverage gap in non-expansion states', () => {
    expect(checkCoverage({ ...base, yearlyIncome: 20000, state: 'TX' })).toMatchObject({ adults: 'gap', kids: 'likely', clinicDiscount: 'nominal' })
    expect(checkCoverage({ ...base, yearlyIncome: 40000, state: 'TX' }).adults).toBe('marketplace')
    expect(checkCoverage({ ...base, yearlyIncome: 20000, state: 'WI' }).adults).toBe('medicaid')
  })
  it('handles kids and pregnancy', () => {
    expect(checkCoverage({ ...base, yearlyIncome: 90000, state: 'CA' }).kids).toBe('maybe')
    expect(checkCoverage({ ...base, yearlyIncome: 150000, state: 'CA' }).kids).toBe('marketplace')
    expect(checkCoverage({ ...base, hasKids: false, yearlyIncome: 30000 }).kids).toBeNull()
    expect(checkCoverage({ ...base, pregnant: true, yearlyIncome: 60000 }).pregnant).toBe('maybe')
  })
})

describe('geo', () => {
  it('measures distance in miles', () => {
    const d = milesBetween({ lat: 40.7484, lon: -73.9967 }, { lat: 34.0522, lon: -118.2437 })
    expect(Math.round(d)).toBeGreaterThan(2440)
    expect(Math.round(d)).toBeLessThan(2460)
  })
  it('returns nine tiles around a point', () => {
    const keys = tileKeysAround(40.5, -73.5)
    expect(keys).toHaveLength(9)
    expect(keys).toContain('40_-74')
    expect(keys).toContain('41_-73')
  })
})
