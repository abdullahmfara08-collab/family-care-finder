import type { Clinic, Meta, Networks, Place } from '../types'
import { milesBetween, tileKeysAround } from './geo'

const base = import.meta.env.BASE_URL

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${base}data/${path}`)
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

let metaPromise: Promise<Meta | null> | undefined
export const loadMeta = () => (metaPromise ??= getJson<Meta>('meta.json'))

export async function placeForZip(zip: string): Promise<Place | null> {
  if (!/^\d{5}$/.test(zip)) return null
  const chunk = await getJson<Record<string, [number, number, string, string]>>(`zips/${zip.slice(0, 2)}.json`)
  const hit = chunk?.[zip]
  return hit ? { lat: hit[0], lon: hit[1], label: `${hit[2]}, ${hit[3]} ${zip}`, state: hit[3] } : null
}

export type Result = Clinic & { miles: number }

export async function clinicsNear(place: Place, maxMiles = 25): Promise<Result[]> {
  const meta = await loadMeta()
  const clinics = meta?.demo ? sampleClinics(place) : await loadTiles(place, meta)
  const networks = await networksFor(clinics)
  return clinics
    .map(c => ({ ...c, plans: networks.get(c.state)?.sites[siteKey(c.zip, c.address)], miles: milesBetween(place, c) }))
    .filter(c => c.miles <= maxMiles)
    .sort((a, b) => a.miles - b.miles)
}

// Must match siteKey in scripts/lib/address.mjs.
export const siteKey = (zip: string, address: string) => `${zip.slice(0, 5)}|${address.trim().toLowerCase()}`

// Plan networks are published per state, and only for states we've checked;
// a missing file just means no plan labels.
const networkCache = new Map<string, Promise<Networks | null>>()
export function loadNetworks(state: string) {
  if (!networkCache.has(state)) networkCache.set(state, getJson<Networks>(`networks/${state}.json`))
  return networkCache.get(state)!
}
const NETWORK_STATES = new Set(['IL'])

async function networksFor(clinics: Clinic[]) {
  const states = [...new Set(clinics.map(c => c.state))].filter(s => NETWORK_STATES.has(s))
  const loaded = await Promise.all(states.map(async s => [s, await loadNetworks(s)] as const))
  return new Map(loaded.filter((e): e is readonly [string, Networks] => e[1] !== null))
}

async function loadTiles(place: Place, meta: Meta | null) {
  const known = new Set(meta?.tiles ?? [])
  const keys = tileKeysAround(place.lat, place.lon).filter(k => known.has(k))
  const tiles = await Promise.all(keys.map(k => getJson<Clinic[]>(`clinics/${k}.json`)))
  return tiles.flatMap(t => t ?? [])
}

// Until real data is loaded, show clearly labeled sample clinics around the
// searched place so every screen can be tried.
function sampleClinics(place: Place): Clinic[] {
  const offsets = [[0.02, 0.01], [-0.03, 0.04], [0.06, -0.05], [-0.08, -0.02], [0.1, 0.09]]
  return offsets.map(([dLat, dLon], i) => ({
    id: `sample-${i}`,
    name: `Sample Community Health Center ${i + 1}`,
    org: 'Sample data',
    address: `${100 + i * 25} Example Street`,
    city: place.label.split(',')[0],
    state: place.state ?? '',
    zip: '',
    phone: '',
    website: '',
    lat: place.lat + dLat,
    lon: place.lon + dLon,
    kind: 'sample',
    slidingScale: true,
    acceptsMedicaid: true,
    acceptsMedicare: i !== 2,
    servesUninsured: true,
  }))
}
