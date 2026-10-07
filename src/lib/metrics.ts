// Privacy-friendly usage counts, the Focus Perch way: a fixed list of events,
// sent with only the event name and the day. No cookies, IDs, ZIP codes,
// insurance or income ever leave the phone. Off in development.
import { EVENTS, type MetricEvent } from './metrics-events'

export { EVENTS }

// The live site counts through its own /api/count endpoint (worker/index.ts).
const url = (import.meta.env.VITE_METRICS_URL as string | undefined) ?? (import.meta.env.PROD ? '/api/count' : undefined)

export function track(event: MetricEvent) {
  if (!url || !navigator.sendBeacon) return
  try {
    navigator.sendBeacon(url, JSON.stringify({ event, day: new Date().toISOString().slice(0, 10) }))
  } catch {
    // Counting is best effort and never gets in the way.
  }
}
