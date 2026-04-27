<!--
  @view KnowledgeBase
  @description 个人知识库页面：左侧标签管理 + 右侧文档卡片列表，支持多选批量操作
-->
<template>
  <div class="kb-page">
    <!-- 顶部栏 -->
    <div class="kb-header">
      <router-link to="/app" class="kb-back"><ArrowLeft :size="18" /></router-link>
      <h2><Library :size="20" /> 个人知识库</h2>
      <div class="kb-header-right">
        <button class="kb-sm-btn" :class="{ active: selectMode }" @click="toggleSelectMode" title="多选">
          <CheckSquare :size="14" />
        </button>
        <div class="kb-search" :class="{ expanded: searchExpanded }">
          <button class="kb-sm-btn" @click="searchExpanded = !searchExpanded; searchExpanded && $nextTick(() => $refs.searchInput?.focus())">
            <Search :size="14" />
          </button>
          <input v-if="searchExpanded" ref="searchInput" v-model="searchQuery" placeholder="搜索..."
            @blur="!searchQuery && (searchExpanded = false)" @keyup.escape="searchQuery = ''; searchExpanded = false" />
        </div>
        <div class="kb-sort-wrap" @click.stop>
          <button class="kb-sm-btn" @click="showSortMenu = !showSortMenu"><ArrowUpDown :size="14" /></button>
          <div v-if="showSortMenu" class="kb-sort-menu">
            <div v-for="opt in sortOptions" :key="opt.value" class="kb-sort-option"
              :class="{ active: sortBy === opt.value }" @click="sortBy = opt.value; showSortMenu = false">
              <component :is="opt.icon" :size="13" /> {{ opt.label }}
              <Check v-if="sortBy === opt.value" :size="13" class="sort-check" />
            </div>
          </div>
        </div>
        <button class="kb-sm-btn primary" @click="$refs.fileInput.click()" title="上传文档"><Upload :size="14" /></button>
        <input ref="fileInput" type="file" accept=".txt,.md,.pdf,.docx" @change="handleFileUpload" style="display:none" multiple />
      </div>
    </div>

    <!-- 左右布局 -->
    <div class="kb-layout">
      <!-- 左侧：标签管理 -->
      <aside class="kb-sidebar">
        <div class="kb-sidebar-title">标签分组</div>
        <div class="kb-tag-list">
          <div class="kb-tag-item" :class="{ active: activeTag === '' }" @click="activeTag = ''">
            <span>全部</span>
            <span class="kb-tag-count">{{ ragStore.documentList.length }}</span>
          </div>
          <div class="kb-tag-item" v-for="t in ragStore.tags" :key="t"
            :class="{ active: activeTag === t }" @click="activeTag = t">
            <span>{{ t }}</span>
            <span class="kb-tag-count">{{ ragStore.documentList.filter(d => d.tag === t).length }}</span>
            <button v-if="t !== '默认'" class="kb-tag-delete" @click.stop="handleDeleteTag(t)" title="删除标签">
              <X :size="12" />
            </button>
          </div>
        </div>
        <!-- 新建标签 -->
        <div class="kb-tag-add">
          <input v-model="newTagInput" placeholder="新建标签..." @keyup.enter="handleAddTag" />
          <button v-if="newTagInput.trim()" @click="handleAddTag" class="kb-tag-add-btn">
            <Plus :size="14" />
          </button>
        </div>
      </aside>

      <!-- 右侧：文档列表 -->
      <main class="kb-main">
        <div class="kb-grid">
          <div v-if="!filteredDocs.length" class="kb-empty">
            <Inbox :size="40" />
            <p>{{ searchQuery ? '没有找到匹配的文档' : '还没有文档，点击上传开始吧' }}</p>
          </div>
          <div class="kb-card" v-for="doc in filteredDocs" :key="doc.fileName"
            :class="{ selected: selectedFiles.has(doc.fileName) }"
            @click="selectMode ? toggleSelect(doc.fileName) : openPreview(doc)">
            <!-- 多选 checkbox -->
            <div v-if="selectMode" class="kb-card-check">
              <div class="check-box" :class="{ checked: selectedFiles.has(doc.fileName) }">
                <Check v-if="selectedFiles.has(doc.fileName)" :size="12" />
              </div>
            </div>
            <div class="kb-card-preview">
              <p class="kb-card-preview-text">{{ getPreviewText(doc) }}</p>
            </div>
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
            <button v-if="!selectMode" class="kb-card-delete" @click.stop="handleDelete(doc.fileName)"><Trash2 :size="14" /></button>
          </div>
        </div>
      </main>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selectMode && selectedFiles.size > 0" class="kb-batch-bar">
      <span class="batch-count">已选 {{ selectedFiles.size }} 个</span>
      <button class="batch-btn" @click="handleBatchTag"><Tag :size="14" /> 改标签</button>
      <button class="batch-btn danger" @click="handleBatchDelete"><Trash2 :size="14" /> 删除</button>
      <button class="batch-btn cancel" @click="exitSelectMode">取消</button>
    </div>

    <!-- 改标签弹窗 -->
    <div v-if="showTagModal" class="modal-overlay" @click.self="showTagModal = false">
      <div class="modal tag-modal">
        <div class="modal-header">
          <h3><Tag :size="16" /> 修改标签</h3>
          <button class="modal-close" @click="showTagModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <p class="tag-modal-hint">为 {{ selectedFiles.size }} 个文档设置标签：</p>
          <div class="tag-modal-list">
            <button v-for="t in ragStore.tags" :key="t" class="tag-modal-item"
              :class="{ active: batchTag === t }" @click="batchTag = t">{{ t }}</button>
          </div>
          <div class="tag-modal-new">
            <input v-model="newBatchTag" placeholder="新标签名..." @keyup.enter="createAndSelectTag" />
            <button v-if="newBatchTag.trim()" class="tag-modal-add" @click="createAndSelectTag">创建</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="batch-btn cancel" @click="showTagModal = false">取消</button>
          <button class="batch-btn primary" @click="applyBatchTag" :disabled="!batchTag">确定</button>
        </div>
      </div>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="kb-uploading"><span class="spinner"></span> {{ uploadMsg }}</div>

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
          <div v-if="previewTab === 'raw'" class="preview-raw">{{ previewDoc.rawText || '原文不可用' }}</div>
          <div v-else class="preview-chunks">
            <div class="chunk-item" v-for="(c, i) in previewDoc.textChunks" :key="i"><span class="chunk-index">#{{ i + 1 }}</span>{{ c }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ArrowLeft, Library, Search, Upload, FileText, Tag, Trash2, Inbox, X, ArrowUpDown, Check, ArrowDown, ArrowUp, Type, Layers, CheckSquare, Plus } from 'lucide-vue-next'
