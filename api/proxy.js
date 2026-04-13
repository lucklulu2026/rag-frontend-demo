// Vercel Serverless Function (Node.js runtime)
// 设置最大执行时间为 60 秒（免费版上限）
export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-Path')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.VITE_TONGYI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' })
  }

  const targetPath = req.headers['x-target-path']
  if (!targetPath) {
    return res.status(400).json({ error: 'Missing X-Target-Path' })
  }

  const targetUrl = `https://dashscope.aliyuncs.com${targetPath}`

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Proxy failed' })
  }
}
