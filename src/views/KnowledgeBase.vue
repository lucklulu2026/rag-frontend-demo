<!--
  @view KnowledgeBase
  @description 个人知识库页面：卡片式文档管理，支持上传、搜索、排序
-->
<template>
  <div class="kb-page">
    <!-- 顶部栏 -->
    <div class="kb-header">
      <div class="kb-header-left">
        <router-link to="/app" class="kb-back"><ArrowLeft :size="18" /></router-link>
        <h2><Library :size="20" /> 个人知识库</h2>
      </div>
      <div class="kb-header-right">
        <div class="kb-search">
          <Search :size="15" />
          <input v-model="searchQuery" placeholder="搜索文档..." />
          <button v-if="searchQuery" class="kb-search-clear" @click="searchQuery = ''"><X :size="13" /></button>
        </div>
        <!-- 自定义排序下拉 -->
        <div class="kb-sort-wrap" @click.stop>
          <button class="kb-sort-btn" @click="showSortMenu = !showSortMenu">
            <ArrowUpDown :size="14" /> {{ sortLabels[sortBy] }}
            <ChevronDown :size="13" class="sort-arrow" :class="{ open: showSortMenu }" />
          </button>
          <div v-if="showSortMenu" class="kb-sort-menu">
            <div
              v-for="opt in sortOptions" :key="opt.value"
              class="kb-sort-option"
              :class="{ active: sortBy === opt.value }"
              @click="sortBy = opt.value; showSortMenu = false"
            >
              <component :is="opt.icon" :size="14" />
              {{ opt.label }}
              <Check v-if="sortBy === opt.value" :size="14" class="sort-check" />
            </div>
          </div>
        </div>
        <button class="kb-upload-btn" @click="$refs.fileInput.click()">
          <Upload :size="15" /> 上传文档
        </button>
        <input ref="fileInput" type="file" accept=".txt,.md,.pdf,.docx" @change="handleFileUpload" style="display:none" multiple />
      </div>
    </div>

    <!-- 标签筛选 -->
    <div class="kb-tags">
      <button class="kb-tag" :class="{ active: activeTag === '' }" @click="activeTag = ''">全部 ({{ ragStore.documentList.length }})</button>
      <button class="kb-tag" :class="{ active: activeTag === t }" v-for="t in ragStore.tags" :key="t" @click="activeTag = t">
        {{ t }} ({{ ragStore.documentList.filter(d => d.tag === t).length }})
      </button>
    </div>

    <!-- 文档卡片列表 -->
    <div class="kb-grid">
      <div v-if="!filteredDocs.length" class="kb-empty">
        <Inbox :size="40" />
        <p>{{ searchQuery ? '没有找到匹配的文档' : '还没有文档，点击上传开始吧' }}</p>
      </div>
      <div class="kb-card" v-for="doc in filteredDocs" :key="doc.fileName" @click="openPreview(doc)">
        <div class="kb-card-icon"><FileText :size="28" /></div>
        <div class="kb-card-info">
          <div class="kb-card-name">{{ doc.fileName }}</div>
          <div class="kb-card-meta">
            <span><Tag :size="12" /> {{ doc.tag }}</span>
            <span>{{ doc.textChunks.length }} 块</span>
            <span>{{ doc.uploadTime }}</span>
          </div>
        </div>
        <button class="kb-card-delete" @click.stop="handleDelete(doc.fileName)" title="删除">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="kb-uploading">
      <div class="kb-uploading-inner">
        <span class="spinner"></span> {{ uploadMsg }}
      </div>
    </div>

    <!-- 文档预览弹窗 -->
    <div v-if="previewDoc" class="modal-overlay" @click.self="previewDoc = null">
      <div class="modal kb-preview-modal">
        <div class="modal-header">
          <h3><FileText :size="16" /> {{ previewDoc.fileName }}</h3>
          <button class="modal-close" @click="previewDoc = null"><X :size="18" /></button>
        </div>
        <div class="preview-tabs">
          <button class="preview-tab" :class="{ active: previewTab === 'raw' }" @click="previewTab = 'raw'">原文</button>
          <button class="preview-tab" :class="{ active: previewTab === 'chunks' }" @click="previewTab = 'chunks'">分块 ({{ previewDoc.textChunks.length }})</button>
        </div>
        <div class="modal-body">
          <div v-if="previewTab === 'raw'" class="preview-raw">{{ previewDoc.rawText || '原文不可用（请重新上传）' }}</div>
          <div v-else class="preview-chunks">
            <div class="chunk-item" v-for="(c, i) in previewDoc.textChunks" :key="i">
              <span class="chunk-index">#{{ i + 1 }}</span>{{ c }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Library, Search, Upload, FileText, Tag, Trash2, Inbox, X, ArrowUpDown, ChevronDown, Check, Clock, ArrowDown, ArrowUp, Type, Layers } from 'lucide-vue-next'
