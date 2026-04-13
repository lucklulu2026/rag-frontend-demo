<template>
  <div class="qa-container">
    <div class="qa-top-bar">
      <h3>💬 智能问答</h3>
      <button class="history-btn" @click="showHistory = true">🕐 历史记录</button>
    </div>

    <!-- 消息区 -->
    <div class="qa-messages" ref="messagesRef">
      <div v-if="!ragStore.qaHistory.length && !pendingQuestion && !loading" class="qa-empty">
        <span class="qa-empty-icon">💡</span>
        <span>上传文档后，在这里提问吧</span>
      </div>

      <div class="message-group" v-for="(item, index) in ragStore.qaHistory" :key="index">
        <div class="message message-user">
          <div class="avatar avatar-user">我</div>
          <div class="bubble bubble-user">{{ item.question }}</div>
        </div>
        <div class="message message-ai">
          <div class="avatar avatar-ai">AI</div>
          <div class="bubble bubble-ai">
            <div class="answer-text">{{ item.answer }}</div>
            <!-- 引用溯源 -->
            <div v-if="item.relatedTexts && item.relatedTexts.length" class="references">
              <div class="ref-toggle" @click="toggleRef(index)">
                📎 参考来源（{{ item.relatedTexts.length }}）
                <span class="ref-arrow" :class="{ expanded: expandedRefs[index] }">▼</span>
              </div>
              <div v-if="expandedRefs[index]" class="ref-list">
                <div class="ref-item" v-for="(r, ri) in item.relatedTexts" :key="ri">
                  <div class="ref-header">
                    <span class="ref-badge">[{{ ri + 1 }}]</span>
                    <span class="ref-source">{{ r.source }}</span>
                    <span class="ref-score">{{ (r.score * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="ref-text">{{ r.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- pending question -->
      <div v-if="pendingQuestion" class="message-group">
        <div class="message message-user">
          <div class="avatar avatar-user">我</div>
          <div class="bubble bubble-user">{{ pendingQuestion }}</div>
        </div>
      </div>

      <div v-if="loading" class="loading-dots">
        <div class="avatar avatar-ai">AI</div>
        <div class="dots"><span></span><span></span><span></span></div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="qa-input-bar">
      <div class="qa-input-wrapper">
        <input v-model="question" placeholder="输入你的问题..." @keyup.enter="handleAsk" :disabled="loading" />
        <button class="send-btn" @click="handleAsk" :disabled="loading || !question.trim()">➤</button>
      </div>
    </div>

    <!-- 历史弹窗 -->
    <div v-if="showHistory" class="modal-overlay" @click.self="showHistory = false">
      <div class="modal">
        <div class="modal-header">
          <h3>🕐 问答历史</h3>
          <button class="modal-close" @click="showHistory = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="!ragStore.qaHistory.length" class="modal-empty">暂无问答记录</div>
          <div class="history-card" v-for="(item, index) in ragStore.qaHistory" :key="index">
            <div class="history-q">
              <span class="history-q-tag">问</span>
              <span>{{ item.question }}</span>
            </div>
            <div class="history-a">{{ item.answer }}</div>
            <div v-if="item.relatedTexts && item.relatedTexts.length" class="history-refs">
              📎 引用了 {{ item.relatedTexts.length }} 个知识片段
              <span v-for="r in item.relatedTexts" :key="r.source" class="history-ref-tag">{{ r.source }}</span>
            </div>
            <div class="history-time">{{ item.time }}</div>
          </div>
        </div>
        <div v-if="ragStore.qaHistory.length" class="modal-footer">
          <button class="clear-btn" @click="handleClear">清空历史</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue'
import { useRagStore } from '../store/ragStore'
import { askWithRAG } from '../utils/llmUtils.js'

const ragStore = useRagStore()
const question = ref('')
const loading = ref(false)
const showHistory = ref(false)
const messagesRef = ref(null)
const pendingQuestion = ref('')
const expandedRefs = reactive({})

const toggleRef = (index) => {
  expandedRefs[index] = !expandedRefs[index]
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(() => ragStore.qaHistory.length, scrollToBottom)

const handleAsk = async () => {
  if (!question.value.trim() || loading.value) return

  loading.value = true
  const q = question.value
  question.value = ''
  pendingQuestion.value = q
  scrollToBottom()

  try {
    const { answer, references } = await askWithRAG(q, ragStore.qaHistory)
    if (answer) {
      await ragStore.addQaHistory(q, answer, references)
    }
  } catch (error) {
    console.error('问答交互失败：', error)
    alert('问答失败，请稍后再试！')
  } finally {
    pendingQuestion.value = ''
    loading.value = false
  }
}

const handleClear = async () => {
  await ragStore.clearQaHistory()
  showHistory.value = false
}
</script>
