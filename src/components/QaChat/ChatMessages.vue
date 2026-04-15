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

    <!-- 正在等待回答的问题 -->
    <div v-if="pendingQuestion" class="message-group">
      <div class="message message-user">
        <div class="bubble bubble-user">{{ pendingQuestion }}</div>
      </div>
    </div>

    <!-- 加载动画 -->
    <div v-if="loading" class="loading-dots">
      <div class="dots"><span></span><span></span><span></span></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue'
import { Paperclip, ChevronDown } from 'lucide-vue-next'
import { renderMarkdown } from '../../utils/tools/markdown.js'

const props = defineProps({
  /** @type {Array<{question: string, answer: string, relatedTexts?: Array}>} */
  messages: { type: Array, default: () => [] },
  /** @type {string} 正在等待回答的问题文本 */
  pendingQuestion: { type: String, default: '' },
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

defineExpose({ scrollToBottom, resetRefs })
</script>

<style lang="scss" scoped>
.qa-messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
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
// 引用来源
.references { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
.ref {
  &-toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--primary); cursor: pointer; user-select: none; padding: 4px 0; &:hover { opacity: 0.8; } }
  &-arrow { font-size: 10px; transition: transform 0.2s; &.expanded { transform: rotate(180deg); } }
  &-list { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
  &-item { padding: 8px 10px; background: var(--bg); border-radius: 6px; font-size: 12px; border-left: 3px solid var(--primary); }
  &-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  &-badge { color: var(--primary); font-weight: 600; }
  &-source { color: var(--text-secondary); font-size: 11px; }
  &-score { color: #00b42a; font-size: 11px; margin-left: auto; &.bm25 { color: #722ed1; margin-left: 6px; } }
  &-text { color: var(--text); line-height: 1.5; }
}
@media (max-width: 768px) { .qa-messages { padding: 16px; } .message { max-width: 90%; } }
</style>
