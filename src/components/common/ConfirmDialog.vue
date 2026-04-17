<!--
  @component ConfirmDialog
  @description 通用二次确认弹窗，通过 confirm() 函数调用
-->
<template>
  <Teleport to="body">
    <div v-if="state.visible" class="confirm-overlay" @click.self="handleCancel">
      <div class="confirm-dialog" :class="state.type">
        <div class="confirm-header">
          <TriangleAlert v-if="state.type === 'danger'" :size="20" class="confirm-icon danger" />
          <Info v-else :size="20" class="confirm-icon" />
          <h4>{{ state.title }}</h4>
        </div>
        <p class="confirm-message">{{ state.message }}</p>
        <div class="confirm-actions">
          <button class="confirm-cancel-btn" @click="handleCancel">{{ state.cancelText }}</button>
          <button class="confirm-ok-btn" :class="state.type" @click="handleConfirm">{{ state.confirmText }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { TriangleAlert, Info } from 'lucide-vue-next'
import { confirmState as state, resolveConfirm } from '../../utils/tools/confirm.js'

const handleConfirm = () => resolveConfirm(true)
const handleCancel = () => resolveConfirm(false)
</script>

<style lang="scss" scoped>
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; animation: fadeIn 0.15s;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.confirm-dialog {
  background: var(--card-bg); border-radius: 14px; padding: 24px;
  width: 380px; max-width: 90vw;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
  animation: dialogIn 0.2s ease;
}

@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.confirm-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
  h4 { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
}

.confirm-icon { color: var(--primary); &.danger { color: #f53f3f; } }

.confirm-message {
  font-size: 14px; color: var(--text-secondary); line-height: 1.6;
  margin: 0 0 20px; padding-left: 30px;
}

.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }

.confirm-cancel-btn {
  padding: 7px 18px; border: 1px solid var(--border); border-radius: 8px;
  background: none; color: var(--text-secondary); font-size: 13px;
  cursor: pointer; transition: all 0.15s;
  &:hover { background: var(--bg); color: var(--text); }
}

.confirm-ok-btn {
  padding: 7px 18px; border: none; border-radius: 8px;
  background: var(--primary); color: #fff; font-size: 13px;
  cursor: pointer; transition: all 0.15s;
  &:hover { background: var(--primary-hover); }
  &.danger { background: #f53f3f; &:hover { background: #d92d2d; } }
}
</style>
