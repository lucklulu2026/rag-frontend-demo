/**
 * @file 统一请求层
 * @description 封装 API 调用，自动适配本地开发（Vite 代理）和线上部署（Vercel Serverless）
 * @module tools/request
 */
import { trackEvent } from './telemetry.js'

/** @type {boolean} 是否为开发环境 */
const IS_DEV = import.meta.env.DEV

/** @type {string|undefined} 通义千问 API Key（仅开发环境使用） */
const TONGYI_API_KEY = import.meta.env.VITE_TONGYI_API_KEY

/** @type {number} 普通请求超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 25000
/** @type {number} 流式请求超时时间（毫秒） */
const STREAM_TIMEOUT_MS = 90000
/** @type {number} 普通请求最大重试次数 */
const MAX_RETRIES = 2
/** @type {AbortController|null} 当前活跃的流式请求控制器 */
let activeStreamController = null

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 合并多个 AbortSignal（任意一个中断即中断）
 * @param {(AbortSignal|undefined)[]} signals
 * @returns {AbortSignal|undefined}
 */
function mergeSignals(signals) {
  const validSignals = signals.filter(Boolean)
  if (validSignals.length === 0) return undefined
  if (validSignals.length === 1) return validSignals[0]

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  validSignals.forEach(signal => {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  })
  return controller.signal
}

/**
 * 创建带超时能力的 AbortSignal
 * @param {number} timeoutMs
 * @returns {{ signal: AbortSignal, clear: () => void }}
 */
function createTimeoutSignal(timeoutMs) {
  const timeoutController = new AbortController()
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs)
  return {
    signal: timeoutController.signal,
    clear: () => clearTimeout(timer),
  }
}

/**
 * 带重试的 fetch
 * @param {string} url
 * @param {RequestInit} options
 * @param {Object} retryOptions
 * @param {number} [retryOptions.retries=MAX_RETRIES]
 * @param {number} [retryOptions.baseDelay=500]
 */
async function fetchWithRetry(url, options, { retries = MAX_RETRIES, baseDelay = 500 } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (error) {
      lastError = error
      if (error?.name === 'AbortError' || attempt === retries) break
      await sleep(baseDelay * (2 ** attempt))
    }
  }
  throw lastError
}

/**
 * 取消当前活跃的流式请求
 */
export function cancelActiveStreamRequest() {
  if (activeStreamController) {
    activeStreamController.abort()
    activeStreamController = null
  }
}

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
export async function callDashScope(apiPath, body, options = {}) {
  /** @type {string} 请求 URL */
  let url
  /** @type {Record<string, string>} 请求头 */
  let headers
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const startAt = performance.now()

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

  const timeout = createTimeoutSignal(timeoutMs)
  const signal = mergeSignals([options.signal, timeout.signal])
  let response
  try {
    response = await fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    }, { retries: options.retries ?? MAX_RETRIES })
  } finally {
    timeout.clear()
  }

  if (!response.ok) {
    const errText = await response.text()
    trackEvent('dashscope_request_failed', {
      apiPath,
      status: response.status,
      durationMs: Math.round(performance.now() - startAt),
    })
    throw new Error(`API 请求失败 (${response.status}): ${errText}`)
  }

  trackEvent('dashscope_request_success', {
    apiPath,
    durationMs: Math.round(performance.now() - startAt),
  })
  return response.json()
}

/**
 * 流式调用通义 DashScope API（SSE）
 * @param {string} apiPath - API 路径
 * @param {Object} body - 请求体（会自动注入 stream: true）
 * @param {(chunk: string) => void} onChunk - 每收到一段文本时的回调
 * @returns {Promise<string>} 完整的回答文本
 */
export async function callDashScopeStream(apiPath, body, onChunk, options = {}) {
  let url, headers
  const timeoutMs = options.timeoutMs ?? STREAM_TIMEOUT_MS
  const startAt = performance.now()

  // 串行化流式请求，避免用户快速提交时出现串流状态错乱
  cancelActiveStreamRequest()
  const streamController = new AbortController()
  activeStreamController = streamController

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

  const timeout = createTimeoutSignal(timeoutMs)
  const signal = mergeSignals([options.signal, streamController.signal, timeout.signal])
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
  } finally {
    timeout.clear()
  }

  if (!response.ok) {
    const errText = await response.text()
    trackEvent('dashscope_stream_failed', {
      apiPath,
      status: response.status,
      durationMs: Math.round(performance.now() - startAt),
    })
    throw new Error(`API 请求失败 (${response.status}): ${errText}`)
  }

  try {
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

    trackEvent('dashscope_stream_success', {
      apiPath,
      durationMs: Math.round(performance.now() - startAt),
      outputChars: fullText.length,
    })
    return fullText
  } finally {
    if (activeStreamController === streamController) {
      activeStreamController = null
    }
  }
}
