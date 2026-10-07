// Privacy-friendly usage counts, the Focus Perch way: a fixed list of events,
// sent with only the event name and the day. No cookies, IDs, ZIP codes,
// insurance or income ever leave the phone. Off unless VITE_METRICS_URL is set.
export const EVENTS = [
  'search_zip',
  'search_location',
  'open_clinic',
  'tap_call',
  'tap_directions',
  'coverage_check',
  'switch_language',
] as const
export type MetricEvent = (typeof EVENTS)[number]

const url = import.meta.env.VITE_METRICS_URL as string | undefined

export function track(event: MetricEvent) {
  if (!url || !navigator.sendBeacon) return
  try {
    navigator.sendBeacon(url, JSON.stringify({ event, day: new Date().toISOString().slice(0, 10) }))
  } catch {
    // Counting is best effort and never gets in the way.
  }
}