import { useRagStore } from '../store/ragStore.js'
import { storeVectors, removeDocVectors, smartChunkText } from '../utils/services/vector.js'
import { parseDocument } from '../utils/services/docParser.js'
import { toast } from '../utils/tools/toast.js'
import { confirm } from '../utils/tools/confirm.js'

const ragStore = useRagStore()
onMounted(() => { ragStore.init(); document.addEventListener('click', () => { showSortMenu.value = false }) })

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
const activeTag = ref('')
const uploading = ref(false)
const uploadMsg = ref('')
const previewDoc = ref(null)
const previewTab = ref('raw')
const newTagInput = ref('')

const getFileExt = (name) => name.split('.').pop().toLowerCase()
const getFileType = (name) => ({ pdf: 'type-pdf', docx: 'type-docx', md: 'type-md', txt: 'type-txt' }[getFileExt(name)] || 'type-txt')
const getTypeLetter = (name) => ({ pdf: 'P', docx: 'W', md: 'M', txt: 'T' }[getFileExt(name)] || 'T')
const getTypeLabel = (name) => ({ pdf: 'PDF', docx: 'WORD', md: 'MD', txt: 'TXT' }[getFileExt(name)] || 'TXT')
const getPreviewText = (doc) => (doc.rawText || doc.textChunks?.join(' ') || '').slice(0, 120).replace(/\n/g, ' ') || '暂无预览'
const formatTime = (t) => t ? t.split(' ')[0] : ''

