<template>
  <div class="upload-container">
    <div class="upload-header">
      <h3><Library :size="18" class="icon-inline" /> 知识库</h3>
    </div>
    <div class="upload-body">
      <!-- 上传区：拖拽风格 -->
      <div
        class="upload-drop-zone"
        :class="{ 'has-file': fileName, 'is-parsing': parsing }"
        @click="$refs.fileInput.click()"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <input ref="fileInput" type="file" accept=".txt,.md,.pdf,.docx" @change="handleFileUpload" style="display:none" />
        <template v-if="!fileName">
          <div class="drop-icon">📂</div>
          <div class="drop-text">点击或拖拽文件到这里</div>
          <div class="drop-hint">支持 TXT / MD / PDF / DOCX</div>
        </template>
        <template v-else>
          <div class="drop-file-row">
            <span class="drop-file-icon"><FileText :size="18" /></span>
            <span class="drop-file-name">{{ fileName }}</span>
            <button class="drop-file-clear" @click.stop="clearFile" title="清除"><X :size="12" /></button>
          </div>
        </template>
      </div>

      <!-- 标签 + 入库按钮 -->
      <div v-if="fileName" class="upload-actions">
        <div class="tag-select-row">
          <select v-model="selectedTag" class="tag-dropdown">
            <option v-for="t in ragStore.tags" :key="t" :value="t">{{ t }}</option>
          </select>
          <button class="tag-add-btn" @click="showNewTag = !showNewTag" :class="{ active: showNewTag }">
            {{ showNewTag ? '✕' : '+ 标签' }}
          </button>
        </div>
        <div v-if="showNewTag" class="tag-new-row">
          <input v-model="newTagName" class="tag-new-input" placeholder="新标签名..." @keyup.enter="createTag" />
          <button class="tag-confirm-btn" @click="createTag" :disabled="!newTagName.trim()">创建</button>
        </div>
        <button class="btn btn-upload" @click="handleParseFile" :disabled="parsing">
          <span v-if="!parsing"><Zap :size="14" /> 解析并入库</span>
          <span v-else class="btn-loading">
            <span class="spinner"></span>
            {{ parseStatus === 'parsing' ? '解析中' : '向量化中' }}
          </span>
        </button>
      </div>

      <!-- 状态提示 -->
      <div v-if="parseStatus" class="parse-status" :class="parseStatus">
        <span class="parse-status-dot"></span>
        <span>{{ parseStatusMsg }}</span>
      </div>

      <!-- 分组文档列表 -->
      <div v-if="ragStore.documentList.length" class="kb-section">
        <div class="kb-group" v-for="(docs, tag) in ragStore.groupedDocuments" :key="tag">
          <div class="kb-group-header" @click="toggleGroup(tag)">
            <div class="kb-group-left">
              <span class="kb-group-arrow" :class="{ expanded: expandedGroups[tag] !== false }"><ChevronRight :size="12" /></span>
              <span class="kb-group-tag">{{ tag }}</span>
              <span class="kb-group-count">{{ docs.length }}</span>
            </div>
            <button
              v-if="tag !== '默认'"
              class="kb-group-delete"
              @click.stop="handleDeleteTag(tag)"
              title="删除分组（文档移至默认）"
            ><Trash2 :size="14" /></button>
          </div>
          <div v-if="expandedGroups[tag] !== false" class="kb-group-list">
            <div class="kb-item" v-for="doc in docs" :key="doc.fileName" @click="openPreview(doc)">
              <div class="kb-item-info">
                <span class="kb-item-icon"><FileText :size="16" /></span>
                <div class="kb-item-meta">
                  <span class="kb-item-name">{{ doc.fileName }}</span>
                  <span class="kb-item-detail">{{ doc.textChunks.length }} 块 · {{ doc.uploadTime }}</span>
                </div>
              </div>
              <button class="kb-delete-btn" @click.stop="handleDeleteDoc(doc.fileName)" title="移除"><X :size="12" /></button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!ragStore.documentList.length && !fileName" class="kb-empty">
        <Inbox :size="28" />
        <span>还没有文档，上传一个试试</span>
      </div>
    </div>

    <!-- 文档预览弹窗 -->
    <div v-if="previewDoc" class="modal-overlay" @click.self="previewDoc = null">
      <div class="modal doc-preview-modal">
        <div class="modal-header">
          <h3><FileText :size="16" /> {{ previewDoc.fileName }}</h3>
          <button class="modal-close" @click="previewDoc = null"><X :size="18" /></button>
        </div>
        <div class="preview-tabs">
          <button class="preview-tab" :class="{ active: previewTab === 'raw' }" @click="previewTab = 'raw'"><FileTextIcon :size="14" /> 原文</button>
          <button class="preview-tab" :class="{ active: previewTab === 'chunks' }" @click="previewTab = 'chunks'"><Puzzle :size="14" /> 分块（{{ previewDoc.textChunks.length }}）</button>
        </div>
        <div class="modal-body">
          <div v-if="previewTab === 'raw'" class="preview-raw">{{ previewDoc.rawText || '原文内容不可用（请重新上传文档）' }}</div>
          <div v-else class="preview-chunks">
            <div class="chunk-item" v-for="(chunk, index) in previewDoc.textChunks" :key="index">
              <span class="chunk-index">#{{ index + 1 }}</span>{{ chunk }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <span class="preview-meta"><Tag :size="12" /> {{ previewDoc.tag || '默认' }} · {{ previewDoc.uploadTime }} · {{ previewDoc.textChunks.length }} 个文本块</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRagStore } from '../../store/ragStore.js'
