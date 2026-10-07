const EARTH_MILES = 3958.8

export function milesBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h))
}

// Clinic data is split into 1-degree tiles; a search loads the tile it falls
// in plus the eight around it, which covers roughly 70 miles in every direction.
export function tileKeysAround(lat: number, lon: number) {
  const keys: string[] = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) keys.push(`${Math.floor(lat) + dy}_${Math.floor(lon) + dx}`)
  }
  return keys
}
