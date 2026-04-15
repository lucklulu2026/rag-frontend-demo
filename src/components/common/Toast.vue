<!--
  @component Toast
  @description 全局轻量提示组件，支持 success / error / warning / info 四种类型
  @usage 通过 useToast() composable 调用：toast.error('出错了')
-->
<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="toast-item"
        :class="item.type"
      >
        <span class="toast-icon">
          <CircleCheck v-if="item.type === 'success'" :size="18" />
          <CircleX v-else-if="item.type === 'error'" :size="18" />
          <TriangleAlert v-else-if="item.type === 'warning'" :size="18" />
          <Info v-else :size="18" />
        </span>
        <span class="toast-msg">{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { CircleCheck, CircleX, TriangleAlert, Info } from 'lucide-vue-next'
import { toasts } from '../../utils/tools/toast.js'
</script>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--border);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
  max-width: 420px;

  &.success {
    border-color: #52c41a;
    .toast-icon { color: #52c41a; }
  }
  &.error {
    border-color: #f53f3f;
    .toast-icon { color: #f53f3f; }
  }
  &.warning {
    border-color: #faad14;
    .toast-icon { color: #faad14; }
  }
  &.info {
    border-color: var(--primary);
    .toast-icon { color: var(--primary); }
  }
}

.toast-icon { display: flex; flex-shrink: 0; }
.toast-msg { line-height: 1.4; }

// 动画
.toast-enter-active { animation: toastIn 0.3s ease; }
.toast-leave-active { animation: toastOut 0.25s ease; }
@keyframes toastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-12px); } }
</style>
