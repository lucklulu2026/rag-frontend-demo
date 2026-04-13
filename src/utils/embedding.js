import { callDashScope } from './request.js'

const EMBEDDING_PATH = '/api/v1/services/embeddings/text-embedding/text-embedding'

const embedding = {
  async embedQuery(text) {
    const data = await callDashScope(EMBEDDING_PATH, {
      model: 'text-embedding-v2',
      input: { texts: [text] },
      parameters: { text_type: 'query' },
    })
    return data.output.embeddings[0].embedding
  },
}

export default embedding