const filteredDocs = computed(() => {
  let docs = [...ragStore.documentList]
  if (activeTag.value) docs = docs.filter(d => d.tag === activeTag.value)
  if (searchQuery.value) { const q = searchQuery.value.toLowerCase(); docs = docs.filter(d => d.fileName.toLowerCase().includes(q)) }
  switch (sortBy.value) {
    case 'time-desc': docs.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)); break
    case 'time-asc': docs.sort((a, b) => new Date(a.uploadTime) - new Date(b.uploadTime)); break
    case 'name': docs.sort((a, b) => a.fileName.localeCompare(b.fileName)); break
    case 'chunks': docs.sort((a, b) => b.textChunks.length - a.textChunks.length); break
  }
  return docs
})

const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files); if (!files.length) return
  uploading.value = true
  for (const file of files) {
    try {
      uploadMsg.value = `解析 ${file.name}...`
      const rawText = await parseDocument(file)
      const chunks = smartChunkText(rawText, { chunkSize: 300, overlap: 50 })
      uploadMsg.value = `向量化 ${file.name}...`
      await ragStore.addDocument({ fileName: file.name, rawText, textChunks: chunks, tag: activeTag.value || '默认', uploadTime: new Date().toLocaleString() })
      await storeVectors(file.name, chunks)
      toast.success(`${file.name} 入库成功`)
    } catch (err) { toast.error(`${file.name} 失败：${err.message}`) }
  }
  uploading.value = false; e.target.value = ''
}

const handleDelete = async (fn) => {
  const ok = await confirm({ title: '删除文档', message: `确定删除「${fn}」？`, confirmText: '删除', type: 'danger' })
  if (!ok) return
  await ragStore.removeDocument(fn); await removeDocVectors(fn); toast.info('已删除')
}

const handleDeleteTag = async (tag) => {
  const ok = await confirm({
    title: '删除标签',
    message: `确定删除「${tag}」标签吗？该标签下的文档将移至默认分组。`,
    confirmText: '删除',
    type: 'danger',
  })
  if (!ok) return
  await ragStore.deleteTag(tag)
  if (activeTag.value === tag) activeTag.value = ''
  toast.info(`标签「${tag}」已删除，文档已移至默认`)
}

const handleAddTag = () => {
  const name = newTagInput.value.trim(); if (!name) return
  ragStore.addTag(name); newTagInput.value = ''; toast.success(`标签「${name}」已创建`)
}

const openPreview = (doc) => { previewDoc.value = doc; previewTab.value = 'raw' }

// 多选
const selectMode = ref(false)
const selectedFiles = ref(new Set())
const showTagModal = ref(false)
const batchTag = ref('')
const newBatchTag = ref('')

const toggleSelectMode = () => { selectMode.value = !selectMode.value; if (!selectMode.value) selectedFiles.value = new Set() }
const exitSelectMode = () => { selectMode.value = false; selectedFiles.value = new Set() }
const toggleSelect = (fn) => { const s = new Set(selectedFiles.value); s.has(fn) ? s.delete(fn) : s.add(fn); selectedFiles.value = s }

const handleBatchDelete = async () => {
  const n = selectedFiles.value.size
  const ok = await confirm({ title: '批量删除', message: `确定删除 ${n} 个文档？`, confirmText: `删除 ${n} 个`, type: 'danger' })
  if (!ok) return
  for (const fn of selectedFiles.value) { await ragStore.removeDocument(fn); await removeDocVectors(fn) }
  toast.success(`已删除 ${n} 个文档`); exitSelectMode()
}

const handleBatchTag = () => { batchTag.value = ''; newBatchTag.value = ''; showTagModal.value = true }
const createAndSelectTag = () => { const n = newBatchTag.value.trim(); if (!n) return; ragStore.addTag(n); batchTag.value = n; newBatchTag.value = '' }
const applyBatchTag = async () => {
  if (!batchTag.value) return
  for (const fn of selectedFiles.value) await ragStore.updateDocTag(fn, batchTag.value)
  toast.success(`已移至「${batchTag.value}」`); showTagModal.value = false; exitSelectMode()
}
</script>

