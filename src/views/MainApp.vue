<script setup>
import { ref, onMounted, provide } from 'vue'
import DocumentUpload from '../components/DocumentUpload/index.vue'
import QaChat from '../components/QaChat/index.vue'
import { useRagStore } from '../store/ragStore'

const ragStore = useRagStore()
onMounted(() => ragStore.init())

const sidebarOpen = ref(false)
const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }
const closeSidebar = () => { sidebarOpen.value = false }

// 提供给子组件使用
provide('sidebar', { sidebarOpen, toggleSidebar, closeSidebar })
</script>

<template>
  <div class="app-container">
    <!-- 移动端遮罩 -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="closeSidebar"></div>
    <!-- 侧边栏 -->
    <DocumentUpload :class="{ 'sidebar-open': sidebarOpen }" />
    <div class="middle-container">
      <QaChat />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 99;
    animation: fadeIn 0.2s;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
