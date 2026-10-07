// Turns HRSA's health center site list into small map tiles the app loads
// on demand. Run with the CSV from
// https://data.hrsa.gov/data/download (Health Center Service Delivery and
// Look-Alike Sites):
//
//   node scripts/build-clinics.mjs path/to/Health_Center_Service_Delivery_and_LookAlike_Sites.csv
//
// Every HRSA-funded health center must offer a sliding fee scale and serve
// people regardless of ability to pay, so those flags are set from the source.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/build-clinics.mjs <hrsa-sites.csv>')
  process.exit(1)
}

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'))
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
// HRSA has renamed columns over the years, so each field accepts several names.
const columns = {
  name: ['Site Name'],
  org: ['Health Center Name'],
  address: ['Site Address'],
  city: ['Site City'],
  state: ['Site State Abbreviation'],
  zip: ['Site Postal Code'],
  phone: ['Site Telephone Number'],
  website: ['Site Web Address'],
  lon: ['Geocoding Artifact Address Primary X Coordinate'],
  lat: ['Geocoding Artifact Address Primary Y Coordinate'],
  status: ['Site Status Description'],
  type: ['Health Center Type Description', 'Health Center Type'],
  hours: ['Operating Hours per Week'],
}
const index = {}
for (const [key, names] of Object.entries(columns)) {
  index[key] = header.findIndex(h => names.some(n => norm(h) === norm(n)))
}
const missing = ['name', 'address', 'city', 'state', 'zip', 'lat', 'lon'].filter(k => index[k] < 0)
if (missing.length) {
  console.error(`Missing columns: ${missing.join(', ')}\nHeader was: ${header.join(' | ')}`)
  process.exit(1)
}
const get = (row, key) => (index[key] >= 0 ? (row[index[key]] ?? '').trim() : '')

const tiles = {}
let count = 0
for (const row of rows) {
  const lat = parseFloat(get(row, 'lat')), lon = parseFloat(get(row, 'lon'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
  const status = get(row, 'status')
  if (status && !/^active/i.test(status)) continue
  const clinic = {
    id: `hrsa-${count}`,
    name: get(row, 'name'),
    org: get(row, 'org'),
    address: get(row, 'address'),
    city: get(row, 'city'),
    state: get(row, 'state'),
    zip: get(row, 'zip').slice(0, 5),
    phone: get(row, 'phone'),
    website: get(row, 'website'),
    lat: +lat.toFixed(5),
    lon: +lon.toFixed(5),
    kind: /look-?alike/i.test(get(row, 'type')) ? 'lookalike' : 'health_center',
    slidingScale: true,
    acceptsMedicaid: true,
    acceptsMedicare: true,
    servesUninsured: true,
  }
  const key = `${Math.floor(lat)}_${Math.floor(lon)}`
  ;(tiles[key] ??= []).push(clinic)
  count++
}

const out = new URL('../public/data/clinics/', import.meta.url)
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
for (const [key, list] of Object.entries(tiles)) {
  writeFileSync(new URL(`${key}.json`, out), JSON.stringify(list))
}
const meta = {
  demo: false,
  source: 'HRSA Health Center Service Delivery and Look-Alike Sites',
  sourceUrl: 'https://data.hrsa.gov/data/download',
  lastChecked: new Date().toISOString().slice(0, 10),
  count,
  tiles: Object.keys(tiles),
}
writeFileSync(new URL('../public/data/meta.json', import.meta.url), JSON.stringify(meta, null, 2))
console.log(`Wrote ${count} sites in ${Object.keys(tiles).length} tiles`)