import { storeVectors, removeDocVectors, smartChunkText } from '../../utils/services/vector.js'
import { parseDocument } from '../../utils/services/docParser.js'
import { toast } from '../../utils/tools/toast.js'
import {
  Library, Upload, FileText, FileType, X, Plus, Tag, Zap,
  ChevronRight, Trash2, FolderOpen, Inbox,
  FileText as FileTextIcon, Puzzle
} from 'lucide-vue-next'

const ragStore = useRagStore()
const file = ref(null)
const fileName = ref('')
const parsing = ref(false)
const parseStatus = ref('')
const parseStatusMsg = ref('')
const previewDoc = ref(null)
const previewTab = ref('raw')
const selectedTag = ref('默认')
const showNewTag = ref(false)
const newTagName = ref('')
const expandedGroups = reactive({})

const getFileIcon = (name) => {
  // 不再返回 emoji，由模板中的 Lucide 组件统一处理
  return name
}

const toggleGroup = (tag) => {
  expandedGroups[tag] = expandedGroups[tag] === false ? true : false
}

const createTag = () => {
  const name = newTagName.value.trim()
  if (!name) return
  ragStore.addTag(name)
  selectedTag.value = name
  newTagName.value = ''
  showNewTag.value = false
}

const clearFile = () => {
  file.value = null
  fileName.value = ''
  parseStatus.value = ''
  parseStatusMsg.value = ''
}

const handleDrop = (e) => {
  const droppedFile = e.dataTransfer.files[0]
  if (droppedFile) {
    const ext = droppedFile.name.split('.').pop().toLowerCase()
    if (['txt', 'md', 'pdf', 'docx'].includes(ext)) {
      file.value = droppedFile
      fileName.value = droppedFile.name
      parseStatus.value = ''
      parseStatusMsg.value = ''
    } else {
      toast.error('不支持的文件格式，请上传 TXT/MD/PDF/DOCX 文件')
    }
  }
}

const handleFileUpload = (e) => {
  const selectedFile = e.target.files[0]
  if (selectedFile) {
    file.value = selectedFile
    fileName.value = selectedFile.name
    parseStatus.value = ''
    parseStatusMsg.value = ''
  }
}

