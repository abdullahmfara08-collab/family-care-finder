export type Clinic = {
  id: string
  name: string
  org: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  website: string
  lat: number
  lon: number
  kind: 'health_center' | 'lookalike' | 'sample'
  slidingScale: boolean
  acceptsMedicaid: boolean
  acceptsMedicare: boolean
  servesUninsured: boolean
}

export type Meta = {
  demo: boolean
  source: string
  sourceUrl: string
  lastChecked: string | null
  count: number
  tiles: string[]
}

export type Place = { lat: number; lon: number; label: string; state?: string }

export type Insurance = 'medicaid' | 'chip' | 'medicare' | 'marketplace' | 'uninsured' | 'unsure'
