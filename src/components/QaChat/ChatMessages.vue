<!--
  @component ChatMessages
  @description 消息列表：用户气泡、AI 气泡（Markdown 渲染）、引用来源折叠、加载动画
  @props messages {Array} 当前会话的消息列表
  @props pendingQuestion {string} 正在等待回答的问题
  @props loading {boolean} 是否正在加载
-->
<template>
  <div class="qa-messages" ref="messagesRef">
    <!-- 消息列表 -->
    <div class="message-group" v-for="(item, index) in messages" :key="index">
      <!-- 用户消息 -->
      <div class="message message-user">
        <div class="bubble bubble-user">{{ item.question }}</div>
      </div>
      <!-- AI 回复 -->
      <div class="message message-ai">
        <div class="bubble bubble-ai">
          <div class="answer-text markdown-body" v-html="renderMarkdown(item.answer)"></div>
          <!-- 引用来源（可折叠） -->
          <div v-if="item.relatedTexts?.length" class="references">
            <div class="ref-toggle" @click="toggleRef(index)">
              <Paperclip :size="12" /> 参考来源（{{ item.relatedTexts.length }}）
              <span class="ref-arrow" :class="{ expanded: expandedRefs[index] }">
                <ChevronDown :size="12" />
              </span>
            </div>
            <div v-if="expandedRefs[index]" class="ref-list">
              <div class="ref-item" v-for="(r, ri) in item.relatedTexts" :key="ri">
                <div class="ref-header">
                  <span class="ref-badge">[{{ ri + 1 }}]</span>
                  <span class="ref-source-link" @click.stop="openSourceDoc(r)" title="点击查看来源文档">
                    <FileText :size="12" /> {{ r.source }}
                  </span>
                  <span class="ref-score" :class="scoreLevel(r.score)">
                    {{ (r.score * 100).toFixed(1) }}%
                  </span>
                  <span v-if="r.bm25Score > 0" class="ref-score bm25">关键词 {{ r.bm25Score.toFixed(1) }}</span>
                </div>
                <div class="ref-text">{{ r.text }}</div>
              </div>
            </div>
          </div>
          <!-- 消息操作栏 -->
          <div class="msg-actions">
            <button class="msg-action-btn" @click.stop="handleCopy(item.answer)" title="复制">
              <Copy :size="13" />
            </button>
            <button class="msg-action-btn" @click.stop="$emit('regenerate', index)" title="重新生成">
              <RefreshCw :size="13" />
            </button>
            <button class="msg-action-btn msg-action-delete" @click.stop="handleDelete(index)" title="删除">
              <Trash2 :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 正在等待回答的问题 -->
    <div v-if="pendingQuestion" class="message-group">
      <div class="message message-user">
        <div class="bubble bubble-user">{{ pendingQuestion }}</div>
      </div>
      <!-- 流式输出中的 AI 回复 -->
      <div v-if="streamingText" class="message message-ai">
        <div class="bubble bubble-ai">
          <div class="answer-text markdown-body" v-html="renderMarkdown(streamingText)"></div>
          <span class="streaming-cursor"></span>
        </div>
      </div>
    </div>

    <!-- 加载动画（仅在等待首个 token 时显示） -->
    <div v-if="loading && !streamingText" class="loading-dots">
      <div class="dots"><span></span><span></span><span></span></div>
    </div>

    <!-- 来源文档预览弹窗 -->
    <div v-if="previewDoc" class="modal-overlay" @click.self="previewDoc = null">
      <div class="modal source-preview-modal">
        <div class="modal-header">
          <h3><FileText :size="16" /> {{ previewDoc.fileName }}</h3>
          <button class="modal-close" @click="previewDoc = null"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="source-preview-content" v-html="highlightedRawText"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { Paperclip, ChevronDown, FileText, X, Copy, RefreshCw, Trash2 } from 'lucide-vue-next'
