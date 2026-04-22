/**
 * @file 轻量前端埋点工具
 * @description 记录关键 RAG 指标到 localStorage，便于本地排查
 * @module tools/telemetry
 */

const STORAGE_KEY = 'rag_telemetry_events'
const MAX_EVENT_COUNT = 200

const readEvents = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeEvents = (events) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENT_COUNT)))
}

/**
 * 记录事件
 * @param {string} name
 * @param {Record<string, any>} [payload]
 */
export function trackEvent(name, payload = {}) {
  const events = readEvents()
  events.push({
    name,
    ts: Date.now(),
    ...payload,
  })
  writeEvents(events)
}

/**
 * 获取埋点事件（默认最近 50 条）
 * @param {number} [limit=50]
 * @returns {Array}
 */
export function getTelemetryEvents(limit = 50) {
  return readEvents().slice(-limit)
}

/**
 * 清空埋点数据
 */
export function clearTelemetryEvents() {
  localStorage.removeItem(STORAGE_KEY)
}