import { useRagStore } from '../store/ragStore.js'
import { storeVectors, removeDocVectors, smartChunkText } from '../utils/services/vector.js'
import { parseDocument } from '../utils/services/docParser.js'
import { toast } from '../utils/tools/toast.js'

const ragStore = useRagStore()
onMounted(() => {
  ragStore.init()
  document.addEventListener('click', () => { showSortMenu.value = false })
})

const searchQuery = ref('')
const sortBy = ref('time-desc')
const showSortMenu = ref(false)
const sortOptions = [
  { value: 'time-desc', label: '最新上传', icon: ArrowDown },
  { value: 'time-asc', label: '最早上传', icon: ArrowUp },
  { value: 'name', label: '按名称', icon: Type },
  { value: 'chunks', label: '按分块数', icon: Layers },
]
const sortLabels = { 'time-desc': '最新上传', 'time-asc': '最早上传', 'name': '按名称', 'chunks': '按分块数' }
const activeTag = ref('')
const uploading = ref(false)
const uploadMsg = ref('')
const previewDoc = ref(null)
const previewTab = ref('raw')

/** 过滤 + 排序后的文档列表 */
const filteredDocs = computed(() => {
  let docs = [...ragStore.documentList]
  // 标签筛选
  if (activeTag.value) docs = docs.filter(d => d.tag === activeTag.value)
  // 搜索
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    docs = docs.filter(d => d.fileName.toLowerCase().includes(q))
  }
  // 排序
  switch (sortBy.value) {
    case 'time-desc': docs.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)); break
    case 'time-asc': docs.sort((a, b) => new Date(a.uploadTime) - new Date(b.uploadTime)); break
    case 'name': docs.sort((a, b) => a.fileName.localeCompare(b.fileName)); break
    case 'chunks': docs.sort((a, b) => b.textChunks.length - a.textChunks.length); break
  }
  return docs
})

const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files)
  if (!files.length) return
  uploading.value = true

  for (const file of files) {
    try {
      uploadMsg.value = `解析 ${file.name}...`
      const rawText = await parseDocument(file)
      const chunks = smartChunkText(rawText, { chunkSize: 300, overlap: 50 })
      uploadMsg.value = `向量化 ${file.name}（${chunks.length} 块）...`
      await ragStore.addDocument({ fileName: file.name, rawText, textChunks: chunks, tag: '默认', uploadTime: new Date().toLocaleString() })
      await storeVectors(file.name, chunks)
      toast.success(`${file.name} 入库成功`)
    } catch (err) {
      toast.error(`${file.name} 处理失败：${err.message}`)
    }
  }
  uploading.value = false
  e.target.value = ''
}

const handleDelete = async (fileName) => {
  await ragStore.removeDocument(fileName)
  await removeDocVectors(fileName)
  toast.info('文档已删除')
}

const openPreview = (doc) => { previewDoc.value = doc; previewTab.value = 'raw' }
</script>

<style lang="scss" scoped>
.kb-page { min-height: 100vh; background: var(--bg); padding: 24px 32px; }