const handleParseFile = async () => {
  if (!file.value) return
  parsing.value = true
  parseStatus.value = 'parsing'
  parseStatusMsg.value = '正在解析文档内容...'

  try {
    const rawText = await parseDocument(file.value)
    const chunks = smartChunkText(rawText, { chunkSize: 300, overlap: 50 })

    parseStatus.value = 'vectorizing'
    parseStatusMsg.value = `正在向量化 ${chunks.length} 个文本块...`

    await ragStore.addDocument({
      fileName: fileName.value,
      rawText,
      textChunks: chunks,
      tag: selectedTag.value,
      uploadTime: new Date().toLocaleString()
    })

    await storeVectors(fileName.value, chunks)
    parseStatus.value = 'done'
    parseStatusMsg.value = `入库成功！${chunks.length} 个文本块`
    toast.success(`文档入库成功，共 ${chunks.length} 个文本块`)
  } catch (err) {
    console.error('文档解析失败：', err)
    parseStatus.value = 'error'
    parseStatusMsg.value = `失败：${err.message}`
    toast.error(`文档处理失败：${err.message}`)
  } finally {
    parsing.value = false
  }
}

const handleDeleteDoc = async (docFileName) => {
  await ragStore.removeDocument(docFileName)
  await removeDocVectors(docFileName)
  if (docFileName === fileName.value) clearFile()
}

const handleDeleteTag = async (tag) => {
  await ragStore.deleteTag(tag)
  if (selectedTag.value === tag) selectedTag.value = '默认'
}

const openPreview = (doc) => {
  previewDoc.value = doc
  previewTab.value = 'raw'
}
</script>

