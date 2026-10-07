// 2025 HHS poverty guidelines. Update each January from
// https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
const GUIDELINES = {
  contiguous: { base: 15650, perPerson: 5500 },
  AK: { base: 19550, perPerson: 6880 },
  HI: { base: 17990, perPerson: 6325 },
} as const
export const GUIDELINE_YEAR = 2025

export function povertyLine(householdSize: number, state?: string) {
  const g = state === 'AK' || state === 'HI' ? GUIDELINES[state] : GUIDELINES.contiguous
  return g.base + g.perPerson * (Math.max(1, householdSize) - 1)
}

export function percentOfPoverty(yearlyIncome: number, householdSize: number, state?: string) {
  return Math.round((yearlyIncome / povertyLine(householdSize, state)) * 100)
}

export type CoverageResult = {
  percent: number
  // Rough guide only: limits differ by state, and the official application decides.
  tier: 'medicaid' | 'kids' | 'chip' | 'marketplace'
  // HRSA health centers discount fully at or below 100% and partly up to 200%.
  clinicDiscount: 'nominal' | 'partial' | 'none'
}

export function checkCoverage(yearlyIncome: number, householdSize: number, state?: string): CoverageResult {
  const percent = percentOfPoverty(yearlyIncome, householdSize, state)
  const tier = percent <= 138 ? 'medicaid' : percent <= 200 ? 'kids' : percent <= 300 ? 'chip' : 'marketplace'
  const clinicDiscount = percent <= 100 ? 'nominal' : percent <= 200 ? 'partial' : 'none'
  return { percent, tier, clinicDiscount }
}
