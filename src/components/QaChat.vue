<template>
  <div class="qa-container">
    <div class="qa-top-bar">
      <div class="qa-top-left">
        <button class="sidebar-toggle" @click="toggleSidebar">☰</button>
        <h3>💬 智能问答</h3>
      </div>
      <div class="qa-top-actions">
        <button class="theme-toggle-btn" @click="toggleTheme" :title="theme === 'light' ? '切换暗色' : '切换亮色'">
          {{ theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <button class="new-chat-btn" @click="handleNewChat" title="新对话 (Ctrl+K)">
          ✨ 新对话
          <span class="shortcut-tag">Ctrl+K</span>
        </button>
        <button class="history-btn" @click="showHistory = true">🕐 历史对话</button>
      </div>
    </div>

    <!-- 消息区 -->
    <div class="qa-messages" ref="messagesRef">
      <div v-if="!ragStore.currentChat.length && !pendingQuestion && !loading" class="qa-empty">
        <span class="qa-empty-icon">💡</span>
        <span>上传文档后，在这里提问吧</span>
      </div>

      <div class="message-group" v-for="(item, index) in ragStore.currentChat" :key="index">
        <div class="message message-user">
          <div class="avatar avatar-user">我</div>
          <div class="bubble bubble-user">{{ item.question }}</div>
        </div>
        <div class="message message-ai">
          <div class="avatar avatar-ai">AI</div>
          <div class="bubble bubble-ai">
            <div class="answer-text markdown-body" v-html="renderMarkdown(item.answer)"></div>
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
                    <span class="ref-score">语义 {{ (r.score * 100).toFixed(1) }}%</span>
                    <span v-if="r.bm25Score > 0" class="ref-score bm25">关键词 {{ r.bm25Score.toFixed(1) }}</span>
                  </div>
                  <div class="ref-text">{{ r.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

    <!-- 历史对话弹窗 -->
    <div v-if="showHistory" class="modal-overlay" @click.self="closeHistory">
      <div class="modal history-modal">
        <div class="modal-header">
          <h3>🕐 历史对话</h3>
          <button class="modal-close" @click="closeHistory">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="!sessionsWithMessages.length" class="modal-empty">暂无历史对话</div>
          <div class="session-item" v-for="s in sessionsWithMessages" :key="s.id"
            :class="{ active: s.id === ragStore.currentSessionId }" @click="handleSwitchSession(s.id)">
            <div class="session-icon">💬</div>
            <div class="session-info">
              <input v-if="renamingId === s.id" v-model="renameValue" class="session-rename-input"
                @keyup.enter="confirmRename(s.id)" @blur="confirmRename(s.id)" @click.stop />
              <span v-else class="session-title">{{ s.title }}</span>
              <!-- <span class="session-meta">{{ s.messages.length }} 条对话 · {{ formatTime(s.createdAt) }}</span> -->
            </div>
            <!-- 三点菜单 -->
            <div class="session-more" @click.stop>
              <button class="session-more-btn" ref="moreBtnRefs" @click="toggleMenu($event, s.id)">⋯</button>
            </div>
          </div>
        </div>
        <div v-if="sessionsWithMessages.length" class="modal-footer">
          <button class="clear-btn" @click="handleClearAll">清空所有对话</button>
        </div>
      </div>
    </div>

    <!-- 浮动菜单（teleport 到 body，避免被 overflow 裁剪） -->
    <Teleport to="body">
      <div v-if="menuOpenId && showHistory" class="session-menu-overlay" @click="menuOpenId = null">
        <div class="session-menu" :style="menuStyle" @click.stop>
          <div class="session-menu-item" @click="startRenameFromMenu">重命名</div>
          <div class="session-menu-item delete" @click="handleDeleteSession(menuOpenId)">删除</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, watch, onMounted, onUnmounted, inject } from 'vue'
import { useRagStore } from '../store/ragStore'
import { askWithRAG } from '../utils/llmUtils.js'
import { renderMarkdown } from '../utils/markdown.js'
import { theme, toggleTheme } from '../utils/theme.js'

const ragStore = useRagStore()

// 侧边栏控制（从 MainApp 注入）
const { toggleSidebar } = inject('sidebar', { toggleSidebar: () => {} })
const question = ref('')
const loading = ref(false)

// 只显示有消息的会话
const sessionsWithMessages = computed(() => ragStore.sessions.filter(s => s.messages.length > 0))
const showHistory = ref(false)
const messagesRef = ref(null)
const pendingQuestion = ref('')
const expandedRefs = reactive({})
const renamingId = ref(null)
const renameValue = ref('')
const menuOpenId = ref(null)
const menuStyle = ref({})
const justFinishedRename = ref(false)

const handleNewChat = async () => {
  if (loading.value) return
  await ragStore.newChat()
  Object.keys(expandedRefs).forEach(k => delete expandedRefs[k])
  question.value = ''
  pendingQuestion.value = ''
}

const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    handleNewChat()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

const toggleRef = (index) => { expandedRefs[index] = !expandedRefs[index] }

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  })
}

