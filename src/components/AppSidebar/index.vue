<!--
  @component AppSidebar
  @description 全局左侧边栏：Logo、新对话、知识库入口、历史对话列表、底部用户信息
-->
<template>
  <aside class="sidebar" :class="{ open: sidebarOpen }">
    <!-- 顶部：Logo + 收起按钮 -->
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <img src="../../assets/images/animal_logo.png" alt="mascot" class="sidebar-mascot" />
        <LogoSvg class="sidebar-logo-svg" />
      </div>
      <button class="sidebar-collapse-btn" @click="$emit('toggle')" title="收起侧边栏">
        <PanelLeftClose :size="18" />
      </button>
    </div>

    <!-- 新对话按钮 -->
    <div class="sidebar-actions">
      <button class="new-chat-btn" @click="handleNewChat">
        <SquarePen :size="16" /> 新对话
        <span class="shortcut-tag">Ctrl+K</span>
      </button>
    </div>

    <!-- 导航入口 -->
    <div class="sidebar-nav">
      <router-link to="/knowledge" class="nav-item nav-knowledge">
        <BookMarked :size="17" /> 个人知识库
        <ChevronRight :size="14" class="nav-arrow" />
      </router-link>
    </div>

    <!-- 历史对话列表 -->
    <div class="sidebar-sessions">
      <div class="sessions-title">历史对话</div>
      <div class="sessions-list">
        <div v-if="!sessionsWithMessages.length" class="sessions-empty">暂无对话记录</div>
        <div
          v-for="s in sessionsWithMessages"
          :key="s.id"
          class="session-item"
          :class="{ active: s.id === ragStore.currentSessionId }"
          @click="handleSwitch(s.id)"
        >
          <MessageSquare :size="14" class="session-icon" />
          <span class="session-title">{{ s.title }}</span>
          <!-- 三点菜单 -->
          <button class="session-more-btn" @click.stop="toggleMenu($event, s.id)">
            <MoreHorizontal :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- 底部：用户信息 -->
    <div class="sidebar-footer">
      <button class="user-btn" @click="showUserMenu = !showUserMenu">
        <div class="user-avatar">U</div>
        <span class="user-name">用户</span>
        <ChevronRight :size="14" class="user-arrow" :class="{ expanded: showUserMenu }" />
      </button>
      <!-- 用户菜单浮窗 -->
      <div v-if="showUserMenu" class="user-menu">
        <div class="user-menu-item" @click="toggleTheme(); showUserMenu = false">
          <Moon v-if="theme === 'light'" :size="15" /> <Sun v-else :size="15" />
          {{ theme === 'light' ? '暗色模式' : '亮色模式' }}
        </div>
        <div class="user-menu-item disabled">
          <User :size="15" /> 个人信息（即将上线）
        </div>
      </div>
    </div>

    <!-- 会话操作菜单（Teleport 避免 overflow 裁剪） -->
    <Teleport to="body">
      <div v-if="menuOpenId" class="menu-overlay" @click="menuOpenId = null">
        <div class="context-menu" :style="menuStyle" @click.stop>
          <div class="context-menu-item" @click="startRename">
            <Pen :size="14" /> 重命名
          </div>
          <div class="context-menu-item delete" @click="handleDelete">
            <Trash2 :size="14" /> 删除
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 重命名弹窗 -->
    <div v-if="renamingId" class="modal-overlay" @click.self="renamingId = null">
      <div class="rename-modal">
        <div class="rename-title">重命名对话</div>
        <input v-model="renameValue" class="rename-input" @keyup.enter="confirmRename" autofocus />
        <div class="rename-actions">
          <button class="rename-cancel" @click="renamingId = null">取消</button>
          <button class="rename-confirm" @click="confirmRename">确定</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import {
  PanelLeftClose, SquarePen, BookMarked, ChevronRight,
  MessageSquare, MoreHorizontal, Pen, Trash2,
  Moon, Sun, User
} from 'lucide-vue-next'
import { useRagStore } from '../../store/ragStore.js'
import { theme, toggleTheme } from '../../utils/tools/theme.js'
import { confirm } from '../../utils/tools/confirm.js'
import LogoSvg from '../../assets/svg/logo12.svg?component'

defineProps({
  sidebarOpen: { type: Boolean, default: false }
})
const emit = defineEmits(['toggle', 'new-chat', 'switch-session'])

const ragStore = useRagStore()
const sessionsWithMessages = computed(() => ragStore.sessions.filter(s => s.messages.length > 0))

// 用户菜单
const showUserMenu = ref(false)

// 新对话
const handleNewChat = async () => {
  await ragStore.newChat()
  emit('new-chat')
}

// 切换会话
const handleSwitch = (id) => {
  ragStore.switchSession(id)
  emit('switch-session', id)
}

// 三点菜单
const menuOpenId = ref(null)
const menuStyle = ref({})
const toggleMenu = (event, id) => {
  if (menuOpenId.value === id) { menuOpenId.value = null; return }
  const rect = event.currentTarget.getBoundingClientRect()
  menuStyle.value = { position: 'fixed', top: rect.bottom + 4 + 'px', left: rect.left + 'px' }
  menuOpenId.value = id
}

// 重命名
const renamingId = ref(null)
const renameValue = ref('')
const startRename = () => {
  const session = ragStore.sessions.find(s => s.id === menuOpenId.value)
  if (session) { renamingId.value = session.id; renameValue.value = session.title }
  menuOpenId.value = null
}
const confirmRename = async () => {
  if (renameValue.value.trim()) await ragStore.renameSession(renamingId.value, renameValue.value.trim())
  renamingId.value = null
}

