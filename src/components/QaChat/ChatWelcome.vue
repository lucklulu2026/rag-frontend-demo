<!--
  @component ChatWelcome
  @description 空状态欢迎页：Logo + 多行输入框 + 快捷提问标签
  @props modelValue {string} 输入框内容（v-model）
  @props loading {boolean} 是否正在加载
  @emits update:modelValue - 输入内容变化
  @emits send - 发送消息
-->
<template>
  <div class="qa-welcome">
    <div class="welcome-content">
      <!-- Logo -->
      <div class="welcome-logo">
        <LogoSvg class="welcome-logo-svg" />
      </div>
      <!-- 输入卡片 -->
      <div class="welcome-input-box">
        <textarea
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          class="welcome-textarea"
          placeholder="有什么问题尽管问..."
          rows="3"
          @keydown.enter.exact.prevent="$emit('send')"
          :disabled="loading"
        ></textarea>
        <div class="welcome-input-footer">
          <!-- 快捷提问 -->
          <div class="welcome-hints-inline">
            <span class="welcome-hint" @click="$emit('update:modelValue', '这个知识库里有什么内容？')">
              <BookOpen :size="13" /> 知识库内容
            </span>
            <span class="welcome-hint" @click="$emit('update:modelValue', '帮我总结一下文档的要点')">
              <FileText :size="13" /> 总结要点
            </span>
            <span class="welcome-hint" @click="$emit('update:modelValue', '这个项目的技术栈是什么？')">
              <Code :size="13" /> 技术栈
            </span>
          </div>
          <!-- 发送按钮 -->
          <button class="send-btn welcome-send" @click="$emit('send')" :disabled="loading || !modelValue?.trim()">
            <SendHorizonal :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { BookOpen, FileText, Code, SendHorizonal } from 'lucide-vue-next'
import LogoSvg from '../../assets/svg/logo2.svg?component'

defineProps({
  /** @type {string} 输入框绑定值 */
  modelValue: { type: String, default: '' },
  /** @type {boolean} 加载状态 */
  loading: { type: Boolean, default: false },
})

defineEmits(['update:modelValue', 'send'])
</script>

<style lang="scss" scoped>
.qa-welcome { flex: 1; display: flex; align-items: flex-start; justify-content: center; padding: 24px; padding-top: 15vh; }
.welcome-content { display: flex; flex-direction: column; align-items: center; max-width: 920px; width: 100%; }
.welcome-logo {
  display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
}
.welcome-logo-svg {
  width: 250px; height: 110px; color: var(--text);
  :deep(svg) { width: 100%; height: 100%; display: block; }
}
.welcome-input-box {
  width: 100%; background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 16px; padding: 16px; box-shadow: 0 2px 16px rgba(0,0,0,0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus-within { border-color: var(--primary); box-shadow: 0 4px 20px rgba(79,110,247,0.08); }
}
.welcome-textarea {
  width: 100%; border: none; background: transparent; font-size: 15px; color: var(--text);
  outline: none; resize: none; line-height: 1.6; font-family: inherit;
  &::placeholder { color: var(--text-secondary); }
}
.welcome-input-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.welcome-hints-inline { display: flex; gap: 6px; flex-wrap: wrap; }
.welcome-hint {
  padding: 5px 12px; background: var(--bg); border: 1px solid var(--border);
  border-radius: 16px; font-size: 12px; color: var(--text-secondary); cursor: pointer;
  transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 4px;
  &:hover { border-color: var(--primary); color: var(--primary); background: var(--active-bg); }
}
.welcome-send { width: 38px; height: 38px; }
// 发送按钮（复用全局渐变样式）
.send-btn {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6); color: #fff;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: all 0.2s; flex-shrink: 0;
  &:hover { background: linear-gradient(135deg, #3b5de7, #7c4ddb); box-shadow: 0 2px 12px rgba(79,110,247,0.3); transform: translateY(-1px); }
  &:disabled { background: #c9cdd4; cursor: not-allowed; box-shadow: none; transform: none; }
}
@media (max-width: 768px) {
  .welcome-content { padding: 0 8px; }
  .welcome-logo-svg { width: 60px; height: 60px; }
  .welcome-hints-inline { display: none; }
}
</style>
