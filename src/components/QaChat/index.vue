<!--
  @component QaChat
  @description 智能问答主容器：顶部栏 + 欢迎页/消息列表 + 输入框
  @exposes onNewChat - 新建对话（供父组件调用）
  @exposes onSwitchSession - 切换会话（供父组件调用）
-->
<template>
  <div class="qa-container">
    <ChatTopBar @toggle-sidebar="$emit('toggle-sidebar')" />

    <!-- 欢迎页（无对话时） -->
    <ChatWelcome
      v-if="!hasChat"
      v-model="question"
      :loading="loading"
      @send="handleAsk"
    />

    <!-- 对话区（有对话时） -->
    <template v-else>
      <ChatMessages
        ref="messagesRef"
        :messages="ragStore.currentChat"
        :pending-question="pendingQuestion"
        :loading="loading"
      />
      <ChatInput v-model="question" :loading="loading" @send="handleAsk" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRagStore } from '../../store/ragStore.js'
import { askWithRAG } from '../../utils/services/llm.js'
import { toast } from '../../utils/tools/toast.js'

import ChatTopBar from './ChatTopBar.vue'
import ChatWelcome from './ChatWelcome.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'

defineEmits(['toggle-sidebar'])

const ragStore = useRagStore()
const question = ref('')
const loading = ref(false)
const pendingQuestion = ref('')
const messagesRef = ref(null)

const hasChat = computed(() => ragStore.currentChat.length > 0 || !!pendingQuestion.value || loading.value)

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
    toast.error('问答失败，请检查网络连接后重试')
  } finally {
    pendingQuestion.value = ''
    loading.value = false
  }
}

/** 新建对话（供父组件通过 ref 调用） */
const onNewChat = () => {
  if (loading.value) return
  messagesRef.value?.resetRefs()
  question.value = ''
  pendingQuestion.value = ''
}

/** 切换会话（供父组件通过 ref 调用） */
const onSwitchSession = () => {
  messagesRef.value?.resetRefs()
  messagesRef.value?.scrollToBottom()
}

// 快捷键 Ctrl+K
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    ragStore.newChat()
    onNewChat()
  }
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

defineExpose({ onNewChat, onSwitchSession })
</script>

<style lang="scss" scoped>
.qa-container {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg);
}
</style>
