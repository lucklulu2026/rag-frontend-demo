import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.scss'
import 'highlight.js/styles/github.css'
import { initAnalytics } from './utils/tools/analytics.js'

const app = createApp(App)
app.use(createPinia())
app.use(router)
initAnalytics(router)
app.mount('#app')
