<!--
  @component ChatTopBar
  @description 聊天区顶部栏：标题、总结对话按钮（有对话时）、移动端侧边栏按钮
  @props hasChat {boolean} 是否有对话内容
  @props summarizing {boolean} 是否正在生成总结
  @emits toggle-sidebar - 切换侧边栏
  @emits summarize - 总结对话
-->
<template>
  <div class="qa-top-bar">
    <div class="qa-top-left">
      <button class="sidebar-toggle" @click="$emit('toggle-sidebar')">
        <Menu :size="18" />
      </button>
      <h3><MessageSquare :size="18" /> 智能问答</h3>
    </div>
    <div class="qa-top-actions">
      <button class="summarize-btn" @click="$emit('summarize')" :disabled="!hasChat || summarizing">
        <Sparkles :size="14" />
        {{ summarizing ? '生成中...' : '总结对话' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { Menu, MessageSquare, Sparkles } from 'lucide-vue-next'

defineProps({
  hasChat: { type: Boolean, default: false },
  summarizing: { type: Boolean, default: false },
})
defineEmits(['toggle-sidebar', 'summarize'])
</script>

<style lang="scss" scoped>
.qa-top-bar {
  height: 64px; min-height: 64px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
}
.qa-top-left { display: flex; align-items: center; gap: 8px; }
.qa-top-actions { display: flex; align-items: center; gap: 8px; }
.sidebar-toggle {
  display: none; width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
  cursor: pointer; align-items: center; justify-content: center; transition: all 0.2s;
  &:hover { border-color: var(--primary); }
}
.summarize-btn {
  display: flex; align-items: center; gap: 5px; padding: 6px 14px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6); border: none;
  border-radius: 8px; font-size: 13px; color: #fff; cursor: pointer;
  transition: all 0.2s;
  &:hover { box-shadow: 0 2px 10px rgba(79, 110, 247, 0.3); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
}
@media (max-width: 768px) {
  .sidebar-toggle { display: flex; }
  .qa-top-bar { padding: 12px 16px; }
  .summarize-btn { padding: 5px 10px; font-size: 12px; }
}
</style>
