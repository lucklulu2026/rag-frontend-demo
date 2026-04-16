<!--
  @view MainApp
  @description 主应用页：左侧会话侧边栏 + 右侧聊天区
-->
<template>
  <div class="app-container">
    <!-- 移动端遮罩 -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>
    <!-- 左侧边栏 -->
    <AppSidebar
      :sidebar-open="sidebarOpen"
      @toggle="sidebarOpen = !sidebarOpen"
      @new-chat="handleNewChat"
      @switch-session="handleSwitchSession"
    />
    <!-- 右侧聊天区 -->
    <div class="middle-container">
      <QaChat ref="qaChatRef" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppSidebar from '../components/AppSidebar/index.vue'
import QaChat from '../components/QaChat/index.vue'
import { useRagStore } from '../store/ragStore'

const ragStore = useRagStore()
onMounted(() => ragStore.init())

const sidebarOpen = ref(false)
const qaChatRef = ref(null)

const handleNewChat = () => {
  qaChatRef.value?.onNewChat()
}

const handleSwitchSession = (id) => {
  qaChatRef.value?.onSwitchSession(id)
}
</script>

<style lang="scss" scoped>
.sidebar-overlay { display: none; }

@media (max-width: 768px) {
  .sidebar-overlay {
    display: block; position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.4); z-index: 99;
  }
}
</style>
