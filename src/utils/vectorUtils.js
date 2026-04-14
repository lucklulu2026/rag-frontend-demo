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

// ===== BM25 关键词检索 =====
const tokenize = (text) => {
  // 中英文分词：中文按字/词切分，英文按空格
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0)
}

const bm25Search = (query, documents, { k1 = 1.5, b = 0.75 } = {}) => {
  const queryTokens = tokenize(query)
  const N = documents.length
  if (N === 0 || queryTokens.length === 0) return documents.map(() => 0)

  // 计算每个文档的词频和文档长度
  const docTokens = documents.map(d => tokenize(d.text))
  const avgDl = docTokens.reduce((sum, t) => sum + t.length, 0) / N

  // 计算 IDF（逆文档频率）
  const df = {}
  for (const tokens of docTokens) {
    const seen = new Set(tokens)
    for (const t of seen) {
      df[t] = (df[t] || 0) + 1
    }
  }

  // 计算每个文档的 BM25 分数
  return docTokens.map((tokens, i) => {
    const dl = tokens.length
    const tf = {}
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1
    }

    let score = 0
    for (const qt of queryTokens) {
      if (!tf[qt]) continue
      const idf = Math.log((N - (df[qt] || 0) + 0.5) / ((df[qt] || 0) + 0.5) + 1)
      const tfNorm = (tf[qt] * (k1 + 1)) / (tf[qt] + k1 * (1 - b + b * dl / avgDl))
      score += idf * tfNorm
    }
    return score
  })
}

// ===== RRF（Reciprocal Rank Fusion）混合排序 =====
const reciprocalRankFusion = (rankings, k = 60) => {
  // rankings: [{id, score}[]] 多个排序列表
  const scores = {}
  for (const ranking of rankings) {
    // 按分数降序排列，获取排名
    const sorted = [...ranking].sort((a, b) => b.score - a.score)
    sorted.forEach((item, rank) => {
      scores[item.id] = (scores[item.id] || 0) + 1 / (k + rank + 1)
    })
  }
  return scores
}

// ===== 混合检索：向量 + BM25 关键词，RRF 融合排序 =====
const SIMILARITY_THRESHOLD = 0.35 // 相似度阈值，低于此值的结果过滤掉

const searchSimilar = async (query, topK = 3) => {
  const allVectors = await db.vectors.toArray()
  if (allVectors.length === 0) return []

  // 1. 向量语义检索
  const queryVector = await embedding.embedQuery(query)
  const vectorScores = allVectors.map((item, i) => ({
    id: i,
    score: cosineSimilarity(queryVector, item.vector)
  }))

  // 2. BM25 关键词检索
  const bm25Scores = bm25Search(query, allVectors)
  const keywordScores = allVectors.map((_, i) => ({
    id: i,
    score: bm25Scores[i]
  }))

  // 3. RRF 融合两路检索结果
  const fusedScores = reciprocalRankFusion([vectorScores, keywordScores])

  // 4. 组合结果，附带向量相似度用于展示和阈值过滤
  const results = allVectors.map((item, i) => ({
    text: item.text,
    source: item.fileName,
    score: vectorScores[i].score,       // 向量相似度（展示用）
    bm25Score: bm25Scores[i],           // BM25 分数
    fusedScore: fusedScores[i] || 0,    // RRF 融合分数（排序用）
  }))

  // 5. 按融合分数排序
  results.sort((a, b) => b.fusedScore - a.fusedScore)

  // 6. 过滤低质量结果（向量相似度低于阈值的）
  const filtered = results.filter(r => r.score >= SIMILARITY_THRESHOLD)

  return filtered.slice(0, topK)
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
