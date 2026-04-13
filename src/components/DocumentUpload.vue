<template>
  <div class="upload-container">
    <div class="upload-header">
      <h3>📚 知识库</h3>
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
            <span class="drop-file-icon">{{ getFileIcon(fileName) }}</span>
            <span class="drop-file-name">{{ fileName }}</span>
            <button class="drop-file-clear" @click.stop="clearFile" title="清除">✕</button>
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
          <span v-if="!parsing">⚡ 解析并入库</span>
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
              <span class="kb-group-arrow" :class="{ expanded: expandedGroups[tag] !== false }">▶</span>
              <span class="kb-group-tag">{{ tag }}</span>
              <span class="kb-group-count">{{ docs.length }}</span>
            </div>
            <button
              v-if="tag !== '默认'"
              class="kb-group-delete"
              @click.stop="handleDeleteTag(tag)"
              title="删除分组（文档移至默认）"
            >🗑️</button>
          </div>
          <div v-if="expandedGroups[tag] !== false" class="kb-group-list">
            <div class="kb-item" v-for="doc in docs" :key="doc.fileName" @click="openPreview(doc)">
              <div class="kb-item-info">
                <span class="kb-item-icon">{{ getFileIcon(doc.fileName) }}</span>
                <div class="kb-item-meta">
                  <span class="kb-item-name">{{ doc.fileName }}</span>
                  <span class="kb-item-detail">{{ doc.textChunks.length }} 块 · {{ doc.uploadTime }}</span>
                </div>
              </div>
              <button class="kb-delete-btn" @click.stop="handleDeleteDoc(doc.fileName)" title="移除">✕</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!ragStore.documentList.length && !fileName" class="kb-empty">
        <span>�</span>
        <span>还没有文档，上传一个试试</span>
      </div>
    </div>

    <!-- 文档预览弹窗 -->
    <div v-if="previewDoc" class="modal-overlay" @click.self="previewDoc = null">
      <div class="modal doc-preview-modal">
        <div class="modal-header">
          <h3>{{ getFileIcon(previewDoc.fileName) }} {{ previewDoc.fileName }}</h3>
          <button class="modal-close" @click="previewDoc = null">✕</button>
        </div>
        <div class="preview-tabs">
          <button class="preview-tab" :class="{ active: previewTab === 'raw' }" @click="previewTab = 'raw'">📄 原文</button>
          <button class="preview-tab" :class="{ active: previewTab === 'chunks' }" @click="previewTab = 'chunks'">🧩 分块（{{ previewDoc.textChunks.length }}）</button>
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
          <span class="preview-meta">🏷️ {{ previewDoc.tag || '默认' }} · {{ previewDoc.uploadTime }} · {{ previewDoc.textChunks.length }} 个文本块</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRagStore } from '../store/ragStore'
import { storeVectors, removeDocVectors, smartChunkText } from '../utils/vectorUtils.js'
import { parseDocument } from '../utils/docParser.js'

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
  const ext = name.split('.').pop().toLowerCase()
  return { pdf: '📕', docx: '📘', md: '📝', txt: '📄' }[ext] || '📄'
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
      alert('不支持的文件格式，请上传 TXT/MD/PDF/DOCX 文件')
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
  } catch (err) {
    console.error('文档解析失败：', err)
    parseStatus.value = 'error'
    parseStatusMsg.value = `失败：${err.message}`
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
