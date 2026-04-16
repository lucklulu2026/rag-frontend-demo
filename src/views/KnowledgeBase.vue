<!--
  @view KnowledgeBase
  @description 个人知识库页面：卡片式文档管理，支持上传、搜索、排序
-->
<template>
  <div class="kb-page">
    <!-- 顶部栏：只留标题 -->
    <div class="kb-header">
      <router-link to="/app" class="kb-back"><ArrowLeft :size="18" /></router-link>
      <h2><Library :size="20" /> 个人知识库</h2>
    </div>

    <!-- 工具栏：标签 + 操作按钮同一行 -->
    <div class="kb-toolbar">
      <div class="kb-toolbar-left">
        <button class="kb-tag" :class="{ active: activeTag === '' }" @click="activeTag = ''">全部 ({{ ragStore.documentList.length }})</button>
        <button class="kb-tag" :class="{ active: activeTag === t }" v-for="t in ragStore.tags" :key="t" @click="activeTag = t">
          {{ t }} ({{ ragStore.documentList.filter(d => d.tag === t).length }})
        </button>
      </div>
      <div class="kb-toolbar-right">
        <!-- 搜索 -->
        <div class="kb-search" :class="{ expanded: searchExpanded }">
          <button class="kb-sm-btn" @click="searchExpanded = !searchExpanded; searchExpanded && $nextTick(() => $refs.searchInput?.focus())">
            <Search :size="14" />
          </button>
          <input v-if="searchExpanded" ref="searchInput" v-model="searchQuery" placeholder="搜索..."
            @blur="!searchQuery && (searchExpanded = false)" @keyup.escape="searchQuery = ''; searchExpanded = false" />
          <button v-if="searchQuery" class="kb-search-clear" @click="searchQuery = ''"><X :size="12" /></button>
        </div>
        <!-- 排序 -->
        <div class="kb-sort-wrap" @click.stop>
          <button class="kb-sm-btn" @click="showSortMenu = !showSortMenu" :title="'排序：' + sortLabels[sortBy]">
            <ArrowUpDown :size="14" />
          </button>
          <div v-if="showSortMenu" class="kb-sort-menu">
            <div v-for="opt in sortOptions" :key="opt.value" class="kb-sort-option"
              :class="{ active: sortBy === opt.value }" @click="sortBy = opt.value; showSortMenu = false">
              <component :is="opt.icon" :size="13" /> {{ opt.label }}
              <Check v-if="sortBy === opt.value" :size="13" class="sort-check" />
            </div>
          </div>
        </div>
        <!-- 上传 -->
        <button class="kb-sm-btn primary" @click="$refs.fileInput.click()" title="上传文档">
          <Upload :size="14" />
        </button>
        <input ref="fileInput" type="file" accept=".txt,.md,.pdf,.docx" @change="handleFileUpload" style="display:none" multiple />
      </div>
    </div>

    <!-- 文档卡片列表 -->
    <div class="kb-grid">
      <div v-if="!filteredDocs.length" class="kb-empty">
        <Inbox :size="40" />
        <p>{{ searchQuery ? '没有找到匹配的文档' : '还没有文档，点击上传开始吧' }}</p>
      </div>
      <div class="kb-card" v-for="doc in filteredDocs" :key="doc.fileName" @click="openPreview(doc)">
        <!-- 预览区：显示文档前几行内容 -->
        <div class="kb-card-preview">
          <p class="kb-card-preview-text">{{ getPreviewText(doc) }}</p>
        </div>
        <!-- 信息区 -->
        <div class="kb-card-body">
          <div class="kb-card-name" :title="doc.fileName">{{ doc.fileName }}</div>
          <div class="kb-card-footer">
            <span class="kb-card-type" :class="getFileType(doc.fileName)">
              <span class="type-letter">{{ getTypeLetter(doc.fileName) }}</span>
              {{ getTypeLabel(doc.fileName) }}
            </span>
            <span class="kb-card-time">{{ formatTime(doc.uploadTime) }}</span>
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
import { ArrowLeft, Library, Search, Upload, FileText, Tag, Trash2, Inbox, X, ArrowUpDown, ChevronDown, Check, Clock, ArrowDown, ArrowUp, Type, Layers, FileType, FileCode, FileImage } from 'lucide-vue-next'
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
const searchExpanded = ref(false)
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

/** 获取文件扩展名 */
const getFileExt = (name) => name.split('.').pop().toLowerCase()

/** 获取文件类型分类 */
const getFileType = (name) => {
  const ext = getFileExt(name)
  return { pdf: 'type-pdf', docx: 'type-docx', md: 'type-md', txt: 'type-txt' }[ext] || 'type-txt'
}

