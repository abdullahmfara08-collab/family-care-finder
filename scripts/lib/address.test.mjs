import { describe, expect, it } from 'vitest'
import { normalizeStreet, sameStreet, siteKey } from './address.mjs'

describe('address matching', () => {
  it('normalizes suffixes, directions and suites', () => {
    expect(normalizeStreet('3059 West 26th Street, Suite 2')).toBe('3059 w 26th st')
    expect(normalizeStreet('3059 W. 26TH ST')).toBe('3059 w 26th st')
  })
  it('matches the same building written differently', () => {
    expect(sameStreet('3059 W 26th St', '3059 West 26th Street Ste 100')).toBe(true)
    expect(sameStreet('3750 W Cermak Rd', '3750 Cermak')).toBe(true)
  })
  it('does not match different buildings', () => {
    expect(sameStreet('3059 W 26th St', '3061 W 26th St')).toBe(false)
    expect(sameStreet('3059 W 26th St', '3059 W 25th St')).toBe(false)
    expect(sameStreet('', '3059 W 26th St')).toBe(false)
  })
  it('builds the lookup key from the HRSA address', () => {
    expect(siteKey('60623-1234', ' 3059 W 26th St ')).toBe('60623|3059 w 26th st')
  })
})
