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
          <!-- 检索模式选择 -->
          <div class="welcome-hints-inline">
            <span class="welcome-hint" :class="{ active: searchMode === 'all' }" @click="setMode('all')">
              <Globe :size="13" /> 全文档检索
            </span>
            <span class="welcome-hint" :class="{ active: searchMode === 'precise' }" @click="setMode('precise')">
              <Target :size="13" /> 精确检索
            </span>
          </div>
          <button class="send-btn welcome-send" @click="$emit('send')" :disabled="loading || !modelValue?.trim()">
            <SendHorizonal :size="16" />
          </button>
        </div>
        <!-- 精确检索：选择标签/文档 -->
        <div v-if="searchMode === 'precise'" class="precise-selector">
          <div class="precise-tabs">
            <button :class="{ active: preciseTab === 'tag' }" @click="preciseTab = 'tag'">按标签</button>
            <button :class="{ active: preciseTab === 'doc' }" @click="preciseTab = 'doc'">按文档</button>
          </div>
          <div v-if="preciseTab === 'tag'" class="precise-list">
            <label v-for="t in ragStore.tags" :key="t" class="precise-item">
              <input type="checkbox" :value="t" v-model="selectedTags" />
              <span>{{ t }}</span>
              <span class="precise-count">{{ ragStore.documentList.filter(d => d.tag === t).length }}</span>
            </label>
          </div>
          <div v-else class="precise-list">
            <label v-for="doc in ragStore.documentList" :key="doc.fileName" class="precise-item">
              <input type="checkbox" :value="doc.fileName" v-model="selectedDocs" />
              <span>{{ doc.fileName }}</span>
            </label>
          </div>
          <div v-if="filterSummary" class="precise-summary">{{ filterSummary }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Globe, Target, SendHorizonal } from 'lucide-vue-next'
import { useRagStore } from '../../store/ragStore.js'
import LogoSvg from '../../assets/svg/logo2.svg?component'

const ragStore = useRagStore()

const props = defineProps({
  modelValue: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'send', 'update:searchFilter'])

/** 检索模式：all=全文档, precise=精确 */
const searchMode = ref('all')
const preciseTab = ref('tag')
const selectedTags = ref([])
const selectedDocs = ref([])

const setMode = (mode) => {
  searchMode.value = mode
  if (mode === 'all') { selectedTags.value = []; selectedDocs.value = [] }
}

/** 根据选择的标签解析出文件名列表 */
const filterFileNames = computed(() => {
  if (searchMode.value === 'all') return null
  if (preciseTab.value === 'tag' && selectedTags.value.length > 0) {
    return ragStore.documentList.filter(d => selectedTags.value.includes(d.tag)).map(d => d.fileName)
  }
  if (preciseTab.value === 'doc' && selectedDocs.value.length > 0) {
    return [...selectedDocs.value]
  }
  return null
})

const filterSummary = computed(() => {
  if (!filterFileNames.value) return ''
  return `将在 ${filterFileNames.value.length} 个文档中检索`
})

// 把过滤条件同步给父组件
watch(filterFileNames, (val) => { emit('update:searchFilter', val) }, { immediate: true })
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
  &.active { background: var(--primary); color: #fff; border-color: var(--primary); }
}

// 精确检索选择器
.precise-selector {
  margin-top: 10px; border-top: 1px solid var(--border); padding-top: 10px;
}
.precise-tabs {
  display: flex; gap: 4px; margin-bottom: 8px;
  button {
    padding: 4px 12px; border: 1px solid var(--border); border-radius: 6px;
    background: var(--bg); font-size: 12px; color: var(--text-secondary); cursor: pointer;
    transition: all 0.15s;
    &:hover { border-color: var(--primary); color: var(--primary); }
    &.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  }
}
.precise-list {
  max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
}
.precise-item {
  display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px;
  font-size: 13px; color: var(--text); cursor: pointer; transition: background 0.12s;
  &:hover { background: var(--bg); }
  input[type="checkbox"] {
    width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;
  }
}
.precise-count { margin-left: auto; font-size: 11px; color: var(--text-secondary); }
.precise-summary { margin-top: 6px; font-size: 12px; color: var(--primary); }
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
  .qa-welcome { padding: 16px; padding-top: 8vh; }
  .welcome-content { padding: 0; max-width: 100%; }
  .welcome-logo-svg { width: 180px; height: 85px; }
  .welcome-input-box { padding: 12px; }
  .welcome-textarea { font-size: 14px; }
  .welcome-hints-inline { display: none; }
}
</style>
