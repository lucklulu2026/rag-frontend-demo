// Vercel Serverless Function：统一代理通义千问 API
const https = require('https')

module.exports = function handler(req, res) {
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
    return res.status(500).json({ error: 'API Key not configured on server' })
  }

  // 从自定义 header 获取目标 API 路径
  const targetPath = req.headers['x-target-path']
  if (!targetPath) {
    return res.status(400).json({ error: 'Missing X-Target-Path header' })
  }

  const postData = JSON.stringify(req.body)

  const options = {
    hostname: 'dashscope.aliyuncs.com',
    path: targetPath,
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
        res.status(proxyRes.statusCode).json(JSON.parse(data))
      } catch (e) {
        res.status(502).json({ error: 'Invalid API response' })
      }
    })
  })

  proxyReq.on('error', (error) => {
    res.status(500).json({ error: error.message })
  })

  proxyReq.write(postData)
  proxyReq.end()
}