// 删除
const handleDelete = async () => {
  const ok = await confirm({
    title: '删除对话',
    message: '确定要删除这条对话吗？删除后无法恢复。',
    confirmText: '删除',
    type: 'danger',
  })
  if (!ok) return
  await ragStore.deleteSession(menuOpenId.value)
  menuOpenId.value = null
}
</script>

<style lang="scss" scoped>
.sidebar {
  width: 260px; min-width: 260px; height: 100vh;
  background: var(--card-bg); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden;
}

// 顶部
.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 8px;
}
.sidebar-logo {
  display: flex; align-items: center; gap: 6px;
}
.sidebar-mascot { width: 32px; height: 32px; object-fit: contain; }
.sidebar-logo-svg {
  height: 40px; width: 90px; color: var(--text);
  :deep(svg) { width: auto; height: 100%; display: block; }
}
.sidebar-collapse-btn {
  width: 32px; height: 32px; border: none; background: none; border-radius: 8px;
  color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  &:hover { background: var(--bg); color: var(--text); }
}

// 新对话
.sidebar-actions { padding: 8px 12px; }
.new-chat-btn {
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: none; border: 1px solid var(--border);
  border-radius: 10px; font-size: 14px; color: var(--text); cursor: pointer;
  transition: all 0.15s;
  &:hover { background: var(--bg); border-color: var(--primary); color: var(--primary); }
}
.shortcut-tag {
  margin-left: auto; font-size: 10px; color: var(--text-secondary);
  background: var(--bg); padding: 2px 6px; border-radius: 4px;
}

// 导航
.sidebar-nav { padding: 4px 12px; }
.nav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; border-radius: 8px; font-size: 14px;
  color: var(--text); text-decoration: none; transition: all 0.15s;
  &:hover { background: var(--bg); }
}
.nav-knowledge {
  font-weight: 500;
  &:hover { color: var(--primary); background: var(--active-bg); }
}
.nav-arrow { margin-left: auto; opacity: 0.5; }

// 历史对话
.sidebar-sessions { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; }
.sessions-title { font-size: 12px; color: var(--text-secondary); padding: 4px 14px 8px; font-weight: 500; }
.sessions-empty { font-size: 13px; color: var(--text-secondary); padding: 12px 14px; text-align: center; }
.sessions-list { flex: 1; }

.session-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px; cursor: pointer;
  transition: background 0.12s; margin-bottom: 2px;
  &:hover { background: var(--bg); }
  &:hover .session-more-btn { opacity: 1; }
  &.active { background: var(--active-bg); }
}
.session-icon { flex-shrink: 0; color: var(--text-secondary); opacity: 0.6; }
.session-title {
  flex: 1; font-size: 13px; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.session-more-btn {
  width: 26px; height: 26px; border: none; background: none; border-radius: 6px;
  color: var(--text-secondary); cursor: pointer; display: flex; align-items: center;
  justify-content: center; opacity: 0; transition: all 0.12s; flex-shrink: 0;
  &:hover { background: var(--hover-bg); color: var(--text); }
}

// 底部用户
.sidebar-footer { padding: 8px 12px 12px; border-top: 1px solid var(--border); position: relative; }
.user-btn {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; background: none; border: none; border-radius: 10px;
  cursor: pointer; transition: background 0.15s; color: var(--text);
  &:hover { background: var(--bg); }
}
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: var(--primary);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.user-name { font-size: 14px; flex: 1; text-align: left; }
.user-arrow { color: var(--text-secondary); transition: transform 0.2s; &.expanded { transform: rotate(90deg); } }

.user-menu {
  position: absolute; bottom: 68px; left: 12px; right: 12px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1); padding: 6px; z-index: 10;
}
.user-menu-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: 6px; font-size: 13px;
  color: var(--text); cursor: pointer; transition: background 0.12s;
  &:hover { background: var(--bg); }
  &.disabled { color: var(--text-secondary); cursor: default; opacity: 0.6; &:hover { background: none; } }
}

// 右键菜单
.menu-overlay { position: fixed; inset: 0; z-index: 2000; }
.context-menu {
  z-index: 2001; background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 6px; min-width: 130px;
}
.context-menu-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 6px; font-size: 13px;
  color: var(--text); cursor: pointer; transition: background 0.12s;
  &:hover { background: var(--bg); }
  &.delete { color: #f53f3f; &:hover { background: var(--danger-hover-bg); } }
}

// 重命名弹窗
.rename-modal {
  background: var(--card-bg); border-radius: 12px; padding: 20px;
  width: 360px; box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}
.rename-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }
.rename-input {
  width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px;
  font-size: 14px; color: var(--text); background: var(--bg); outline: none;
  &:focus { border-color: var(--primary); }
}
.rename-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.rename-cancel {
  padding: 6px 16px; border: 1px solid var(--border); border-radius: 8px;
  background: none; color: var(--text-secondary); cursor: pointer; font-size: 13px;
  &:hover { background: var(--bg); }
}
.rename-confirm {
  padding: 6px 16px; border: none; border-radius: 8px;
  background: var(--primary); color: #fff; cursor: pointer; font-size: 13px;
  &:hover { background: var(--primary-hover); }
}

// 移动端
@media (max-width: 768px) {
  .sidebar {
    position: fixed; left: 0; top: 0; z-index: 100;
    transform: translateX(-100%); transition: transform 0.3s ease;
    width: 85vw; max-width: 300px;
    &.open { transform: translateX(0); box-shadow: 4px 0 20px rgba(0,0,0,0.15); }
  }
  .shortcut-tag { display: none; }
}
</style>
