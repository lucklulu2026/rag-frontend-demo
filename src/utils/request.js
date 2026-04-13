// 统一请求层：本地走 Vite 代理，线上走 Serverless Function
const IS_DEV = import.meta.env.DEV
const TONGYI_API_KEY = import.meta.env.VITE_TONGYI_API_KEY

/**
 * 调用通义 API（自动适配本地/线上环境）
 * @param {string} apiPath - 通义 API 路径，如 /api/v1/services/aigc/text-generation/generation
 * @param {object} body - 请求体
 */
export async function callDashScope(apiPath, body) {
  let url, headers

  if (IS_DEV) {
    // 本地开发：走 Vite 代理
    url = `/dashscope${apiPath}`
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TONGYI_API_KEY}`,
    }
  } else {
    // 线上：走 Vercel Serverless Function
    url = '/api/proxy'
    headers = {
      'Content-Type': 'application/json',
      'X-Target-Path': apiPath,
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`API 请求失败 (${response.status}): ${errText}`)
  }

  return response.json()
}
