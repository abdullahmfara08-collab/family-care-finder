// Serves the site's static files and two tiny endpoints for anonymous usage
// counts. Counts are one row per day and event name: nothing about the
// visitor (IP, location, answers) is read or stored.
import { EVENTS } from '../src/lib/metrics-events'

type D1Statement = { bind(...values: unknown[]): D1Statement; run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }> }
type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> }
  DB?: { prepare(query: string): D1Statement }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

export async function handleApi(request: Request, env: Env): Promise<Response | null> {
  const { pathname } = new URL(request.url)
  if (pathname === '/api/count') {
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405)
    let event: unknown
    try {
      event = ((await request.json()) as { event?: unknown }).event
    } catch {
      return json({ error: 'Bad JSON' }, 400)
    }
    if (typeof event !== 'string' || !(EVENTS as readonly string[]).includes(event)) return json({ error: 'Unknown event' }, 400)
    if (!env.DB) return json({ ok: false }, 503)
    const day = new Date().toISOString().slice(0, 10)
    await env.DB.prepare('INSERT INTO counts (day, event, n) VALUES (?, ?, 1) ON CONFLICT (day, event) DO UPDATE SET n = n + 1')
      .bind(day, event)
      .run()
    return json({ ok: true })
  }
  if (pathname === '/api/stats') {
    if (!env.DB) return json({ since: null, totals: [] })
    const { results } = await env.DB.prepare('SELECT event, SUM(n) AS total, MIN(day) AS since FROM counts GROUP BY event ORDER BY total DESC').all<{ event: string; total: number; since: string }>()
    const since = results.reduce<string | null>((min, r) => (!min || r.since < min ? r.since : min), null)
    return json({ since, totals: results.map(r => ({ event: r.event, total: r.total })) })
  }
  return null
}

export default {
  async fetch(request: Request, env: Env) {
    return (await handleApi(request, env)) ?? env.ASSETS.fetch(request)
  },
}
