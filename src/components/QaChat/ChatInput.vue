<!--
  @component ChatInput
  @description 底部输入区：多行文本框 + 渐变发送按钮（有对话时显示）
  @props modelValue {string} 输入框内容（v-model）
  @props loading {boolean} 是否正在加载
  @emits update:modelValue - 输入内容变化
  @emits send - 发送消息
-->
<template>
  <div class="qa-input-bar">
    <div class="qa-input-box">
      <textarea
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        class="qa-textarea"
        placeholder="有什么问题尽管问..."
        rows="2"
        @keydown.enter.exact.prevent="handleSend"
        :disabled="loading"
        :maxlength="maxLength"
      ></textarea>
      <div class="qa-input-footer">
        <div class="counter">{{ contentLength }}/{{ maxLength }}</div>
        <button class="send-btn" @click="handleSend" :disabled="sendDisabled">
          <SendHorizonal :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { SendHorizonal } from 'lucide-vue-next'

const props = defineProps({
  /** @type {string} 输入框绑定值 */
  modelValue: { type: String, default: '' },
  /** @type {boolean} 加载状态 */
  loading: { type: Boolean, default: false },
  /** @type {number} 最大输入长度 */
  maxLength: { type: Number, default: 1200 },
  /** @type {number} 发送防抖间隔（毫秒） */
  sendCooldownMs: { type: Number, default: 800 },
})

const emit = defineEmits(['update:modelValue', 'send'])
const lastSendAt = ref(0)

const contentLength = computed(() => props.modelValue?.length || 0)
const sendDisabled = computed(() => props.loading || !props.modelValue?.trim())

const handleSend = () => {
  if (sendDisabled.value) return
  const now = Date.now()
  if (now - lastSendAt.value < props.sendCooldownMs) return
  lastSendAt.value = now
  emit('send')
}
</script>

<style lang="scss" scoped>
.qa-input-bar { padding: 16px 24px 20px; background: var(--bg); }
.qa-input-box {
  max-width: 900px; margin: 0 auto; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 16px; padding: 14px 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.04); transition: border-color 0.2s, box-shadow 0.2s;
  &:focus-within { border-color: var(--primary); box-shadow: 0 4px 20px rgba(79,110,247,0.08); }
}
.qa-textarea {
  width: 100%; border: none; background: transparent; font-size: 14px; color: var(--text);
  outline: none; resize: none; line-height: 1.6; font-family: inherit;
  &::placeholder { color: var(--text-secondary); }
}
.qa-input-footer { display: flex; align-items: center; justify-content: flex-end; margin-top: 8px; }
.counter { font-size: 12px; color: var(--text-secondary); margin-right: 10px; }
.send-btn {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #4f6ef7, #8b5cf6); color: #fff;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 16px; transition: all 0.2s; flex-shrink: 0;
  &:hover { background: linear-gradient(135deg, #3b5de7, #7c4ddb); box-shadow: 0 2px 12px rgba(79,110,247,0.3); transform: translateY(-1px); }
  &:disabled { background: #c9cdd4; cursor: not-allowed; box-shadow: none; transform: none; }
}
@media (max-width: 768px) {
  .qa-input-bar { padding: 10px 12px 14px; }
  .qa-input-box { padding: 10px 12px; max-width: 100%; }
  .qa-textarea { font-size: 13px; }
}
</style>
