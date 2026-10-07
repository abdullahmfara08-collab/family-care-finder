// Builds public/data/zips/<first 2 digits>.json so the app can turn a ZIP
// into a location without downloading every ZIP in the country.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { codes } = require('zipcodes')

const out = new URL('../public/data/zips/', import.meta.url)
mkdirSync(out, { recursive: true })

const chunks = {}
for (const z of Object.values(codes)) {
  if (z.country !== 'US' || !/^\d{5}$/.test(z.zip)) continue
  const key = z.zip.slice(0, 2)
  chunks[key] ??= {}
  chunks[key][z.zip] = [+z.latitude.toFixed(4), +z.longitude.toFixed(4), z.city, z.state]
}
for (const [key, zips] of Object.entries(chunks)) {
  writeFileSync(new URL(`${key}.json`, out), JSON.stringify(zips))
}
console.log(`Wrote ${Object.keys(chunks).length} ZIP files`)
