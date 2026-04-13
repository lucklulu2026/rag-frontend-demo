<template>
  <div class="upload-container">
    <div class="upload-header">
      <h3>📚 知识库</h3>
    </div>
    <div class="upload-body">
      <!-- 文件选择 -->
      <div class="file-input-wrapper">
        <label class="file-select-btn" for="fileInput">📎 选择文件（TXT / MD / PDF / DOCX）</label>
        <input id="fileInput" type="file" accept=".txt,.md,.pdf,.docx" @change="handleFileUpload" />
      </div>

      <div v-if="fileName" class="file-info">
        <span class="file-icon">📃</span>
        <span>{{ fileName }}</span>
      </div>

      <button class="btn" @click="handleParseFile" :disabled="!file || parsing">
        {{ parsing ? '解析中...' : '解析并入库' }}
      </button>

      <!-- 知识库文档列表 -->
      <div v-if="ragStore.documentList.length" class="kb-section">
        <div class="kb-title">已入库文档（{{ ragStore.documentList.length }}）</div>
        <div class="kb-item" v-for="doc in ragStore.documentList" :key="doc.fileName">
          <div class="kb-item-info">
            <span class="kb-item-icon">{{ getFileIcon(doc.fileName) }}</span>
            <div class="kb-item-meta">
              <span class="kb-item-name">{{ doc.fileName }}</span>
              <span class="kb-item-detail">{{ doc.textChunks.length }} 块 · {{ doc.uploadTime }}</span>
            </div>
          </div>
          <button class="kb-delete-btn" @click="handleDeleteDoc(doc.fileName)" title="移除">✕</button>
        </div>
      </div>

      <!-- 文本块折叠区 -->
      <div v-if="textChunks.length" class="chunks-section">
        <div class="chunks-toggle" @click="chunksExpanded = !chunksExpanded">
          <div class="chunks-toggle-left">
            <span>文本块预览</span>
            <span class="chunks-badge">{{ textChunks.length }}</span>
          </div>
          <span class="chunks-arrow" :class="{ expanded: chunksExpanded }">▼</span>
        </div>
        <div v-if="chunksExpanded" class="chunks-list">
          <div class="chunk-item" v-for="(chunk, index) in textChunks" :key="index">
            <span class="chunk-index">#{{ index + 1 }}</span>{{ chunk }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRagStore } from '../store/ragStore'
import { storeVectors, removeDocVectors, smartChunkText } from '../utils/vectorUtils.js'
import { parseDocument } from '../utils/docParser.js'

const ragStore = useRagStore()
const file = ref(null)
const fileName = ref('')
const textChunks = ref([])
const chunksExpanded = ref(false)
const parsing = ref(false)

const getFileIcon = (name) => {
  const ext = name.split('.').pop().toLowerCase()
  const icons = { pdf: '📕', docx: '📘', md: '📝', txt: '📄' }
  return icons[ext] || '📄'
}

const handleFileUpload = (e) => {
  const selectedFile = e.target.files[0]
  if (selectedFile) {
    file.value = selectedFile
    fileName.value = selectedFile.name
    textChunks.value = []
    chunksExpanded.value = false
  }
}

const handleParseFile = async () => {
  if (!file.value) return

  parsing.value = true
  try {
    const rawText = await parseDocument(file.value)
    // 使用智能分块（段落感知 + 重叠）
    const chunks = smartChunkText(rawText, { chunkSize: 300, overlap: 50 })
    textChunks.value = chunks
    chunksExpanded.value = true

    await ragStore.addDocument({
      fileName: fileName.value,
      textChunks: chunks,
      uploadTime: new Date().toLocaleString()
    })

    // 向量化并存入 IndexedDB
    await storeVectors(fileName.value, chunks)
  } catch (err) {
    console.error('文档解析失败：', err)
    alert(`文档解析失败：${err.message}`)
  } finally {
    parsing.value = false
  }
}

const handleDeleteDoc = async (docFileName) => {
  await ragStore.removeDocument(docFileName)
  await removeDocVectors(docFileName)
  if (docFileName === fileName.value) {
    textChunks.value = []
    fileName.value = ''
    file.value = null
  }
}
</script>
