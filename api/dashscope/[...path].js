// Vercel Serverless Function：通用代理，转发所有 /api/dashscope/* 请求到通义 API
// 文件路径 api/dashscope/[...path].js 会匹配 /api/dashscope/ 下的所有子路径

export default async function handler(req, res) {
  // 设置 CORS 头（允许前端跨域调用）
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // API Key 从 Vercel 环境变量读取（在 Vercel 控制台配置）
  const apiKey = process.env.VITE_TONGYI_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' })
  }

  // 提取实际路径：/api/dashscope/xxx/yyy -> /xxx/yyy
  const actualPath = req.url.replace(/^\/api\/dashscope/, '')
  const targetUrl = `https://dashscope.aliyuncs.com${actualPath}`

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
    console.error('Proxy error:', error)
    return res.status(500).json({ error: error.message })
  }
}
