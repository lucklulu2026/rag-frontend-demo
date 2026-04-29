import { kv } from '@vercel/kv'

const EVENTS = ['site_visit', 'chat_send']

const getDateKey = () => {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const day = getDateKey()
    const stats = {}

    for (const event of EVENTS) {
      const totalKey = `stats:total:${event}`
      const dailyKey = `stats:daily:${day}:${event}`
      const [total, today] = await kv.mget(totalKey, dailyKey)
      stats[event] = {
        total: Number(total || 0),
        today: Number(today || 0),
      }
    }

    return res.status(200).json({
      date: day,
      stats,
    })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Stats query failed' })
  }
}
