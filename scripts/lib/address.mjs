// Street addresses are written many ways ("3059 West 26th Street, Suite 2" vs
// "3059 W 26TH ST"). Reduce both sides to the same short form before comparing.
const WORDS = {
  street: 'st', avenue: 'ave', av: 'ave', road: 'rd', boulevard: 'blvd', drive: 'dr', lane: 'ln',
  place: 'pl', court: 'ct', parkway: 'pkwy', highway: 'hwy', square: 'sq', terrace: 'ter',
  west: 'w', east: 'e', north: 'n', south: 's',
}
const UNIT = /\b(suite|ste|unit|apt|room|rm|fl|floor|bldg|building)\b.*$|#.*$/

export function normalizeStreet(street) {
  return String(street ?? '')
    .toLowerCase()
    .replace(UNIT, '')
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => WORDS[w] ?? w)
    .join(' ')
}

// The key the site uses to look a clinic up: its 5-digit ZIP plus the street
// exactly as HRSA lists it, so the browser doesn't need the normalizer.
export const siteKey = (zip, address) => `${String(zip).slice(0, 5)}|${String(address).trim().toLowerCase()}`

// Same building: equal after normalizing, or same house number and street name
// with only the suffix or direction missing on one side.
export function sameStreet(a, b) {
  const x = normalizeStreet(a)
  const y = normalizeStreet(b)
  if (!x || !y) return false
  if (x === y) return true
  const core = s => s.split(' ').filter(w => !['n', 's', 'e', 'w', 'st', 'ave', 'rd', 'blvd', 'dr', 'ln', 'pl', 'ct', 'pkwy', 'hwy'].includes(w))
  const [cx, cy] = [core(x), core(y)]
  return cx.length >= 2 && cx[0] === cy[0] && cx.join(' ') === cy.join(' ')
}
