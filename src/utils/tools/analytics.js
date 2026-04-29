import { trackEvent } from './telemetry.js'

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const isEnabled = !!GA_ID
let initialized = false
const SERVER_TRACK_EVENTS = new Set(['site_visit', 'chat_send'])

const fireServerTrack = (name, params = {}) => {
  if (typeof window === 'undefined') return
  if (!SERVER_TRACK_EVENTS.has(name)) return

  const payload = JSON.stringify({
    event: name,
    payload: params,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
  })

  // 优先使用 sendBeacon，页面跳转时更稳定
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/track', blob)
    return
  }

  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // 统计失败不影响主流程
  })
}

const safeGtag = (...args) => {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag(...args)
}

const loadGaScript = () => {
  if (!isEnabled || typeof window === 'undefined') return
  if (document.getElementById('ga4-script')) return

  window.dataLayer = window.dataLayer || []
  window.gtag = (...args) => window.dataLayer.push(args)

  const script = document.createElement('script')
  script.id = 'ga4-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  safeGtag('js', new Date())
  safeGtag('config', GA_ID, { send_page_view: false })
}

export const trackAnalyticsEvent = (name, params = {}) => {
  trackEvent(name, params)
  fireServerTrack(name, params)
  if (!isEnabled) return
  safeGtag('event', name, params)
}

export const initAnalytics = (router) => {
  if (initialized) return
  initialized = true

  loadGaScript()
  const visitKey = 'rag_site_visit_tracked'
  if (typeof window !== 'undefined' && !sessionStorage.getItem(visitKey)) {
    trackAnalyticsEvent('site_visit', {
      page_path: window.location.pathname,
    })
    sessionStorage.setItem(visitKey, '1')
  }

  if (!router) return
  router.afterEach((to) => {
    trackAnalyticsEvent('page_view', {
      page_title: document.title || 'RAG 智能知识库',
      page_path: to.fullPath,
    })
  })
}

export const analyticsEnabled = isEnabled
