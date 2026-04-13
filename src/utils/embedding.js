import { callDashScope } from './request.js'

const EMBEDDING_PATH = '/api/v1/services/embeddings/text-embedding/text-embedding'

const embedding = {
  // 单条文本向量化
  async embedQuery(text) {
    const data = await callDashScope(EMBEDDING_PATH, {
      model: 'text-embedding-v2',
      input: { texts: [text] },
      parameters: { text_type: 'query' },
    })
    return data.output.embeddings[0].embedding
  },

  // 批量向量化（通义支持单次最多 25 条）
  async embedBatch(texts) {
    const results = []
    // 每批最多 25 条
    for (let i = 0; i < texts.length; i += 25) {
      const batch = texts.slice(i, i + 25)
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
