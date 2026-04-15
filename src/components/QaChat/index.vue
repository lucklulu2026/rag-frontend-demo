<!--
  @component QaChat
  @description 智能问答主容器，组合子组件：顶部栏、欢迎页、消息列表、输入框、历史对话
  @children ChatTopBar, ChatWelcome, ChatMessages, ChatInput, ChatHistory
-->
<template>
  <div class="qa-container">
    <!-- 顶部栏 -->
    <ChatTopBar @new-chat="handleNewChat" @show-history="showHistory = true" @toggle-sidebar="toggleSidebar" />

    <!-- 欢迎页（无对话时） -->
    <ChatWelcome v-if="!hasChat" v-model="question" :loading="loading" @send="handleAsk" />

    <!-- 对话区（有对话时） -->
    <template v-else>
      <ChatMessages ref="messagesRef" :messages="ragStore.currentChat" :pending-question="pendingQuestion"
        :loading="loading" />
      <ChatInput v-model="question" :loading="loading" @send="handleAsk" />
    </template>

    <!-- 历史对话弹窗 -->
    <ChatHistory :visible="showHistory" @close="showHistory = false" @switch-session="handleSwitchSession" />
  </div>
</template>

<script setup>
/**
 * @description QaChat 主组件逻辑
 * 职责：管理问答状态、协调子组件通信、处理快捷键
 */
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useRagStore } from '../../store/ragStore.js'
import { askWithRAG } from '../../utils/services/llm.js'

// 子组件
import ChatTopBar from './ChatTopBar.vue'
import ChatWelcome from './ChatWelcome.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'
import ChatHistory from './ChatHistory.vue'

const ragStore = useRagStore()

/** @type {Function} 侧边栏切换（从 MainApp 注入） */
const { toggleSidebar } = inject('sidebar', { toggleSidebar: () => { } })

// ===== 状态 =====
/** @type {import('vue').Ref<string>} 输入框内容 */
const question = ref('')
/** @type {import('vue').Ref<boolean>} 是否正在请求 AI */
const loading = ref(false)
/** @type {import('vue').Ref<boolean>} 历史对话弹窗是否可见 */
const showHistory = ref(false)
/** @type {import('vue').Ref<string>} 正在等待回答的问题 */
const pendingQuestion = ref('')
/** @type {import('vue').Ref<InstanceType<typeof ChatMessages>|null>} 消息列表组件引用 */
const messagesRef = ref(null)

/** @type {import('vue').ComputedRef<boolean>} 是否有对话内容（决定显示欢迎页还是聊天区） */
const hasChat = computed(() => ragStore.currentChat.length > 0 || !!pendingQuestion.value || loading.value)

// ===== 核心操作 =====

/** 发送提问 */
const handleAsk = async () => {
  if (!question.value.trim() || loading.value) return
  loading.value = true
  const q = question.value
  question.value = ''
  pendingQuestion.value = q

  try {
    const { answer, references } = await askWithRAG(q, ragStore.currentChat)
    if (answer) await ragStore.addMessage(q, answer, references)
  } catch (error) {
    console.error('问答交互失败：', error)
    alert('问答失败，请稍后再试！')
  } finally {
    pendingQuestion.value = ''
    loading.value = false
  }
}

/** 新建对话 */
const handleNewChat = async () => {
  if (loading.value) return
  await ragStore.newChat()
  messagesRef.value?.resetRefs()
  question.value = ''
  pendingQuestion.value = ''
}

/** 切换到指定会话 */
const handleSwitchSession = (id) => {
  ragStore.switchSession(id)
  messagesRef.value?.resetRefs()
  showHistory.value = false
  messagesRef.value?.scrollToBottom()
}

// ===== 快捷键 =====
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    handleNewChat()
  }
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style lang="scss" scoped>
.qa-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}
</style>