<style lang="scss" scoped>
.kb-page { min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }

// 顶部
.kb-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 24px; background: var(--card-bg); border-bottom: 1px solid var(--border);
  h2 { font-size: 17px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; margin: 0; flex: 1; }
}
.kb-back {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); display: flex; align-items: center;
  justify-content: center; text-decoration: none; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
}
.kb-header-right { display: flex; align-items: center; gap: 4px; }
.kb-sm-btn {
  width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.active { border-color: var(--primary); color: var(--primary); background: var(--active-bg); }
  &.primary { background: var(--primary); color: #fff; border-color: var(--primary); &:hover { background: var(--primary-hover); } }
}
.kb-search {
  display: flex; align-items: center; height: 30px;
  &.expanded {
    background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding-right: 4px;
    .kb-sm-btn { border: none; background: none; width: 28px; height: 28px; }
    input { width: 120px; padding: 0 6px; }
    &:focus-within { border-color: var(--primary); }
  }
  input { border: none; background: none; outline: none; font-size: 12px; color: var(--text); width: 0; transition: width 0.2s; &::placeholder { color: var(--text-secondary); } }
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
  &:hover { background: var(--bg); } &.active { color: var(--primary); font-weight: 500; }
}
.sort-check { margin-left: auto; color: var(--primary); }

// 左右布局
.kb-layout { display: flex; flex: 1; overflow: hidden; }

// 左侧标签
.kb-sidebar {
  width: 200px; min-width: 200px; background: var(--card-bg); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; padding: 16px 0;
}
.kb-sidebar-title { font-size: 12px; color: var(--text-secondary); font-weight: 500; padding: 0 16px 10px; }
.kb-tag-list { flex: 1; overflow-y: auto; }
.kb-tag-item {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  font-size: 13px; color: var(--text); cursor: pointer; transition: all 0.12s;
  &:hover { background: var(--bg); }
  &.active { background: var(--active-bg); color: var(--primary); font-weight: 500; }
  span:first-child { flex: 1; }
}
.kb-tag-count { font-size: 11px; color: var(--text-secondary); background: var(--bg); padding: 1px 6px; border-radius: 8px; }
.kb-tag-delete {
  width: 20px; height: 20px; border: none; background: none; border-radius: 4px;
  color: var(--text-secondary); cursor: pointer; display: none; align-items: center; justify-content: center;
  &:hover { color: #f53f3f; background: var(--danger-hover-bg); }
}
.kb-tag-item:hover .kb-tag-delete { display: flex; }
.kb-tag-add {
  display: flex; gap: 4px; padding: 10px 12px; border-top: 1px solid var(--border); margin-top: 8px;
  input { flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; outline: none; background: var(--bg); color: var(--text);
    &:focus { border-color: var(--primary); } &::placeholder { color: var(--text-secondary); }
  }
}
.kb-tag-add-btn {
  width: 28px; height: 28px; border: none; border-radius: 6px; background: var(--primary);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
}

// 右侧文档
.kb-main { flex: 1; overflow-y: auto; }
.kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; padding: 18px 22px; }
.kb-empty {
  grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px 0; color: var(--text-secondary); p { font-size: 13px; }
}

// 卡片
.kb-card {
  display: flex; flex-direction: column; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 10px;
  cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
  &:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.05); transform: translateY(-1px); }
  &:hover .kb-card-delete { opacity: 1; }
  &.selected { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(79,110,247,0.15); }
}
.kb-card-check {
  position: absolute; top: 10px; left: 10px; z-index: 2;
}
.check-box {
  width: 24px; height: 24px; border-radius: 7px; border: 2px solid rgba(0,0,0,0.2);
  background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  &:hover { border-color: var(--primary); }
  &.checked { background: var(--primary); border-color: var(--primary); color: #fff; box-shadow: 0 2px 8px rgba(79,110,247,0.35); }
}
.kb-card-preview {
  height: 90px; padding: 10px; background: var(--bg);
  border-bottom: 1px solid var(--border); overflow: hidden; position: relative;
  &::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 24px; background: linear-gradient(transparent, var(--bg)); }
}
.kb-card-preview-text { font-size: 10px; line-height: 1.5; color: var(--text-secondary); margin: 0; word-break: break-all; }
.kb-card-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.kb-card-name { font-size: 13px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kb-card-footer { display: flex; align-items: center; justify-content: space-between; }
.kb-card-type {
  display: inline-flex; align-items: center; gap: 3px; font-size: 10px; letter-spacing: 0.3px;
  .type-letter { width: 15px; height: 15px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: #fff; }
  &.type-pdf { color: #ef4444; .type-letter { background: #ef4444; } }
  &.type-docx { color: #3b82f6; .type-letter { background: #3b82f6; } }
  &.type-md { color: #10b981; .type-letter { background: #10b981; } }
  &.type-txt { color: #8b5cf6; .type-letter { background: #8b5cf6; } }
}
.kb-card-time { font-size: 10px; color: var(--text-secondary); }
.kb-card-delete {
  position: absolute; top: 6px; right: 6px; width: 22px; height: 22px;
  border: none; background: var(--card-bg); border-radius: 5px; color: var(--text-secondary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  &:hover { color: #f53f3f; }
}

// 批量操作栏
.kb-batch-bar {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  padding: 8px 16px; box-shadow: 0 6px 24px rgba(0,0,0,0.12);
  display: flex; align-items: center; gap: 10px; z-index: 100;
}
.batch-count { font-size: 13px; color: var(--text); font-weight: 500; white-space: nowrap; }
.batch-btn {
  display: flex; align-items: center; gap: 4px; padding: 5px 12px;
  border: 1px solid var(--border); border-radius: 7px; background: var(--bg);
  font-size: 12px; color: var(--text); cursor: pointer; transition: all 0.15s; white-space: nowrap;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.danger { color: #f53f3f; border-color: #f53f3f; &:hover { background: var(--danger-hover-bg); } }
  &.cancel { color: var(--text-secondary); }
  &.primary { background: var(--primary); color: #fff; border-color: var(--primary); &:disabled { opacity: 0.5; } }
}

// 改标签弹窗
.tag-modal { width: 380px; }
.tag-modal-hint { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; }
.tag-modal-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.tag-modal-item {
  padding: 4px 12px; border: 1px solid var(--border); border-radius: 12px;
  background: var(--bg); font-size: 12px; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
  &:hover { border-color: var(--primary); color: var(--primary); }
  &.active { background: var(--primary); color: #fff; border-color: var(--primary); }
}
.tag-modal-new {
  display: flex; gap: 6px;
  input { flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 7px; font-size: 12px; outline: none; background: var(--bg); color: var(--text);
    &:focus { border-color: var(--primary); } &::placeholder { color: var(--text-secondary); }
  }
}
.tag-modal-add { padding: 6px 12px; background: var(--primary); color: #fff; border: none; border-radius: 7px; font-size: 12px; cursor: pointer; }

// 其他
.kb-uploading {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 8px 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); font-size: 13px; color: var(--text);
  display: flex; align-items: center; gap: 8px; z-index: 100;
}
.spinner { width: 14px; height: 14px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.kb-preview-modal { width: 700px; max-height: 80vh; }
.preview-tabs { display: flex; padding: 0 24px; border-bottom: 1px solid var(--border); }
.preview-tab {
  padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent;
  font-size: 14px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
  &:hover { color: var(--text); } &.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 500; }
}
.preview-raw { white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: var(--text); }
.preview-chunks { display: flex; flex-direction: column; gap: 8px; }

@media (max-width: 768px) {
  .kb-layout { flex-direction: column; }
  .kb-sidebar { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid var(--border); padding: 10px 0; }
  .kb-tag-list { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 12px; }
  .kb-tag-item { padding: 4px 10px; border-radius: 12px; border: 1px solid var(--border); font-size: 12px; &.active { border-color: var(--primary); } }
  .kb-tag-count { display: none; }
  .kb-tag-delete { display: none !important; }
  .kb-tag-add { border-top: none; padding: 6px 12px; }
  .kb-grid { grid-template-columns: 1fr; padding: 12px; }
  .kb-preview-modal { width: 95vw; }
}
</style>
