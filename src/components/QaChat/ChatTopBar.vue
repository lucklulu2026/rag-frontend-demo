<!--
  @component ChatTopBar
  @description 聊天区顶部栏：标题、主题切换、新对话、历史对话按钮
  @emits new-chat - 点击新对话
  @emits show-history - 点击历史对话
  @emits toggle-sidebar - 点击侧边栏切换（移动端）
-->
<template>
  <div class="qa-top-bar">
    <div class="qa-top-left">
      <button class="sidebar-toggle" @click="$emit('toggle-sidebar')">
        <Menu :size="18" />
      </button>
      <h3><MessageSquare :size="18" class="icon-inline" /> 智能问答</h3>
    </div>
    <div class="qa-top-actions">
      <!-- 主题切换 -->
      <button class="theme-toggle-btn" @click="toggleTheme"
        :title="theme === 'light' ? '切换暗色' : '切换亮色'">
        <Moon v-if="theme === 'light'" :size="16" />
        <Sun v-else :size="16" />
      </button>
      <!-- 新对话 -->
      <button class="new-chat-btn" @click="$emit('new-chat')" title="新对话 (Ctrl+K)">
        <Sparkles :size="14" /> 新对话
        <span class="shortcut-tag">Ctrl+K</span>
      </button>
      <!-- 历史对话 -->
      <button class="history-btn" @click="$emit('show-history')">
        <Clock :size="14" /> 历史对话
      </button>
    </div>
  </div>
</template>

<script setup>
import { Menu, MessageSquare, Moon, Sun, Sparkles, Clock } from 'lucide-vue-next'
import { theme, toggleTheme } from '../../utils/tools/theme.js'

defineEmits(['new-chat', 'show-history', 'toggle-sidebar'])
</script>

<style lang="scss" scoped>
.qa-top-bar {
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; padding: 0 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
}
.qa-top-left { display: flex; align-items: center; gap: 8px; }
.sidebar-toggle {
  display: none; width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
  cursor: pointer; align-items: center; justify-content: center; transition: all 0.2s;
  &:hover { border-color: var(--primary); }
}
.qa-top-actions { display: flex; align-items: center; gap: 8px; }
.theme-toggle-btn {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s;
  &:hover { border-color: var(--primary); background: var(--card-bg); }
}
.new-chat-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  background: var(--primary); border: none; border-radius: 8px;
  font-size: 13px; color: #fff; cursor: pointer; transition: all 0.2s;
  &:hover { background: var(--primary-hover); }
}
.shortcut-tag { font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 5px; border-radius: 4px; margin-left: 2px; }
.history-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 14px;
  background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
  font-size: 13px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
  &:hover { border-color: var(--primary); color: var(--primary); }
}
@media (max-width: 768px) {
  .sidebar-toggle { display: flex; }
  .qa-top-bar { padding: 12px 16px; }
  .shortcut-tag { display: none; }
  .new-chat-btn { padding: 6px 10px; font-size: 12px; }
  .history-btn { padding: 6px 10px; font-size: 12px; }
}
</style>