import { renderMarkdown } from '../../utils/tools/markdown.js'
import { useRagStore } from '../../store/ragStore.js'
import { toast } from '../../utils/tools/toast.js'
import { confirm } from '../../utils/tools/confirm.js'

const props = defineProps({
  /** @type {Array<{question: string, answer: string, relatedTexts?: Array}>} */
  messages: { type: Array, default: () => [] },
  /** @type {string} 正在等待回答的问题文本 */
  pendingQuestion: { type: String, default: '' },
  /** @type {string} 正在流式生成的 AI 回答 */
  streamingText: { type: String, default: '' },
  /** @type {boolean} 是否正在请求 AI */
  loading: { type: Boolean, default: false },
})

/** @type {import('vue').Ref<HTMLElement|null>} 消息容器 DOM 引用 */
const messagesRef = ref(null)

/** @type {Record<number, boolean>} 引用来源展开状态 */
const expandedRefs = reactive({})

/** 切换引用来源的展开/折叠 */
const toggleRef = (index) => { expandedRefs[index] = !expandedRefs[index] }

/** 滚动到底部 */
const scrollToBottom = () => {
  nextTick(() => { if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight })
}

// 消息变化时自动滚动
watch(() => props.messages.length, scrollToBottom)
watch(() => props.pendingQuestion, scrollToBottom)

/** 重置引用展开状态（切换会话时调用） */
const resetRefs = () => { Object.keys(expandedRefs).forEach(k => delete expandedRefs[k]) }

// ===== 语义分数颜色分级 =====
/**
 * 根据相似度分数返回颜色等级 class
 * @param {number} score - 0~1 的相似度
 * @returns {'high'|'medium'|'low'} CSS class 名
 */
const scoreLevel = (score) => {
  const pct = score * 100
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'medium'
  return 'low'
}

// ===== 来源文档预览 =====
const ragStore = useRagStore()
/** @type {import('vue').Ref<Object|null>} 当前预览的文档 */
const previewDoc = ref(null)
/** @type {import('vue').Ref<string>} 需要高亮的文本片段 */
const highlightText = ref('')

/** 高亮后的原文 HTML */
const highlightedRawText = computed(() => {
  if (!previewDoc.value) return ''
  const raw = previewDoc.value.rawText || '原文不可用'
  if (!highlightText.value) return escapeHtml(raw).replace(/\n/g, '<br>')

  // 在原文中查找并高亮匹配的文本片段
  const escaped = escapeHtml(raw)
  const target = escapeHtml(highlightText.value.trim().slice(0, 80)) // 取前80字匹配
  if (!target) return escaped.replace(/\n/g, '<br>')

  const idx = escaped.indexOf(target)
  if (idx === -1) return escaped.replace(/\n/g, '<br>')

  const before = escaped.slice(0, idx)
  const match = escaped.slice(idx, idx + target.length)
  const after = escaped.slice(idx + target.length)
  return (before + `<mark class="highlight-mark">${match}</mark>` + after).replace(/\n/g, '<br>')
})

/** HTML 转义 */
const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * 打开来源文档预览，定位并高亮引用的文本
 * @param {{source: string, text: string}} ref - 引用信息
 */
const openSourceDoc = (refItem) => {
  const doc = ragStore.documentList.find(d => d.fileName === refItem.source)
  if (!doc) {
    alert('文档不存在，可能已被删除')
    return
  }
  previewDoc.value = doc
  highlightText.value = refItem.text

  // 等弹窗渲染后滚动到高亮位置
  nextTick(() => {
    setTimeout(() => {
      const mark = document.querySelector('.highlight-mark')
      if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  })
}

defineExpose({ scrollToBottom, resetRefs })
const emit = defineEmits(['regenerate', 'delete-msg'])

/** 删除消息（二次确认） */
const handleDelete = async (index) => {
  const ok = await confirm({
    title: '删除消息',
    message: '确定要删除这条问答记录吗？删除后无法恢复。',
    confirmText: '删除',
    type: 'danger',
  })
  if (ok) emit('delete-msg', index)
}

/** 复制消息内容到剪贴板（兼容非 HTTPS） */
const handleCopy = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      // fallback：用 textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;left:-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    toast.success('已复制到剪贴板')
  } catch {
    toast.error('复制失败')
  }
}
</script>

