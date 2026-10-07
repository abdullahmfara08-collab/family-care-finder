import { describe, expect, it } from 'vitest'
import { handleApi } from './index'

function fakeDb() {
  const rows = new Map<string, number>()
  return {
    rows,
    prepare(query: string) {
      let args: unknown[] = []
      const stmt = {
        bind(...values: unknown[]) {
          args = values
          return stmt
        },
        async run() {
          const key = `${args[0]}|${args[1]}`
          rows.set(key, (rows.get(key) ?? 0) + 1)
        },
        async all<T>() {
          expect(query).toContain('GROUP BY event')
          const totals = new Map<string, number>()
          for (const [key, n] of rows) totals.set(key.split('|')[1], (totals.get(key.split('|')[1]) ?? 0) + n)
          return { results: [...totals].map(([event, total]) => ({ event, total, since: '2026-10-07' })) as T[] }
        },
      }
      return stmt
    },
  }
}
const env = (db = fakeDb()) => ({ DB: db, ASSETS: { fetch: async () => new Response('asset') } })
const post = (body: string) => new Request('https://x.dev/api/count', { method: 'POST', body })

describe('usage count API', () => {
  it('counts known events only', async () => {
    const e = env()
    expect((await handleApi(post('{"event":"tap_call"}'), e))!.status).toBe(200)
    expect((await handleApi(post('{"event":"tap_call"}'), e))!.status).toBe(200)
    expect((await handleApi(post('{"event":"steal_data"}'), e))!.status).toBe(400)
    expect((await handleApi(post('not json'), e))!.status).toBe(400)
    const stats = await (await handleApi(new Request('https://x.dev/api/stats'), e))!.json()
    expect(stats).toEqual({ since: '2026-10-07', totals: [{ event: 'tap_call', total: 2 }] })
  })
  it('leaves other paths to the static site', async () => {
    expect(await handleApi(new Request('https://x.dev/'), env())).toBeNull()
  })
})
