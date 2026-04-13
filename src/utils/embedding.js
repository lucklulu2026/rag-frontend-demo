// 通义千问 Embedding 封装（适配 DashScope API）
const TONGYI_API_KEY = import.meta.env.VITE_TONGYI_API_KEY;
// 通过 Vite 代理转发，避免浏览器 CORS 限制
const EMBEDDING_URL = "/dashscope/api/v1/services/embeddings/text-embedding/text-embedding";

const embedding = {
  /**
   * 对单个文本生成向量
   * @param {string} text - 输入文本
   * @returns {Promise<number[]>} 向量数组
   */
  async embedQuery(text) {
    const response = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TONGYI_API_KEY}`,
      },
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
