<!--
  @component ChatHistory
  @description 历史对话弹窗：会话列表、重命名、删除、切换会话、清空
  @props visible {boolean} 是否显示弹窗
  @emits close - 关闭弹窗
  @emits switch-session - 切换到指定会话
-->
<template>
  <!-- 弹窗遮罩 -->
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal history-modal">
      <div class="modal-header">
        <h3><Clock :size="16" /> 历史对话</h3>
        <button class="modal-close" @click="close"><X :size="18" /></button>
      </div>
      <div class="modal-body">
        <div v-if="!sessionsWithMessages.length" class="modal-empty">暂无历史对话</div>
        <div
          class="session-item"
          v-for="s in sessionsWithMessages"
          :key="s.id"
          :class="{ active: s.id === ragStore.currentSessionId }"
          @click="handleSwitch(s.id)"
        >
          <div class="session-icon"><MessageSquare :size="16" /></div>
          <div class="session-info">
            <!-- 重命名输入框 -->
            <input
              v-if="renamingId === s.id"
              v-model="renameValue"
              class="session-rename-input"
              @keyup.enter="confirmRename(s.id)"
              @blur="confirmRename(s.id)"
              @click.stop
            />
            <span v-else class="session-title">{{ s.title }}</span>
          </div>
          <!-- 三点菜单按钮 -->
          <div class="session-more" @click.stop>
            <button class="session-more-btn" @click="toggleMenu($event, s.id)">
              <MoreHorizontal :size="16" />
            </button>
          </div>
        </div>
      </div>
      <div v-if="sessionsWithMessages.length" class="modal-footer">
        <button class="clear-btn" @click="handleClearAll">清空所有对话</button>
      </div>
    </div>
  </div>

  <!-- 浮动菜单（Teleport 到 body，避免被 overflow 裁剪） -->
  <Teleport to="body">
    <div v-if="menuOpenId && visible" class="session-menu-overlay" @click="menuOpenId = null">
      <div class="session-menu" :style="menuStyle" @click.stop>
        <div class="session-menu-item" @click="startRename"><Pen :size="14" /> 重命名</div>
        <div class="session-menu-item delete" @click="handleDelete(menuOpenId)"><Trash2 :size="14" /> 删除</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Clock, X, MessageSquare, MoreHorizontal, Pen, Trash2 } from 'lucide-vue-next'
import { useRagStore } from '../../store/ragStore.js'

const props = defineProps({
  /** @type {boolean} 弹窗是否可见 */
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'switch-session'])

const ragStore = useRagStore()

/** @type {import('vue').ComputedRef<Array>} 有消息的会话列表 */
const sessionsWithMessages = computed(() => ragStore.sessions.filter(s => s.messages.length > 0))

// ===== 重命名相关 =====
const renamingId = ref(null)
const renameValue = ref('')
const justFinishedRename = ref(false)

const confirmRename = async (id) => {
  if (renameValue.value.trim()) await ragStore.renameSession(id, renameValue.value.trim())
  renamingId.value = null
  justFinishedRename.value = true
  setTimeout(() => { justFinishedRename.value = false }, 200)
}

// ===== 三点菜单 =====
const menuOpenId = ref(null)
const menuStyle = ref({})

const toggleMenu = (event, id) => {
  if (menuOpenId.value === id) { menuOpenId.value = null; return }
  const rect = event.currentTarget.getBoundingClientRect()
  menuStyle.value = { position: 'fixed', top: rect.bottom + 4 + 'px', left: (rect.right - 140) + 'px' }
  menuOpenId.value = id
}

const startRename = () => {
  const session = ragStore.sessions.find(s => s.id === menuOpenId.value)
  if (session) { renamingId.value = session.id; renameValue.value = session.title }
  menuOpenId.value = null
  nextTick(() => {
    const inputs = document.querySelectorAll('.session-rename-input')
    if (inputs.length) inputs[inputs.length - 1].focus()
  })
}

// ===== 操作 =====
const handleSwitch = (id) => {
  if (renamingId.value || justFinishedRename.value) return
  menuOpenId.value = null
  emit('switch-session', id)
}

const handleDelete = async (id) => {
  menuOpenId.value = null
  await ragStore.deleteSession(id)
}

const handleClearAll = async () => {
  menuOpenId.value = null
  await ragStore.clearAllSessions()
  emit('close')
}

const close = () => {
  menuOpenId.value = null
  renamingId.value = null
  emit('close')
}
</script>

<style lang="scss" scoped>
.history-modal { width: 640px; max-height: 80vh; }
.session-item {
  display: flex; align-items: center; gap: 12px; padding: 4px 8px; border-radius: 10px;
  cursor: pointer; transition: background 0.15s; margin-bottom: 2px; position: relative;
  &:hover { background: var(--bg); }
  &.active { background: var(--active-bg); }
  &:hover .session-more-btn { opacity: 1; }
}
.session-icon { font-size: 14px; flex-shrink: 0; opacity: 0.5; color: var(--text-secondary); }
.session-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.session-title { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.session-rename-input { font-size: 14px; font-weight: 500; color: var(--text); border: 1px solid var(--primary); border-radius: 6px; padding: 3px 8px; outline: none; width: 100%; background: var(--card-bg); }
.session-more { flex-shrink: 0; }
.session-more-btn {
  width: 32px; height: 32px; border: none; background: none; border-radius: 8px; cursor: pointer;
  color: var(--text-secondary); display: flex; align-items: center; justify-content: center; transition: all 0.15s; opacity: 0;
  &:hover { background: var(--hover-bg); color: var(--text); }
}
.session-menu-overlay { position: fixed; inset: 0; z-index: 2000; }
.session-menu {
  z-index: 2001; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: 6px; min-width: 140px; animation: fadeIn 0.12s;
}
.session-menu-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-radius: 6px;
  font-size: 14px; color: var(--text); cursor: pointer; transition: background 0.12s; white-space: nowrap;
  &:hover { background: var(--bg); }
  &.delete { color: #f53f3f; &:hover { background: var(--danger-hover-bg); } }
}
.clear-btn {
  padding: 6px 16px; background: var(--card-bg); border: 1px solid #f53f3f; color: #f53f3f;
  border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s;
  &:hover { background: var(--danger-hover-bg); }
}
@media (max-width: 768px) { .history-modal { width: 95vw; max-height: 85vh; } }
</style>