<style lang="scss" scoped>
.upload-container {
  width: 300px;
  min-width: 300px;
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.upload-header {
  height: 64px;
  padding: 20px;
  border-bottom: 1px solid var(--border);
  h3 {
    font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 0;
    display: flex; align-items: center; gap: 6px;
  }
}

.upload-body { padding: 16px 20px; flex: 1; overflow-y: auto; }

// 拖拽上传区
.upload-drop-zone {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 28px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: var(--drop-bg);
  margin-bottom: 12px;

  &:hover {
    border-color: var(--primary);
    background: var(--active-bg);

    .drop-icon { color: var(--primary); transform: translateY(-2px); }
    .drop-text { color: var(--primary); }
  }
  &.has-file { border-style: solid; border-color: var(--primary); background: var(--active-bg); padding: 14px 16px; }
  &.is-parsing { opacity: 0.6; pointer-events: none; }
}

.drop-icon {
  font-size: 32px;
  margin-bottom: 10px;
  opacity: 0.7;
  transition: all 0.25s;
}
.drop-text { font-size: 14px; color: var(--text); font-weight: 500; margin-bottom: 4px; transition: color 0.2s; }
.drop-hint { font-size: 12px; color: var(--text-secondary); }

.drop-file {
  &-row { display: flex; align-items: center; gap: 8px; }
  &-icon { font-size: 20px; }
  &-name { flex: 1; font-size: 14px; font-weight: 500; color: var(--primary); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &-clear {
    width: 24px; height: 24px; border-radius: 50%; border: none;
    background: rgba(79,110,247,0.1); color: var(--primary); font-size: 12px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 0.2s;
    &:hover { background: #fee; color: #f53f3f; }
  }
}

// 标签 & 操作区
.upload-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

.tag {
  &-select-row { display: flex; gap: 6px; }
  &-dropdown {
    flex: 1; padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    font-size: 13px; color: #1d2129; background: #fff; outline: none; cursor: pointer;
    transition: border-color 0.2s;
    &:focus { border-color: var(--primary); }
  }
  &-add-btn {
    padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border);
    background: #fff; color: var(--text-secondary); font-size: 12px;
    cursor: pointer; white-space: nowrap; transition: all 0.2s;
    &:hover, &.active { border-color: var(--primary); color: var(--primary); background: var(--active-bg); }
  }
  &-new-row { display: flex; gap: 6px; }
  &-new-input {
    flex: 1; padding: 7px 10px; border: 1px solid var(--border); border-radius: 8px;
    font-size: 13px; outline: none; transition: border-color 0.2s;
    &:focus { border-color: var(--primary); }
  }
  &-confirm-btn {
    padding: 7px 14px; background: var(--primary); color: #fff; border: none;
    border-radius: 8px; font-size: 12px; cursor: pointer; white-space: nowrap;
    transition: background 0.2s;
    &:disabled { background: #c9cdd4; cursor: not-allowed; }
  }
}

.btn-upload { padding: 10px 20px; font-size: 14px; }
.btn-loading { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

// 解析状态
.parse-status {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 6px; font-size: 13px; margin-top: 10px;

  &-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  &.parsing, &.vectorizing {
    background: var(--status-warn-bg); color: var(--status-warn-text);
    .parse-status-dot { background: #fa8c16; animation: pulse 1s infinite; }
  }
  &.done {
    background: var(--status-ok-bg); color: var(--status-ok-text);
    .parse-status-dot { background: #52c41a; }
  }
  &.error {
    background: var(--status-err-bg); color: var(--status-err-text);
    .parse-status-dot { background: #f5222d; }
  }
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

// 知识库空状态
.kb-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 32px 0; color: var(--text-secondary); font-size: 13px;
  span:first-child { font-size: 28px; opacity: 0.5; }
}

// 分组列表
.kb-section { margin-top: 4px; }

.kb-group {
  margin-bottom: 8px;

  &-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; border-radius: 8px; cursor: pointer;
    user-select: none; transition: background 0.2s;
    &:hover { background: var(--bg); }
    &:hover .kb-group-delete { opacity: 0.6; }
  }
  &-left { display: flex; align-items: center; gap: 6px; }
  &-arrow {
    font-size: 10px; color: var(--text-secondary); transition: transform 0.2s;
    &.expanded { transform: rotate(90deg); }
  }
  &-tag { font-size: 13px; font-weight: 500; color: var(--text); }
  &-count { background: var(--bg); color: var(--text-secondary); font-size: 11px; padding: 1px 7px; border-radius: 10px; }
  &-delete {
    border: none; background: none; font-size: 13px; cursor: pointer;
    opacity: 0; transition: opacity 0.2s; padding: 2px 4px; border-radius: 4px;
    &:hover { opacity: 1 !important; background: var(--danger-hover-bg); }
  }
  &-list { padding-left: 8px; }
}

// 文档项
.kb-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: var(--kb-bg); border-radius: 8px;
  margin-bottom: 6px; transition: background 0.2s; cursor: pointer;
  &:hover { background: var(--hover-bg); }

  &-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  &-icon { font-size: 18px; flex-shrink: 0; }
  &-meta { display: flex; flex-direction: column; min-width: 0; }
  &-name { font-size: 13px; font-weight: 500; color: var(--text-kb); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  &-detail { font-size: 11px; color: var(--text-secondary); }
}

.kb-delete-btn {
  width: 24px; height: 24px; border-radius: 6px; border: none;
  background: transparent; color: var(--text-secondary); font-size: 12px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.2s;
  &:hover { background: #fee; color: #f53f3f; }
}

// 预览弹窗
.doc-preview-modal { width: 700px; max-height: 80vh; }

.preview {
  &-tabs { display: flex; gap: 0; padding: 0 24px; border-bottom: 1px solid var(--border); }
  &-tab {
    padding: 10px 16px; background: none; border: none;
    border-bottom: 2px solid transparent; font-size: 14px;
    color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
    &:hover { color: var(--text); }
    &.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 500; }
  }
  &-raw { white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: var(--text); }
  &-chunks { display: flex; flex-direction: column; gap: 8px; }
  &-meta { font-size: 12px; color: var(--text-secondary); }
}

// ===== 移动端适配 =====
@media (max-width: 768px) {
  .upload-container {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: none;
    width: 85vw;
    min-width: unset;
    max-width: 320px;

    &.sidebar-open {
      transform: translateX(0);
      box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    }
  }

  .doc-preview-modal {
    width: 95vw;
    max-height: 85vh;
  }
}
</style>
