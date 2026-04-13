// Vercel Serverless Function：代理通义千问 API
// Node 16 没有全局 fetch，用 https 模块
const https = require('https')

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.VITE_TONGYI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured on server' })
  }

  const actualPath = req.url.replace(/^\/api\/dashscope/, '')
  const postData = JSON.stringify(req.body)

  const options = {
    hostname: 'dashscope.aliyuncs.com',
    path: actualPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(postData),
    },
  }

  const proxyReq = https.request(options, (proxyRes) => {
    let data = ''
    proxyRes.on('data', (chunk) => { data += chunk })
    proxyRes.on('end', () => {
      try {
        const json = JSON.parse(data)
        res.status(proxyRes.statusCode).json(json)
      } catch (e) {
        res.status(502).json({ error: 'Invalid response from API', raw: data.substring(0, 200) })
      }
    })
  })

  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error)
    res.status(500).json({ error: error.message })
  })

  proxyReq.write(postData)
  proxyReq.end()
}
