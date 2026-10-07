import { describe, expect, it } from 'vitest'
import { checkCoverage, povertyLine } from './coverage'
import { milesBetween, tileKeysAround } from './geo'

describe('coverage', () => {
  it('uses the 2025 guideline for a family of four', () => {
    expect(povertyLine(4)).toBe(32150)
    expect(povertyLine(4, 'AK')).toBe(40190)
  })
  it('puts families into the right tier', () => {
    expect(checkCoverage(30000, 4)).toMatchObject({ tier: 'medicaid', clinicDiscount: 'nominal' })
    expect(checkCoverage(55000, 4)).toMatchObject({ tier: 'kids', clinicDiscount: 'partial' })
    expect(checkCoverage(90000, 4)).toMatchObject({ tier: 'chip', clinicDiscount: 'none' })
    expect(checkCoverage(150000, 4).tier).toBe('marketplace')
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