<style lang="scss" scoped>
.qa-messages { width: 100%; max-width: 950px; margin: 0 auto; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.message {
  display: flex; gap: 14px; max-width: 75%;
  &-group { display: flex; flex-direction: column; gap: 16px; }
  &-user { align-self: flex-end; flex-direction: row-reverse; }
  &-ai { align-self: flex-start; }
}
.bubble {
  padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.7; word-break: break-word;
  &-user { background: var(--user-bubble); color: var(--user-bubble-text); border-top-right-radius: 4px; }
  &-ai { background: var(--card-bg); color: var(--text); box-shadow: 0 1px 6px rgba(0,0,0,0.06); border-top-left-radius: 4px; }
}
.loading-dots { display: flex; align-items: flex-start; gap: 14px; padding: 0 24px; }
.dots {
  display: flex; gap: 5px; padding: 14px 18px; background: var(--card-bg);
  box-shadow: 0 1px 6px rgba(0,0,0,0.06); border-radius: 16px; border-top-left-radius: 4px;
  span { width: 6px; height: 6px; background: var(--text-secondary); border-radius: 50%; animation: dotPulse 1.2s infinite;
    &:nth-child(2) { animation-delay: 0.2s; } &:nth-child(3) { animation-delay: 0.4s; }
  }
}
@keyframes dotPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }

// 消息操作栏
.msg-actions {
  display: flex; gap: 2px; margin-top: 6px; opacity: 0;
  transition: opacity 0.15s;
}
.bubble-ai:hover .msg-actions { opacity: 1; }

.msg-action-btn {
  width: 28px; height: 28px; border: none; background: none; border-radius: 6px;
  color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
  &:hover { background: var(--bg); color: var(--text); }
}
.msg-action-delete:hover { color: #f53f3f; background: var(--danger-hover-bg); }

// 流式输出光标
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: var(--primary);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursorBlink 0.8s infinite;
}
@keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

// 引用来源
.references { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
.ref {
  &-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--primary); cursor: pointer; user-select: none; padding: 4px 0; &:hover { opacity: 0.8; } }
  &-arrow { font-size: 10px; transition: transform 0.2s; &.expanded { transform: rotate(180deg); } }
  &-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
  &-item { padding: 8px 10px; background: var(--bg); border-radius: 6px; font-size: 12px; border-left: 3px solid var(--primary); }
  &-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
  &-badge { color: var(--primary); font-weight: 600; }
  &-source-link {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 12px; color: var(--primary); cursor: pointer; transition: all 0.15s;
    text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 2px;
    &:hover { color: var(--primary-hover); text-decoration-style: solid; }
  }
  &-score {
    font-size: 11px; margin-left: auto; font-weight: 600; padding: 1px 6px; border-radius: 8px;
    &.high { color: #389e0d; background: rgba(56, 158, 13, 0.1); }
    &.medium { color: #d48806; background: rgba(212, 136, 6, 0.1); }
    &.low { color: #cf1322; background: rgba(207, 19, 34, 0.1); }
    &.bm25 { color: #722ed1; background: rgba(114, 46, 209, 0.1); margin-left: 4px; }
  }
  &-text { color: var(--text); line-height: 1.5; }
}

// 来源文档预览弹窗
.source-preview-modal { width: 720px; max-height: 80vh; }
.source-preview-content {
  font-size: 14px; line-height: 1.8; color: var(--text); white-space: pre-wrap;
}
:deep(.highlight-mark) {
  background: rgba(79, 110, 247, 0.15);
  padding: 2px 5px;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .qa-messages { padding: 12px; }
  .message { max-width: 92%; }
  .bubble { max-width: 100%; overflow-x: auto; }
  .source-preview-modal { width: 95vw; }
}
</style>
