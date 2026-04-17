/**
 * @file 确认弹窗工具
 * @description 通过 Promise 调用的二次确认弹窗
 * @module tools/confirm
 *
 * @example
 * import { confirm } from '@/utils/tools/confirm.js'
 * const ok = await confirm({ title: '删除确认', message: '确定要删除吗？' })
 * if (ok) { ... }
 */
import { reactive } from 'vue'

/** 弹窗状态 */
export const confirmState = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  type: 'default', // 'default' | 'danger'
  resolve: null,
})

/**
 * 显示确认弹窗
 * @param {Object} options
 * @param {string} [options.title='提示'] - 标题
 * @param {string} options.message - 提示内容
 * @param {string} [options.confirmText='确定'] - 确认按钮文字
 * @param {string} [options.cancelText='取消'] - 取消按钮文字
 * @param {'default'|'danger'} [options.type='default'] - 类型（danger 时确认按钮为红色）
 * @returns {Promise<boolean>} 用户点击确认返回 true，取消返回 false
 */
export function confirm(options) {
  return new Promise((resolve) => {
    confirmState.visible = true
    confirmState.title = options.title || '提示'
    confirmState.message = options.message || ''
    confirmState.confirmText = options.confirmText || '确定'
    confirmState.cancelText = options.cancelText || '取消'
    confirmState.type = options.type || 'default'
    confirmState.resolve = resolve
  })
}

/** 关闭弹窗并返回结果 */
export function resolveConfirm(result) {
  confirmState.visible = false
  if (confirmState.resolve) {
    confirmState.resolve(result)
    confirmState.resolve = null
  }
}
