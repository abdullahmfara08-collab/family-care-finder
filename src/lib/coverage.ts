// 2026 HHS poverty guidelines. Update each January from
// https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
const GUIDELINES = {
  contiguous: { base: 15960, perPerson: 5680 },
  AK: { base: 19950, perPerson: 7100 },
  HI: { base: 18360, perPerson: 6530 },
} as const
export const GUIDELINE_YEAR = 2026

// States that have not adopted the ACA Medicaid expansion (KFF, October 2026).
// Wisconsin covers adults up to 100% of poverty without expanding.
export const NON_EXPANSION = new Set(['AL', 'FL', 'GA', 'KS', 'MS', 'SC', 'TN', 'TX', 'WI', 'WY'])

export const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
  MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
}

export function povertyLine(householdSize: number, state?: string) {
  const g = state === 'AK' || state === 'HI' ? GUIDELINES[state] : GUIDELINES.contiguous
  return g.base + g.perPerson * (Math.max(1, householdSize) - 1)
}

export function percentOfPoverty(yearlyIncome: number, householdSize: number, state?: string) {
  return Math.round((yearlyIncome / povertyLine(householdSize, state)) * 100)
}

export type CoverageInput = {
  yearlyIncome: number
  householdSize: number
  state?: string
  hasKids: boolean
  pregnant: boolean
}

// A rough guide only: exact limits differ by state, and the official application decides.
export type CoverageResult = {
  percent: number
  adults: 'medicaid' | 'gap' | 'marketplace'
  kids: 'likely' | 'maybe' | 'marketplace' | null
  pregnant: 'likely' | 'maybe' | null
  // HRSA health centers discount fully at or below 100% and partly up to 200%.
  clinicDiscount: 'nominal' | 'partial' | 'none'
}

export function checkCoverage({ yearlyIncome, householdSize, state, hasKids, pregnant }: CoverageInput): CoverageResult {
  const percent = percentOfPoverty(yearlyIncome, householdSize, state)
  const expanded = !state || !NON_EXPANSION.has(state)
  let adults: CoverageResult['adults']
  if (expanded) adults = percent <= 138 ? 'medicaid' : 'marketplace'
  else if (state === 'WI') adults = percent <= 100 ? 'medicaid' : 'marketplace'
  else adults = percent < 100 ? 'gap' : 'marketplace'
  return {
    percent,
    adults,
    kids: hasKids ? (percent <= 200 ? 'likely' : percent <= 300 ? 'maybe' : 'marketplace') : null,
    pregnant: pregnant ? (percent <= 138 ? 'likely' : percent <= 250 ? 'maybe' : null) : null,
    clinicDiscount: percent <= 100 ? 'nominal' : percent <= 200 ? 'partial' : 'none',
  }
}
