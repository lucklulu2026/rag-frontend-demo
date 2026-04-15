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
