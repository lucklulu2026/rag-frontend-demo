import { searchSimilar } from './vectorUtils.js'

const TONGYI_API_KEY = import.meta.env.VITE_TONGYI_API_KEY
const CHAT_URL = '/dashscope/api/v1/services/aigc/text-generation/generation'

/**
 * RAG 问答：向量检索 + 多轮对话 + 引用溯源
 */
const askWithRAG = async (question, chatHistory = []) => {
  if (!question.trim()) {
    return { answer: '', references: [] }
  }

  // 1. 向量检索
  let references = []
  let context = ''
  try {
    references = await searchSimilar(question, 3)
    if (references.length > 0) {
      context = references
        .map((r, i) => `[${i + 1}] 来源：${r.source}\n内容：${r.text}`)
        .join('\n\n')
    }
  } catch (err) {
    console.warn('向量检索失败：', err)
  }

  // 2. 构建 messages
  const messages = []

  if (context) {
    messages.push({
      role: 'system',
      content: `你是一个知识库问答助手。请根据以下知识库资料回答用户问题。
回答时请在相关内容后标注引用编号（如 [1]、[2]），方便用户溯源。
如果资料中没有相关信息，请如实说明"知识库中未找到相关信息"。

知识库资料：
${context}`
    })
  } else {
    messages.push({
      role: 'system',
      content: '你是一个智能问答助手。当前知识库为空，请基于你的通用知识回答问题，并提示用户可以上传文档来获得更精准的回答。'
    })
  }

  // 历史对话（最近 5 轮）
  const recentHistory = chatHistory.slice(-5)
  for (const item of recentHistory) {
    messages.push({ role: 'user', content: item.question })
    messages.push({ role: 'assistant', content: item.answer })
  }

  messages.push({ role: 'user', content: question })

  // 3. 调用通义千问
  try {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TONGYI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { messages },
        parameters: { temperature: 0.7, max_tokens: 1500 },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API 请求失败 (${response.status}): ${errText}`)
    }

    const data = await response.json()
    const answer = data.output?.text || '抱歉，未能获取到有效的回答。'
    return { answer, references }
  } catch (error) {
    console.error('通义千问API调用失败：', error)
    alert('大模型调用失败，请检查网络连接和API Key配置！')
    return { answer: '', references: [] }
  }
}

export { askWithRAG }