watch(() => ragStore.currentChat.length, scrollToBottom)

const handleAsk = async () => {
  if (!question.value.trim() || loading.value) return
  loading.value = true
  const q = question.value
  question.value = ''
  pendingQuestion.value = q
  scrollToBottom()

  try {
    const { answer, references } = await askWithRAG(q, ragStore.currentChat)
    if (answer) {
      await ragStore.addMessage(q, answer, references)
    }
  } catch (error) {
    console.error('问答交互失败：', error)
    alert('问答失败，请稍后再试！')
  } finally {
    pendingQuestion.value = ''
    loading.value = false
  }
}

const handleSwitchSession = (id) => {
  if (renamingId.value || justFinishedRename.value) return
  ragStore.switchSession(id)
  Object.keys(expandedRefs).forEach(k => delete expandedRefs[k])
  menuOpenId.value = null
  showHistory.value = false
  scrollToBottom()
}

const closeHistory = () => {
  showHistory.value = false
  menuOpenId.value = null
  renamingId.value = null
}

const toggleMenu = (event, id) => {
  if (menuOpenId.value === id) {
    menuOpenId.value = null
    return
  }
  // 计算按钮位置，让菜单浮动在按钮下方
  const btn = event.currentTarget
  const rect = btn.getBoundingClientRect()
  menuStyle.value = {
    position: 'fixed',
    top: rect.bottom + 4 + 'px',
    left: (rect.right - 140) + 'px',
  }
  menuOpenId.value = id
}

const startRenameFromMenu = () => {
  const session = ragStore.sessions.find(s => s.id === menuOpenId.value)
  if (session) {
    renamingId.value = session.id
    renameValue.value = session.title
  }
  menuOpenId.value = null
  nextTick(() => {
    const inputs = document.querySelectorAll('.session-rename-input')
    if (inputs.length) inputs[inputs.length - 1].focus()
  })
}

const startRename = (session) => {
  renamingId.value = session.id
  renameValue.value = session.title
  menuOpenId.value = null
  nextTick(() => {
    const inputs = document.querySelectorAll('.session-rename-input')
    if (inputs.length) inputs[inputs.length - 1].focus()
  })
}

const confirmRename = async (id) => {
  if (renameValue.value.trim()) {
    await ragStore.renameSession(id, renameValue.value.trim())
  }
  renamingId.value = null
  // 短暂标记，防止 blur 后紧接的 click 触发切换
  justFinishedRename.value = true
  setTimeout(() => { justFinishedRename.value = false }, 200)
}

const handleDeleteSession = async (id) => {
  menuOpenId.value = null
  await ragStore.deleteSession(id)
}

const handleClearAll = async () => {
  menuOpenId.value = null
  await ragStore.clearAllSessions()
  showHistory.value = false
}

const formatTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前'
  return d.toLocaleDateString()
}
</script>

<style lang="scss" scoped>
.qa-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

.qa-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }
}

.qa-top-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-toggle {
  display: none;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 18px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
  }
}

.qa-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    background: var(--card-bg);
  }
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: var(--primary);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--primary-hover);
  }
}

.shortcut-tag {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 2px;
}

.history-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
}

// 消息区
.qa-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.qa-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
  gap: 8px;

  &-icon {
    font-size: 48px;
    opacity: 0.4;
  }
}

