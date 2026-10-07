// Checks which health centers are listed in an insurer's public provider
// directory and writes public/data/networks/<STATE>.json for the site.
//
// Today: Centene's FHIR Plan-Net directory, which covers Meridian, Illinois's
// largest Medicaid plan. It needs no key. Run after build-clinics.mjs:
//   node scripts/build-plan-networks.mjs            (all Illinois sites)
//   node scripts/build-plan-networks.mjs 60623 60608 (only these ZIPs, for testing)
//
// Requests are plain, one at a time, with a short pause, and cached in
// hrsa-source/centene-cache/ so a rerun the same day doesn't hit the server again.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { sameStreet, siteKey } from './lib/address.mjs'

const BASE = 'https://iopc-pd.api.centene.com/iopc/pd/fhir/providerdirectory'
const STATE = 'IL'
// Directory network names we show, mapped to the plan choice in the app.
const NETWORKS = { 'Medicaid IL Meridian': 'meridian', 'YouthCare IL Meridian': 'youthcare' }
const NETWORK_EXT = /network-reference$/
const MAX_PAGES = 30
const PAUSE_MS = 250

const clinicsDir = new URL('../public/data/clinics/', import.meta.url)
const cacheDir = new URL('../hrsa-source/centene-cache/', import.meta.url)
const outDir = new URL('../public/data/networks/', import.meta.url)
mkdirSync(cacheDir, { recursive: true })
mkdirSync(outDir, { recursive: true })

const today = new Date().toISOString().slice(0, 10)
const sleep = ms => new Promise(r => setTimeout(r, ms))
let requests = 0

async function getBundle(url) {
  const file = new URL(createHash('sha1').update(today + url).digest('hex') + '.json', cacheDir)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sleep(PAUSE_MS * attempt)
    requests++
    const res = await fetch(url, { headers: { Accept: 'application/fhir+json' } })
    if (res.ok) {
      const body = await res.json()
      writeFileSync(file, JSON.stringify(body))
      return body
    }
    if (res.status < 500 && res.status !== 429) throw new Error(`${res.status} for ${url}`)
  }
  throw new Error(`gave up on ${url}`)
}

async function* resources(url) {
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const bundle = await getBundle(url)
    for (const e of bundle.entry ?? []) if (e.resource) yield e.resource
    url = bundle.link?.find(l => l.relation === 'next')?.url
  }
}

const orgNames = new Map()
async function networkName(ref) {
  if (ref.display) return ref.display
  if (!orgNames.has(ref.reference)) {
    const org = await getBundle(`${BASE}/${ref.reference}`).catch(() => null)
    orgNames.set(ref.reference, org?.name ?? '')
  }
  return orgNames.get(ref.reference)
}

async function networksAt(locationId) {
  const found = new Set()
  for await (const role of resources(`${BASE}/PractitionerRole?location=Location/${locationId}`)) {
    for (const ext of role.extension ?? []) {
      if (NETWORK_EXT.test(ext.url ?? '') && ext.valueReference) {
        const plan = NETWORKS[await networkName(ext.valueReference)]
        if (plan) found.add(plan)
      }
    }
  }
  return found
}

// Health centers in the state, grouped by ZIP.
const onlyZips = new Set(process.argv.slice(2))
const byZip = new Map()
for (const f of readdirSync(clinicsDir)) {
  for (const c of JSON.parse(readFileSync(new URL(f, clinicsDir), 'utf8'))) {
    if (c.state !== STATE || (onlyZips.size && !onlyZips.has(c.zip))) continue
    if (!byZip.has(c.zip)) byZip.set(c.zip, [])
    byZip.get(c.zip).push(c)
  }
}

const sites = {}
let checked = 0
let listed = 0
for (const [zip, clinics] of byZip) {
  try {
    const locations = []
    for await (const loc of resources(`${BASE}/Location?address-postalcode=${zip}`)) {
      if (loc.address?.line?.[0]) locations.push({ id: loc.id, street: loc.address.line[0] })
    }
    for (const c of clinics) {
      checked++
      const plans = new Set()
      for (const loc of locations.filter(l => sameStreet(l.street, c.address))) {
        for (const p of await networksAt(loc.id)) plans.add(p)
      }
      if (plans.size) {
        sites[siteKey(c.zip, c.address)] = [...plans].sort()
        listed++
      }
    }
  } catch (err) {
    console.warn(`ZIP ${zip}: ${err.message}`)
  }
  process.stdout.write(`\r${checked} sites checked, ${listed} listed, ${requests} requests`)
}

const out = {
  state: STATE,
  checked: today,
  source: "Meridian's public provider directory (Centene)",
  sourceUrl: BASE,
  plans: Object.values(NETWORKS),
  sites,
}
writeFileSync(new URL(`${STATE}.json`, outDir), JSON.stringify(out))
console.log(`\nWrote networks/${STATE}.json: ${listed} of ${checked} sites listed.`)
