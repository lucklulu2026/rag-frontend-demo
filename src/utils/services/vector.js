/**
 * @file 向量检索服务
 * @description 文本分块、向量存储、混合检索（向量 + BM25 + RRF 融合）
 * @module services/vector
 */
import embedding from './embedding.js'
import db from '../tools/db.js'

// ============================================================
// 文本分块
// ============================================================

/**
 * 检测文本是否为代码内容（通过关键词特征评分）
 * @param {string} text - 待检测文本
 * @returns {boolean} 是否为代码
 */
const isCodeContent = (text) => {
  const indicators = [
    /^(import|export|const|let|var|function|class|async|from)\s/m,
    /\{[\s\S]*\}/,
    /=>\s*\{/,
    /\bdef\s+\w+/,
    /\bpublic\s+(class|void|static)/,
  ]
  return indicators.filter(re => re.test(text)).length >= 2
}

/**
 * 代码文件分块：按函数/类声明为边界
 * @param {string} text - 代码文本
 * @param {Object} options
 * @param {number} [options.chunkSize=500] - 每块最大字符数
 * @returns {string[]} 分块结果
 */
const chunkCodeText = (text, { chunkSize = 500 } = {}) => {
  const blocks = text
    .split(/\n(?=(?:\/\*\*|\/\/|export|const\s+\w+\s*=|function\s|class\s|async\s+function|import\s))/g)
    .map(b => b.trim())
    .filter(b => b.length > 0)

  const chunks = []
  let current = ''

  for (const block of blocks) {
    if (current && (current.length + block.length + 1) <= chunkSize) {
      current += '\n' + block
    } else {
      if (current) chunks.push(current)
      if (block.length > chunkSize) {
        // 超长块按行切分
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

/**
 * 智能分块：自动识别代码/文档，选择对应策略
 * - 代码文件：按函数/类声明分块
 * - 普通文档：段落感知 + 句号断句 + 重叠分块
 *
 * @param {string} text - 原始文本
 * @param {Object} options
 * @param {number} [options.chunkSize=300] - 普通文档每块最大字符数
 * @param {number} [options.overlap=50] - 相邻块重叠字符数
 * @returns {string[]} 分块结果
 */
const smartChunkText = (text, { chunkSize = 300, overlap = 50 } = {}) => {
  if (isCodeContent(text)) {
    return chunkCodeText(text, { chunkSize: 500 })
  }

  // 按段落/标题/中文大纲格式分段
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
          const idx = para.substring(searchStart, end).search(/[。！？；\n.!?;]\s*/)
          if (idx > -1) end = searchStart + idx + 1
        }
        const chunk = para.slice(start, end).trim()
        if (chunk) chunks.push(chunk)
        const nextStart = end - overlap
        if (nextStart <= start || end >= para.length) break
        start = nextStart
      }
    }
  }

  // 合并过短的块（保留标题类短块）
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

// ============================================================
// 向量存储
// ============================================================

/**
 * 批量生成向量
 * @param {string[]} textChunks - 文本块数组
 * @returns {Promise<{text: string, vector: number[]}[]>} 文本+向量对
 */
const generateVectorsForChunks = async (textChunks) => {
  const vectors = await embedding.embedBatch(textChunks)
  return textChunks.map((chunk, i) => ({ text: chunk, vector: vectors[i] }))
}

/**
 * 向量化文档并存入 IndexedDB
 * @param {string} fileName - 文档名（作为标识）
 * @param {string[]} textChunks - 文本块数组
 * @returns {Promise<{text: string, vector: number[]}[]>} 生成的向量数据
 */
const storeVectors = async (fileName, textChunks) => {
  const vectors = await generateVectorsForChunks(textChunks)
  await db.vectors.where('fileName').equals(fileName).delete()
  await db.vectors.bulkAdd(vectors.map(v => ({ fileName, text: v.text, vector: v.vector })))
  console.log(`向量存储成功：${fileName}，共 ${vectors.length} 条`)
  return vectors
}

/**
 * 删除指定文档的所有向量
 * @param {string} fileName - 文档名
 */
const removeDocVectors = async (fileName) => {
  await db.vectors.where('fileName').equals(fileName).delete()
}

// ============================================================
// 检索算法
// ============================================================

/**
 * 余弦相似度计算
 * @param {number[]} a - 向量 A
 * @param {number[]} b - 向量 B
 * @returns {number} 相似度（0~1）
 */
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

/**
 * 中英文分词（简易版）
 * @param {string} text - 输入文本
 * @returns {string[]} 词元数组
 */
const tokenize = (text) => {
  return text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 0)
}

/**
 * BM25 关键词检索
 * @param {string} query - 查询文本
 * @param {{text: string}[]} documents - 文档数组
 * @param {Object} [params] - BM25 参数
 * @param {number} [params.k1=1.5] - 词频饱和参数
 * @param {number} [params.b=0.75] - 文档长度归一化参数
 * @returns {number[]} 每个文档的 BM25 分数
 */
const bm25Search = (query, documents, { k1 = 1.5, b = 0.75 } = {}) => {
  const queryTokens = tokenize(query)
  const N = documents.length
  if (N === 0 || queryTokens.length === 0) return documents.map(() => 0)

  const docTokens = documents.map(d => tokenize(d.text))
  const avgDl = docTokens.reduce((sum, t) => sum + t.length, 0) / N

  const df = {}
  for (const tokens of docTokens) {
    for (const t of new Set(tokens)) { df[t] = (df[t] || 0) + 1 }
  }

  return docTokens.map((tokens) => {
    const dl = tokens.length
    const tf = {}
    for (const t of tokens) { tf[t] = (tf[t] || 0) + 1 }

    let score = 0
    for (const qt of queryTokens) {
      if (!tf[qt]) continue
      const idf = Math.log((N - (df[qt] || 0) + 0.5) / ((df[qt] || 0) + 0.5) + 1)
      score += idf * (tf[qt] * (k1 + 1)) / (tf[qt] + k1 * (1 - b + b * dl / avgDl))
    }
    return score
  })
}

/**
 * RRF（Reciprocal Rank Fusion）多路检索融合
 * @param {{id: number, score: number}[][]} rankings - 多个排序列表
 * @param {number} [k=60] - RRF 常数
 * @returns {Record<number, number>} id → 融合分数
 */
const reciprocalRankFusion = (rankings, k = 60) => {
  const scores = {}
  for (const ranking of rankings) {
    const sorted = [...ranking].sort((a, b) => b.score - a.score)
    sorted.forEach((item, rank) => {
      scores[item.id] = (scores[item.id] || 0) + 1 / (k + rank + 1)
    })
  }
  return scores
}

/** @type {number} 向量相似度阈值，低于此值的结果被过滤 */
const SIMILARITY_THRESHOLD = 0.35

/**
 * 混合检索：向量语义 + BM25 关键词，RRF 融合排序
 * @param {string} query - 查询文本
 * @param {number} [topK=3] - 返回结果数量
 * @returns {Promise<SearchResult[]>} 检索结果（按融合分数降序）
 */
const searchSimilar = async (query, topK = 3) => {
  const allVectors = await db.vectors.toArray()
  if (allVectors.length === 0) return []

  const queryVector = await embedding.embedQuery(query)
  const vectorScores = allVectors.map((item, i) => ({ id: i, score: cosineSimilarity(queryVector, item.vector) }))
  const bm25Scores = bm25Search(query, allVectors)
  const keywordScores = allVectors.map((_, i) => ({ id: i, score: bm25Scores[i] }))
  const fusedScores = reciprocalRankFusion([vectorScores, keywordScores])

  const results = allVectors.map((item, i) => ({
    text: item.text,
    source: item.fileName,
    score: vectorScores[i].score,
    bm25Score: bm25Scores[i],
    fusedScore: fusedScores[i] || 0,
  }))

  results.sort((a, b) => b.fusedScore - a.fusedScore)
  return results.filter(r => r.score >= SIMILARITY_THRESHOLD).slice(0, topK)
}

/**
 * 获取知识库统计信息
 * @returns {Promise<{totalVectors: number, documentCount: number}>}
 */
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
