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
  setting?: string
  // Insurer networks this site is listed in (from public provider directories)
  plans?: Plan[]
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

// Specific Medicaid health plans we can check against a public directory.
export type Plan = 'meridian' | 'youthcare'

export type Networks = {
  state: string
  checked: string
  source: string
  sourceUrl: string
  plans: Plan[]
  sites: Record<string, Plan[]>
}
