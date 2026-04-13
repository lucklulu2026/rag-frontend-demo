export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Target-Path',
      },
    })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const apiKey = process.env.VITE_TONGYI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'API Key not configured' }, { status: 500 })
  }

  const targetPath = req.headers.get('x-target-path')
  if (!targetPath) {
    return Response.json({ error: 'Missing X-Target-Path' }, { status: 400 })
  }

  const targetUrl = `https://dashscope.aliyuncs.com${targetPath}`

  try {
    const body = await req.json()

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const data = await apiRes.json()

    return Response.json(data, {
      status: apiRes.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error) {
    return Response.json(
      { error: error.message || 'Proxy request failed' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}
