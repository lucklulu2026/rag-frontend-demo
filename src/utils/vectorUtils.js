import embedding from './embedding.js'
import db from './db.js'

// ===== 智能分块：段落感知 + 重叠分块 =====
const smartChunkText = (text, { chunkSize = 300, overlap = 50 } = {}) => {
  // 按 Markdown 标题、多换行、或"X、""X."等中文大纲格式分段
  const paragraphs = text
    .split(/\n(?=#{1,6}\s*)|(?:\r?\n){2,}|\n(?=[一二三四五六七八九十]+[、.])|(?:\r?\n)(?=\d+[\.\、])/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const chunks = []

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push(para)
    } else {
      // 长段落按句子断句切分
      let start = 0
      while (start < para.length) {
        let end = Math.min(start + chunkSize, para.length)
        // 在 60%-100% 区间找句号断句
        if (end < para.length) {
          const searchStart = start + Math.floor(chunkSize * 0.6)
          const searchZone = para.substring(searchStart, end)
          const sentenceEnd = searchZone.search(/[。！？；\n.!?;]\s*/)
          if (sentenceEnd > -1) {
            end = searchStart + sentenceEnd + 1
          }
        }
        const chunk = para.slice(start, end).trim()
        if (chunk) chunks.push(chunk)
        // 下一块起点带重叠
        const nextStart = end - overlap
        if (nextStart <= start) break // 防止死循环
        start = nextStart
        if (end >= para.length) break
      }
    }
  }

  // 合并过短的块（< 30 字合并到前一个，保留标题类短块）
  const merged = []
  for (const chunk of chunks) {
    const isHeading = /^#{1,6}\s|^[一二三四五六七八九十]+[、.]|^\d+[\.\、]/.test(chunk)
    if (merged.length > 0 && chunk.length < 30 && !isHeading) {
      merged[merged.length - 1] += '\n' + chunk
    } else {
      merged.push(chunk)
    }
  }

  return merged
}

// ===== 向量生成 =====
const generateVectorsForChunks = async (textChunks) => {
  return Promise.all(
    textChunks.map(async (chunk) => {
      const vector = await embedding.embedQuery(chunk)
      return { text: chunk, vector }
    })
  )
}

// ===== 存储向量到 IndexedDB =====
const storeVectors = async (fileName, textChunks) => {
  const vectors = await generateVectorsForChunks(textChunks)

  // 先删除该文档的旧向量
  await db.vectors.where('fileName').equals(fileName).delete()

  // 批量写入新向量
  const records = vectors.map(v => ({
    fileName,
    text: v.text,
    vector: v.vector
  }))
  await db.vectors.bulkAdd(records)

  console.log(`向量存储成功：${fileName}，共 ${vectors.length} 条`)
  return vectors
}

// ===== 删除某文档的向量 =====
const removeDocVectors = async (fileName) => {
  await db.vectors.where('fileName').equals(fileName).delete()
}

// ===== 余弦相似度 =====
const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ===== 向量检索：返回最相关的 topK 个文本块 =====
const searchSimilar = async (query, topK = 3) => {
  const allVectors = await db.vectors.toArray()
  if (allVectors.length === 0) return []

  const queryVector = await embedding.embedQuery(query)

  const scored = allVectors.map(item => ({
    text: item.text,
    source: item.fileName,
    score: cosineSimilarity(queryVector, item.vector)
  }))

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// ===== 获取知识库统计 =====
const getKnowledgeBaseStats = async () => {
  const count = await db.vectors.count()
  const docs = await db.vectors.orderBy('fileName').uniqueKeys()
  return { totalVectors: count, documentCount: docs.length }
}

export {
  smartChunkText,
  generateVectorsForChunks,
  storeVectors,
  removeDocVectors,
  searchSimilar,
  getKnowledgeBaseStats
}
