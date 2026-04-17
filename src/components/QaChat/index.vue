<!--
  @component QaChat
  @description 智能问答主容器：顶部栏 + 欢迎页/消息列表 + 输入框
  @exposes onNewChat - 新建对话（供父组件调用）
  @exposes onSwitchSession - 切换会话（供父组件调用）
-->
<template>
  <div class="qa-container">
    <ChatTopBar
      :has-chat="hasChat && !loading"
      :summarizing="summarizing"
      @toggle-sidebar="$emit('toggle-sidebar')"
      @summarize="handleSummarize"
    />

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
        :streaming-text="streamingText"
        :loading="loading"
        @regenerate="handleRegenerate"
        @delete-msg="handleDeleteMsg"
      />
      <ChatInput v-model="question" :loading="loading" @send="handleAsk" />
    </template>

    <!-- 总结弹窗 -->
    <SummaryModal
      :visible="showSummary"
      :content="summaryContent"
      :loading="summarizing"
      @close="showSummary = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRagStore } from '../../store/ragStore.js'
import { askWithRAG, askWithRAGStream, summarizeChat } from '../../utils/services/llm.js'
import { toast } from '../../utils/tools/toast.js'

import ChatTopBar from './ChatTopBar.vue'
import ChatWelcome from './ChatWelcome.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'
import SummaryModal from './SummaryModal.vue'

defineEmits(['toggle-sidebar'])

const ragStore = useRagStore()
const question = ref('')
const loading = ref(false)
const pendingQuestion = ref('')
/** @type {import('vue').Ref<string>} 正在流式生成的 AI 回答文本 */
const streamingText = ref('')
const messagesRef = ref(null)

const hasChat = computed(() => ragStore.currentChat.length > 0 || !!pendingQuestion.value || loading.value)

// ===== 总结对话 =====
const showSummary = ref(false)
const summaryContent = ref('')
const summarizing = ref(false)

const handleSummarize = async () => {
  if (summarizing.value || !ragStore.currentChat.length) return
  showSummary.value = true
  summarizing.value = true
  summaryContent.value = ''

  try {
    summaryContent.value = await summarizeChat(ragStore.currentChat)
  } catch (error) {
    console.error('总结生成失败：', error)
    toast.error('总结生成失败，请稍后重试')
    showSummary.value = false
  } finally {
    summarizing.value = false
  }
}

/** 发送提问（流式输出） */
const handleAsk = async () => {
  if (!question.value.trim() || loading.value) return
  loading.value = true
  const q = question.value
  question.value = ''
  pendingQuestion.value = q
  streamingText.value = ''

  try {
    // 先做向量检索，再流式调用大模型
    const { answer, references } = await askWithRAGStream(
      q,
      ragStore.currentChat,
      (text) => {
        // 每收到一段文本，更新流式显示
        streamingText.value = text
        messagesRef.value?.scrollToBottom()
      }
    )
    // 流式结束，保存完整消息
    if (answer) await ragStore.addMessage(q, answer, references)
  } catch (error) {
    console.error('问答交互失败：', error)
    toast.error('问答失败，请检查网络连接后重试')
  } finally {
    pendingQuestion.value = ''
    streamingText.value = ''
    loading.value = false
  }
}

/** 删除指定消息 */
const handleDeleteMsg = async (index) => {
  await ragStore.deleteMessage(index)
  toast.info('消息已删除')
}

/** 重新生成指定消息的回答 */
const handleRegenerate = async (index) => {
  const msg = ragStore.currentChat[index]
  if (!msg || loading.value) return

  loading.value = true
  // 直接清空该消息的回答，原地显示流式内容
  const originalAnswer = msg.answer
  msg.answer = ''

  try {
    const historyBefore = ragStore.currentChat.slice(0, index)
    const { answer, references } = await askWithRAGStream(
      msg.question,
      historyBefore,
      (text) => {
        msg.answer = text
        messagesRef.value?.scrollToBottom()
      }
    )
    if (answer) await ragStore.updateMessage(index, answer, references)
  } catch (error) {
    console.error('重新生成失败：', error)
    msg.answer = originalAnswer // 失败时恢复原回答
    toast.error('重新生成失败，请稍后重试')
  } finally {
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
