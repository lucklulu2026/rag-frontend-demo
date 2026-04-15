/**
 * @file Toast 提示工具
 * @description 全局轻量提示，支持 success / error / warning / info
 * @module tools/toast
 *
 * @example
 * import { toast } from '@/utils/tools/toast.js'
 * toast.success('操作成功')
 * toast.error('网络异常，请稍后重试')
 */
import { reactive } from 'vue'

/** @type {number} 自增 ID */
let idCounter = 0

/** @type {Array<{id: number, type: string, message: string}>} 当前显示的 toast 列表 */
export const toasts = reactive([])

/**
 * 添加一条 toast 提示
 * @param {'success'|'error'|'warning'|'info'} type - 提示类型
 * @param {string} message - 提示文案
 * @param {number} [duration=3000] - 显示时长（ms）
 */
const addToast = (type, message, duration = 3000) => {
  const id = ++idCounter
  toasts.push({ id, type, message })
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === id)
    if (idx > -1) toasts.splice(idx, 1)
  }, duration)
}

/** Toast 调用接口 */
export const toast = {
  success: (msg, duration) => addToast('success', msg, duration),
  error: (msg, duration) => addToast('error', msg, duration ?? 4000),
  warning: (msg, duration) => addToast('warning', msg, duration),
  info: (msg, duration) => addToast('info', msg, duration),
}