/** 获取类型字母标识 */
const getTypeLetter = (name) => {
  const ext = getFileExt(name)
  return { pdf: 'P', docx: 'W', md: 'M', txt: 'T' }[ext] || 'T'
}

/** 获取类型标签文字 */
const getTypeLabel = (name) => {
  const ext = getFileExt(name)
  return { pdf: 'PDF', docx: 'WORD', md: 'MARKDOWN', txt: 'TEXT' }[ext] || 'TEXT'
}

/** 获取文档预览文本（前 120 字） */
const getPreviewText = (doc) => {
  const raw = doc.rawText || doc.textChunks?.join(' ') || ''
  return raw.slice(0, 120).replace(/\n/g, ' ') || '暂无预览'
}

/** 格式化时间 */
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const parts = timeStr.split(' ')
  return parts[0] || timeStr
}

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

.kb-page { min-height: 100vh; background: var(--bg); }

.kb-header {
  display: flex; align-items: center; gap: 12px;
  padding: 18px 28px; background: var(--card-bg);
  h2 { font-size: 18px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; margin: 0; }
}
.kb-back {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); display: flex; align-items: center;
  justify-content: center; text-decoration: none; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
}

// 工具栏
.kb-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 28px; border-top: 1px solid var(--border); background: var(--card-bg);
  gap: 10px;
}
.kb-toolbar-left { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.kb-toolbar-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

.kb-sm-btn {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.primary { background: var(--primary); color: #fff; border-color: var(--primary);
    &:hover { background: var(--primary-hover); }
  }
}

.kb-search {
  display: flex; align-items: center;
  &.expanded {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding-right: 3px;
    .kb-sm-btn { border: none; background: none; width: 26px; }
    input { width: 110px; padding: 0 6px; }
    &:focus-within { border-color: var(--primary); }
  }
  input { border: none; background: none; outline: none; font-size: 12px; color: var(--text); width: 0; transition: width 0.2s;
    &::placeholder { color: var(--text-secondary); }
  }
}
.kb-search-clear {
  width: 18px; height: 18px; border: none; background: none; border-radius: 50%;
  color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;
  &:hover { color: var(--text); }
}

.kb-sort-wrap { position: relative; }
.kb-sort-menu {
  position: absolute; top: calc(100% + 4px); right: 0; z-index: 20;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1); padding: 4px; min-width: 130px;
}
.kb-sort-option {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 5px;
  font-size: 12px; color: var(--text); cursor: pointer; transition: background 0.12s;
  &:hover { background: var(--bg); }
  &.active { color: var(--primary); font-weight: 500; }
}
.sort-check { margin-left: auto; color: var(--primary); }

.kb-tag {
  padding: 4px 12px; border: 1px solid var(--border); border-radius: 14px;
  background: var(--card-bg); font-size: 12px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.active { background: var(--primary); color: #fff; border-color: var(--primary); }
}

// 卡片
.kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; padding: 20px 28px; }
.kb-empty {
  grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 60px 0; color: var(--text-secondary);
  p { font-size: 14px; }
}
.kb-card {
  display: flex; flex-direction: column; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 12px;
  cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
  &:hover .kb-card-delete { opacity: 1; }
}
.kb-card-preview {
  height: 100px; padding: 12px; background: var(--bg);
  border-bottom: 1px solid var(--border); overflow: hidden; position: relative;
  &::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 30px; background: linear-gradient(transparent, var(--bg)); }
}
.kb-card-preview-text { font-size: 11px; line-height: 1.5; color: var(--text-secondary); margin: 0; word-break: break-all; }
.kb-card-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.kb-card-name { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kb-card-footer { display: flex; align-items: center; justify-content: space-between; }
.kb-card-type {
  display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
  .type-letter { width: 16px; height: 16px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #fff; }
  &.type-pdf { color: #ef4444; .type-letter { background: #ef4444; } }
  &.type-docx { color: #3b82f6; .type-letter { background: #3b82f6; } }
  &.type-md { color: #10b981; .type-letter { background: #10b981; } }
  &.type-txt { color: #8b5cf6; .type-letter { background: #8b5cf6; } }
}
.kb-card-time { font-size: 11px; color: var(--text-secondary); }
.kb-card-delete {
  position: absolute; top: 6px; right: 6px; width: 24px; height: 24px;
  border: none; background: var(--card-bg); border-radius: 5px; color: var(--text-secondary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  &:hover { color: #f53f3f; }
}

.kb-uploading {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 10px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); font-size: 13px; color: var(--text);
  display: flex; align-items: center; gap: 8px; z-index: 100;
}
.spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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
  .kb-header { padding: 14px 16px; }
  .kb-toolbar { padding: 8px 16px; }
  .kb-grid { grid-template-columns: 1fr; padding: 16px; }
  .kb-preview-modal { width: 95vw; }
}
</style>
