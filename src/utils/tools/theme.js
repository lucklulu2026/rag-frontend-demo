/**
 * @file 主题切换工具
 * @description 管理亮色/暗色主题，持久化到 localStorage，同步到 DOM data-theme 属性
 * @module tools/theme
 */
import { ref, watchEffect } from 'vue'

/** @type {string} localStorage 存储键名 */
const STORAGE_KEY = 'rag-theme'

/** @type {string} 从 localStorage 读取的主题，默认 'light' */
const savedTheme = localStorage.getItem(STORAGE_KEY) || 'light'

/** @type {import('vue').Ref<'light'|'dark'>} 当前主题响应式引用 */
const theme = ref(savedTheme)

// 初始化时立即应用到 DOM
document.documentElement.setAttribute('data-theme', savedTheme)

/** 切换主题（亮色 ↔ 暗色） */
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

/**
 * 设置指定主题
 * @param {'light'|'dark'} t - 目标主题
 */
const setTheme = (t) => {
  theme.value = t
}

// 监听变化，自动同步到 DOM 和 localStorage
watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem(STORAGE_KEY, theme.value)
})

export { theme, toggleTheme, setTheme }
