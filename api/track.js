import { kv } from '@vercel/kv'

const ALLOWED_EVENTS = new Set(['site_visit', 'chat_send'])

const getDateKey = () => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const event = req.body?.event
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({ error: 'Invalid event' })
  }

  try {
    const day = getDateKey()
    const totalKey = `stats:total:${event}`
    const dailyKey = `stats:daily:${day}:${event}`

    await kv.incr(totalKey)
    await kv.incr(dailyKey)

    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Track failed' })
  }
}
