/**
 * @file 向量化服务
 * @description 封装通义千问 text-embedding-v2 模型，支持单条和批量文本向量化
 * @module services/embedding
 */
import { callDashScope } from '../tools/request.js'

/** @type {string} Embedding API 路径 */
const EMBEDDING_PATH = '/api/v1/services/embeddings/text-embedding/text-embedding'

/** @type {number} 通义 Embedding API 单次最大文本数 */
const MAX_BATCH_SIZE = 25

const embedding = {
  /**
   * 单条文本向量化（用于查询）
   * @param {string} text - 输入文本
   * @returns {Promise<number[]>} 向量数组（1536 维）
   */
  async embedQuery(text) {
    const data = await callDashScope(EMBEDDING_PATH, {
      model: 'text-embedding-v2',
      input: { texts: [text] },
      parameters: { text_type: 'query' },
    })
    return data.output.embeddings[0].embedding
  },

  /**
   * 批量文本向量化（用于文档入库，自动分批）
   * @param {string[]} texts - 文本数组
   * @returns {Promise<number[][]>} 向量数组的数组
   */
  async embedBatch(texts) {
    const results = []
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE)
      const data = await callDashScope(EMBEDDING_PATH, {
        model: 'text-embedding-v2',
        input: { texts: batch },
        parameters: { text_type: 'document' },
      })
      results.push(...data.output.embeddings.map(e => e.embedding))
    }
    return results
  },
}

export default embedding
