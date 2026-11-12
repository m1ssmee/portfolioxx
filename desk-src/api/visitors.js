// The visitors' book's store (the desk's notebook: src/visitors/book.js), a Vercel function over
// Upstash Redis's REST API (no packages). It lives here, inside the project Vercel builds (Root
// Directory: desk-src); the repository's own api/visitors.js hands over to it, for a deployment
// of the whole repository.
//   GET   /api/visitors   the newest prints: { marks: [{ id, seed, ink, press, name, from, t }] }
//   POST  /api/visitors   one more: { seed, ink, press, name?, from? } -> { mark }
// Set up: in the Vercel project, Storage -> add an Upstash Redis (Marketplace) database and connect
// it; Vercel then sets UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL and
// KV_REST_API_TOKEN). Without them every call answers 503 and the book keeps prints in each
// visitor's own browser instead.
// Nothing is kept of a visitor but what they type and their print's numbers; their address is used
// only, hashed, to keep one person from filling the book (one print a minute).
import crypto from 'node:crypto'

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const KEY = 'visitors:marks'
const KEEP = 2000
const SHOW = 300

async function redis(commands) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  })
  if (!r.ok) throw new Error(`store ${r.status}`)
  return r.json()
}

// (plain text, one line, no markup)
const clean = (s, n) =>
  typeof s === 'string'
    ? s
        .replace(/[\u0000-\u001f\u007f<>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, n)
    : ''

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'no store' })
  try {
    if (req.method === 'GET') {
      const [{ result }] = await redis([['LRANGE', KEY, '0', String(SHOW - 1)]])
      const marks = (result || []).map((s) => {
        try {
          return JSON.parse(s)
        } catch {
          return null
        }
      })
      return res.status(200).json({ marks: marks.filter(Boolean) })
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      const seed = Number(b.seed)
      const ink = Number(b.ink)
      const press = Number(b.press)
      if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295 || !Number.isInteger(ink) || ink < 0 || ink > 4 || !(press >= 0.5 && press <= 1))
        return res.status(400).json({ error: 'bad print' })
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
      const who = crypto.createHash('sha256').update(`visitors:${ip}`).digest('hex').slice(0, 20)
      const [{ result: fresh }] = await redis([['SET', `visitors:rl:${who}`, '1', 'EX', '60', 'NX']])
      if (fresh !== 'OK') return res.status(429).json({ error: 'slow down' })
      const mark = {
        id: crypto.randomBytes(8).toString('hex'),
        seed,
        ink,
        press: Math.round(press * 100) / 100,
        name: clean(b.name, 24),
        from: clean(b.from, 28),
        t: Date.now(),
      }
      await redis([
        ['LPUSH', KEY, JSON.stringify(mark)],
        ['LTRIM', KEY, '0', String(KEEP - 1)],
      ])
      return res.status(201).json({ mark })
    }
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method' })
  } catch (e) {
    return res.status(502).json({ error: 'store unavailable' })
  }
}
