<!--
  @component SummaryModal
  @description 对话总结弹窗：展示 AI 生成的 Markdown 总结，支持复制和导出文档
-->
<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="summary-modal">
      <!-- 头部 -->
      <div class="summary-header">
        <div class="summary-header-left">
          <div class="summary-icon"><Sparkles :size="18" /></div>
          <h3>对话总结</h3>
        </div>
        <div class="summary-header-right">
          <template v-if="content && !loading">
            <button class="summary-action-btn" @click="handleCopy" :class="{ done: copied }">
              <Check v-if="copied" :size="14" /> <Copy v-else :size="14" />
              {{ copied ? '已复制' : '复制' }}
            </button>
            <button class="summary-action-btn export" @click="handleExportMd">
              <FileDown :size="14" /> 导出 MD
            </button>
          </template>
          <button class="summary-close" @click="$emit('close')"><X :size="16" /></button>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="summary-body">
        <!-- 加载态 -->
        <div v-if="loading" class="summary-loading">
          <div class="loading-animation">
            <div class="loading-ring"></div>
            <Sparkles :size="20" class="loading-center-icon" />
          </div>
          <p class="loading-title">正在生成总结</p>
          <p class="loading-desc">AI 正在分析对话内容，提炼重点信息...</p>
        </div>

        <!-- 总结内容 -->
        <div v-else-if="content" class="summary-content markdown-body" v-html="renderedContent"></div>

        <!-- 空 -->
        <div v-else class="summary-empty">暂无总结内容</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Sparkles, X, Copy, Check, FileDown } from 'lucide-vue-next'
import { renderMarkdown } from '../../utils/tools/markdown.js'
import { toast } from '../../utils/tools/toast.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  content: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

defineEmits(['close'])

const copied = ref(false)
const renderedContent = computed(() => renderMarkdown(props.content))

/** 复制总结内容 */
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.content)
    copied.value = true
    toast.success('已复制到剪贴板')
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    toast.error('复制失败')
  }
}

/** 导出为 Markdown 文件 */
const handleExportMd = () => {
  const blob = new Blob([props.content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `对话总结_${new Date().toLocaleDateString().replace(/\//g, '-')}.md`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('文档已导出')
}
</script>

<style lang="scss" scoped>
.summary-modal {
  background: var(--card-bg);
  border-radius: 16px;
  width: 680px;
  max-width: 92vw;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  animation: modalIn 0.25s ease;
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

// 头部
.summary-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border);
}

.summary-header-left {
  display: flex; align-items: center; gap: 10px;
  h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--text); }
}

.summary-icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6);
  color: #fff; display: flex; align-items: center; justify-content: center;
}

.summary-header-right { display: flex; align-items: center; gap: 6px; }

.summary-action-btn {
  display: flex; align-items: center; gap: 4px; padding: 6px 12px;
  border: 1px solid var(--border); border-radius: 8px; background: var(--bg);
  font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.done { border-color: #52c41a; color: #52c41a; }
  &.export { &:hover { border-color: #722ed1; color: #722ed1; } }
}

.summary-close {
  width: 30px; height: 30px; border: none; background: none; border-radius: 8px;
  color: var(--text-secondary); cursor: pointer; display: flex; align-items: center;
  justify-content: center; transition: all 0.15s;
  &:hover { background: var(--bg); color: var(--text); }
}

// 内容区
.summary-body {
  flex: 1; overflow-y: auto; padding: 22px;
}

// 加载态
.summary-loading {
  display: flex; flex-direction: column; align-items: center;
  padding: 48px 20px; gap: 14px; text-align: center;
}

.loading-animation {
  position: relative; width: 56px; height: 56px;
  display: flex; align-items: center; justify-content: center;
}

.loading-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2.5px solid var(--border);
  border-top-color: var(--primary);
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-center-icon { color: var(--primary); z-index: 1; }

.loading-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }
.loading-desc { font-size: 13px; color: var(--text-secondary); margin: 0; }

// 总结内容 - 覆盖 markdown pre 样式，用浅色背景
.summary-content {
  padding: 0;

  :deep(pre) {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    white-space: pre-wrap;
    word-break: break-word;

    code {
      color: var(--text);
      white-space: pre-wrap;
    }
  }
}

.summary-empty {
  text-align: center; color: var(--text-secondary); font-size: 14px; padding: 48px 0;
}

@media (max-width: 768px) {
  .summary-modal { width: 95vw; max-height: 88vh; }
  .summary-header { padding: 14px 16px; }
  .summary-body { padding: 16px; }
}
</style>
