import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Introduction',
    component: () => import('../views/Introduction.vue')
  },
  {
    path: '/app',
    name: 'App',
    component: () => import('../views/MainApp.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
