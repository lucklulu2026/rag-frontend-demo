<!--
  @component ChatTopBar
  @description 聊天区顶部栏（简化版：仅标题 + 移动端侧边栏按钮）
-->
<template>
  <div class="qa-top-bar">
    <div class="qa-top-left">
      <button class="sidebar-toggle" @click="$emit('toggle-sidebar')">
        <Menu :size="18" />
      </button>
      <h3><MessageSquare :size="18" /> 智能问答</h3>
    </div>
  </div>
</template>

<script setup>
import { Menu, MessageSquare } from 'lucide-vue-next'
defineEmits(['toggle-sidebar'])
</script>

<style lang="scss" scoped>
.qa-top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
}
.qa-top-left { display: flex; align-items: center; gap: 8px; }
.sidebar-toggle {
  display: none; width: 34px; height: 34px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
  cursor: pointer; align-items: center; justify-content: center; transition: all 0.2s;
  &:hover { border-color: var(--primary); }
}
@media (max-width: 768px) {
  .sidebar-toggle { display: flex; }
  .qa-top-bar { padding: 12px 16px; }
}
</style>
