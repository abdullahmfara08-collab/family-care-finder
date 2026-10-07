import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS build script helper
import { siteKey as buildKey } from '../../scripts/lib/address.mjs'
import { siteKey } from './data'

describe('plan network lookup key', () => {
  it('matches the key the build script writes', () => {
    for (const [zip, addr] of [['60623-2045', '3059 W 26th St '], ['60608', '1850 W 21st Pl Ste 2']]) {
      expect(siteKey(zip, addr)).toBe(buildKey(zip, addr))
    }
  })
})
