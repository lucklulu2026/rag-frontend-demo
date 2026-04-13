import embedding from './embedding.js'
import db from './db.js'

// ===== 检测是否为代码文件 =====
const isCodeContent = (text) => {
  const codeIndicators = [
    /^(import|export|const|let|var|function|class|async|from)\s/m,
    /\{[\s\S]*\}/,
    /=>\s*\{/,
    /\bdef\s+\w+/,
    /\bpublic\s+(class|void|static)/,
  ]
  let score = 0
  for (const re of codeIndicators) {
    if (re.test(text)) score++
  }
  return score >= 2
}

// ===== 代码文件分块：按函数/代码块为单位 =====
const chunkCodeText = (text, { chunkSize = 500 } = {}) => {
  // 按空行 + 函数/类声明分割
  const blocks = text.split(/\n(?=(?:\/\*\*|\/\/|export|const\s+\w+\s*=|function\s|class\s|async\s+function|import\s))/g)
    .map(b => b.trim())
    .filter(b => b.length > 0)

  const chunks = []
  let current = ''

  for (const block of blocks) {
    // 如果当前块 + 新块不超限，合并
    if (current && (current.length + block.length + 1) <= chunkSize) {
      current += '\n' + block
    } else {
      if (current) chunks.push(current)
      // 如果单个块就超限，按行切分
      if (block.length > chunkSize) {
        const lines = block.split('\n')
        let part = ''
        for (const line of lines) {
          if (part && (part.length + line.length + 1) > chunkSize) {
            chunks.push(part)
            part = line
          } else {
            part = part ? part + '\n' + line : line
          }
        }
        current = part
      } else {
        current = block
      }
    }
  }
  if (current) chunks.push(current)

  return chunks
}

// ===== 智能分块：自动识别代码/文档，选择不同策略 =====
const smartChunkText = (text, { chunkSize = 300, overlap = 50 } = {}) => {
  // 代码文件用代码分块策略
  if (isCodeContent(text)) {
    return chunkCodeText(text, { chunkSize: 500 })
  }

  // 普通文档：段落感知 + 重叠分块
  const paragraphs = text
    .split(/\n(?=#{1,6}\s*)|(?:\r?\n){2,}|\n(?=[一二三四五六七八九十]+[、.])|(?:\r?\n)(?=\d+[\.\、])/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const chunks = []

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push(para)
    } else {
      let start = 0
      while (start < para.length) {
        let end = Math.min(start + chunkSize, para.length)
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
        const nextStart = end - overlap
        if (nextStart <= start) break
        start = nextStart
        if (end >= para.length) break
      }
    }
  }

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

// ===== 向量生成（批量，减少 API 调用次数）=====
const generateVectorsForChunks = async (textChunks) => {
  const vectors = await embedding.embedBatch(textChunks)
  return textChunks.map((chunk, i) => ({ text: chunk, vector: vectors[i] }))
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