// 顶部
.kb-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.kb-header-left { display: flex; align-items: center; gap: 12px;
  h2 { font-size: 20px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; margin: 0; }
}
.kb-back {
  width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card-bg); color: var(--text); display: flex; align-items: center;
  justify-content: center; text-decoration: none; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
}
.kb-header-right { display: flex; align-items: center; gap: 10px; }
.kb-search {
  display: flex; align-items: center; gap: 6px; padding: 7px 12px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
  color: var(--text-secondary); transition: border-color 0.2s;
  &:focus-within { border-color: var(--primary); }
  input { border: none; background: none; outline: none; font-size: 13px; color: var(--text); width: 160px;
    &::placeholder { color: var(--text-secondary); }
  }
}
.kb-search-clear {
  width: 20px; height: 20px; border: none; background: none; border-radius: 50%;
  color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  &:hover { background: var(--bg); color: var(--text); }
}

// 自定义排序下拉
.kb-sort-wrap { position: relative; }
.kb-sort-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--card-bg); font-size: 13px; color: var(--text);
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
  &:hover { border-color: var(--primary); }
}
.sort-arrow { transition: transform 0.2s; &.open { transform: rotate(180deg); } }
.kb-sort-menu {
  position: absolute; top: calc(100% + 6px); right: 0; z-index: 20;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1); padding: 6px; min-width: 160px;
  animation: fadeIn 0.15s;
}
.kb-sort-option {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 6px; font-size: 13px;
  color: var(--text); cursor: pointer; transition: background 0.12s;
  &:hover { background: var(--bg); }
  &.active { color: var(--primary); font-weight: 500; }
}
.sort-check { margin-left: auto; color: var(--primary); }
.kb-upload-btn {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: var(--primary); color: #fff; border: none; border-radius: 8px;
  font-size: 13px; cursor: pointer; transition: background 0.2s;
  &:hover { background: var(--primary-hover); }
}

// 标签
.kb-tags { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
.kb-tag {
  padding: 5px 14px; border: 1px solid var(--border); border-radius: 16px;
  background: var(--card-bg); font-size: 12px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.active { background: var(--primary); color: #fff; border-color: var(--primary); }
}

// 卡片网格
.kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.kb-empty {
  grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 60px 0; color: var(--text-secondary);
  p { font-size: 14px; }
}
.kb-card {
  display: flex; align-items: center; gap: 14px; padding: 16px;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  cursor: pointer; transition: all 0.15s; position: relative;
  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-1px); }
  &:hover .kb-card-delete { opacity: 1; }
}
.kb-card-icon { color: var(--primary); flex-shrink: 0; }
.kb-card-info { flex: 1; min-width: 0; }
.kb-card-name { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.kb-card-meta { display: flex; gap: 10px; font-size: 11px; color: var(--text-secondary);
  span { display: flex; align-items: center; gap: 3px; }
}
.kb-card-delete {
  position: absolute; top: 10px; right: 10px; width: 28px; height: 28px;
  border: none; background: none; border-radius: 6px; color: var(--text-secondary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: all 0.15s;
  &:hover { background: var(--danger-hover-bg); color: #f53f3f; }
}

// 上传进度
.kb-uploading {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 10px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); font-size: 13px; color: var(--text);
  display: flex; align-items: center; gap: 8px; z-index: 100;
}
.spinner {
  width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--primary);
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

// 预览弹窗
.kb-preview-modal { width: 700px; max-height: 80vh; }
.preview-tabs { display: flex; padding: 0 24px; border-bottom: 1px solid var(--border); }
.preview-tab {
  padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent;
  font-size: 14px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
  &:hover { color: var(--text); }
  &.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 500; }
}
.preview-raw { white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: var(--text); }
.preview-chunks { display: flex; flex-direction: column; gap: 8px; }

@media (max-width: 768px) {
  .kb-page { padding: 16px; }
  .kb-header { flex-direction: column; align-items: flex-start; }
  .kb-header-right { flex-wrap: wrap; }
  .kb-grid { grid-template-columns: 1fr; }
  .kb-preview-modal { width: 95vw; }
}
</style>
