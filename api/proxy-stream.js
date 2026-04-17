/**
 * Vercel Serverless Function：SSE 流式代理
 * 透传通义千问的 SSE 流式响应
 */
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-Path')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.VITE_TONGYI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'API Key not configured' })

  const targetPath = req.headers['x-target-path']
  if (!targetPath) return res.status(400).json({ error: 'Missing X-Target-Path' })

  const targetUrl = `https://dashscope.aliyuncs.com${targetPath}`

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(req.body),
    })

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 透传流式数据
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }

    res.end()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
