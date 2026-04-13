// 通义千问 Embedding 封装（适配 DashScope API）
const TONGYI_API_KEY = import.meta.env.VITE_TONGYI_API_KEY
const EMBEDDING_URL = "/dashscope/api/v1/services/embeddings/text-embedding/text-embedding"

const embedding = {
  async embedQuery(text) {
    const headers = { "Content-Type": "application/json" }
    // 本地开发时前端带 key，线上由 Serverless Function 注入
    if (TONGYI_API_KEY) {
      headers["Authorization"] = `Bearer ${TONGYI_API_KEY}`
    }

    const response = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "text-embedding-v2",
        input: { texts: [text] },
        parameters: { text_type: "query" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Embedding API 请求失败 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.output.embeddings[0].embedding;
  },
};

export default embedding;
