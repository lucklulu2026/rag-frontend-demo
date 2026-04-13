import embedding from './embedding.js'
import db from './db.js'

// ===== 智能分块：段落感知 + 重叠分块 =====
const smartChunkText = (text, { chunkSize = 300, overlap = 50 } = {}) => {
  // 先按段落分割（双换行、单换行、Markdown 标题）
  const paragraphs = text
    .split(/\n{2,}|\n(?=#{1,6}\s)/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const chunks = []

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      // 短段落直接作为一个块
      chunks.push(para)
    } else {
      // 长段落按 chunkSize 切分，带 overlap 重叠
      let start = 0
      while (start < para.length) {
        let end = start + chunkSize
        // 尝试在句号、问号、感叹号处断句
        if (end < para.length) {
          const sentenceEnd = para.substring(start + chunkSize * 0.6, end)
            .search(/[。！？.!?]\s*/)
          if (sentenceEnd > -1) {
            end = start + Math.floor(chunkSize * 0.6) + sentenceEnd + 1
          }
        }
        chunks.push(para.slice(start, end).trim())
        start = end - overlap
        if (start < 0) start = 0
        // 防止死循环：如果 overlap >= 实际步进
        if (start >= para.length) break
        if (end >= para.length) break
      }
    }
  }

  // 合并过短的块（< 50 字的块合并到前一个）
  const merged = []
  for (const chunk of chunks) {
    if (merged.length > 0 && chunk.length < 50) {
      merged[merged.length - 1] += ' ' + chunk
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
