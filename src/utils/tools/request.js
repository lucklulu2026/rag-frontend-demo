/**
 * @file 统一请求层
 * @description 封装 API 调用，自动适配本地开发（Vite 代理）和线上部署（Vercel Serverless）
 * @module tools/request
 */

/** @type {boolean} 是否为开发环境 */
const IS_DEV = import.meta.env.DEV

/** @type {string|undefined} 通义千问 API Key（仅开发环境使用） */
const TONGYI_API_KEY = import.meta.env.VITE_TONGYI_API_KEY

/**
 * 调用通义 DashScope API
 * - 开发环境：通过 Vite 代理转发，前端携带 API Key
 * - 生产环境：通过 Vercel Serverless Function 代理，Key 在服务端注入
 *
 * @param {string} apiPath - API 路径，如 /api/v1/services/aigc/text-generation/generation
 * @param {Object} body - 请求体（JSON）
 * @returns {Promise<Object>} API 响应数据
 * @throws {Error} 请求失败时抛出错误，包含状态码和错误信息
 */
export async function callDashScope(apiPath, body) {
  /** @type {string} 请求 URL */
  let url
  /** @type {Record<string, string>} 请求头 */
  let headers

  if (IS_DEV) {
    url = `/dashscope${apiPath}`
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TONGYI_API_KEY}`,
    }
  } else {
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

/**
 * 流式调用通义 DashScope API（SSE）
 * @param {string} apiPath - API 路径
 * @param {Object} body - 请求体（会自动注入 stream: true）
 * @param {(chunk: string) => void} onChunk - 每收到一段文本时的回调
 * @returns {Promise<string>} 完整的回答文本
 */
export async function callDashScopeStream(apiPath, body, onChunk) {
  let url, headers

  if (IS_DEV) {
    url = `/dashscope${apiPath}`
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TONGYI_API_KEY}`,
      'Accept': 'text/event-stream',
    }
  } else {
    url = '/api/proxy-stream'
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

  // 读取 SSE 流
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // 按行解析 SSE 数据
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 最后一行可能不完整，留到下次

    for (const line of lines) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue

      try {
        const json = JSON.parse(data)
        // 增量模式：output.text 是本次新增的文本片段
        const chunk = json.output?.text || ''
        if (chunk) {
          fullText += chunk
          onChunk(fullText)
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return fullText
}
