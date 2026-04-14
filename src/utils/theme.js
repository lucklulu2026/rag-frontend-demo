import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'rag-theme'

// 从 localStorage 读取，默认 light
const savedTheme = localStorage.getItem(STORAGE_KEY) || 'light'
const theme = ref(savedTheme)

// 初始化时立即应用
document.documentElement.setAttribute('data-theme', savedTheme)

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

const setTheme = (t) => {
  theme.value = t
}

// 监听变化，同步到 DOM 和 localStorage
watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem(STORAGE_KEY, theme.value)
})

export { theme, toggleTheme, setTheme }