.message {
  display: flex;
  gap: 12px;
  max-width: 80%;

  &-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &-user {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  &-ai {
    align-self: flex-start;
  }
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;

  &-user {
    background: var(--primary);
    color: #fff;
  }

  &-ai {
    background: var(--active-bg);
    color: var(--primary);
  }
}

.bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;

  &-user {
    background: var(--primary);
    color: #fff;
    border-top-right-radius: 4px;
  }

  &-ai {
    background: var(--card-bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-top-left-radius: 4px;
  }
}

.loading-dots {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
}

.dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  border-top-left-radius: 4px;

  span {
    width: 6px;
    height: 6px;
    background: var(--text-secondary);
    border-radius: 50%;
    animation: dotPulse 1.2s infinite;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes dotPulse {

  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

// 输入区
.qa-input-bar {
  padding: 16px 24px;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
}

.qa-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 4px 4px 4px 16px;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--primary);
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--text);
    outline: none;
    padding: 8px 0;

    &::placeholder {
      color: var(--text-secondary);
    }
  }
}

.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s;
  flex-shrink: 0;

  &:hover {
    background: var(--primary-hover);
  }

  &:disabled {
    background: #c9cdd4;
    cursor: not-allowed;
  }
}

// 引用来源
.references {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.ref {
  &-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--primary);
    cursor: pointer;
    user-select: none;
    padding: 4px 0;

    &:hover {
      opacity: 0.8;
    }
  }

  &-arrow {
    font-size: 10px;
    transition: transform 0.2s;

    &.expanded {
      transform: rotate(180deg);
    }
  }

  &-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &-item {
    padding: 8px 10px;
    background: var(--bg);
    border-radius: 6px;
    font-size: 12px;
    border-left: 3px solid var(--primary);
  }

  &-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  &-badge {
    color: var(--primary);
    font-weight: 600;
  }

  &-source {
    color: var(--text-secondary);
    font-size: 11px;
  }

  &-score {
    color: #00b42a;
    font-size: 11px;
    margin-left: auto;

    &.bm25 {
      color: #722ed1;
      margin-left: 6px;
    }
  }

  &-text {
    color: var(--text);
    line-height: 1.5;
  }
}

// 历史对话弹窗
.history-modal {
  width: 640px;
  max-height: 80vh;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
  position: relative;

  &:hover {
    background: var(--bg);
  }

  &.active {
    background: var(--active-bg);
  }

  &:hover .session-more-btn {
    opacity: 1;
  }
}

.session-icon {
  font-size: 14px;
  flex-shrink: 0;
  opacity: 0.5;
}

.session-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-rename-input {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  border: 1px solid var(--primary);
  border-radius: 6px;
  padding: 3px 8px;
  outline: none;
  width: 100%;
}

.session-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

// 三点菜单
.session-more {
  flex-shrink: 0;
}

.session-more-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  opacity: 0;
  letter-spacing: 1px;

  &:hover {
    background: var(--hover-bg);
    color: var(--text);
  }
}

// 浮动菜单（teleport 到 body）
.session-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.session-menu {
  z-index: 2001;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
  min-width: 140px;
  animation: fadeIn 0.12s;
}

.session-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.12s;
  white-space: nowrap;

  &:hover {
    background: var(--bg);
  }

  &.delete {
    color: #f53f3f;

    &:hover {
      background: var(--danger-hover-bg);
    }
  }
}

.clear-btn {
  padding: 6px 16px;
  background: var(--card-bg);
  border: 1px solid #f53f3f;
  color: #f53f3f;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--danger-hover-bg);
  }
}

// ===== 移动端适配 =====
@media (max-width: 768px) {
  .sidebar-toggle {
    display: flex;
  }

  .qa-top-bar {
    padding: 12px 16px;
  }

  .qa-messages {
    padding: 16px;
  }

  .qa-input-bar {
    padding: 12px 16px;
  }

  .message {
    max-width: 90%;
  }

  .shortcut-tag {
    display: none;
  }

  .new-chat-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .history-btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .history-modal {
    width: 95vw;
    max-height: 85vh;
  }
}
</style>
