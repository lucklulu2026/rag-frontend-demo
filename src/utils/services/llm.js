/**
 * @file 大模型对话服务
 * @description RAG 问答核心逻辑：向量检索 → 构建上下文 → 调用通义千问 → 返回带引用的回答
 * @module services/llm
 */
import { searchSimilar } from './vector.js'
import { callDashScope, callDashScopeStream } from '../tools/request.js'

/** @type {string} 通义千问对话 API 路径 */
const CHAT_PATH = '/api/v1/services/aigc/text-generation/generation'

/** @type {number} 历史对话保留轮数（避免 token 超限） */
const MAX_HISTORY_ROUNDS = 5

/** @type {number} 检索返回的最相关文本块数量 */
const TOP_K = 3

/**
 * @typedef {Object} ChatMessage
 * @property {string} question - 用户提问
 * @property {string} answer - AI 回答
 * @property {Array} [relatedTexts] - 引用的文本块
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} text - 文本内容
 * @property {string} source - 来源文档名
 * @property {number} score - 向量相似度
 * @property {number} bm25Score - BM25 关键词分数
 * @property {number} fusedScore - RRF 融合分数
 */

/**
 * RAG 问答：向量检索 + 多轮对话上下文 + 引用溯源
 * @param {string} question - 用户提问
 * @param {ChatMessage[]} chatHistory - 当前会话的历史对话
 * @returns {Promise<{answer: string, references: SearchResult[]}>} 回答和引用来源
 */
const askWithRAG = async (question, chatHistory = []) => {
  if (!question.trim()) {
    return { answer: '', references: [] }
  }

  // 1. 向量检索：从知识库找最相关的文本块
  let references = []
  let context = ''
  try {
    references = await searchSimilar(question, TOP_K)
    if (references.length > 0) {
      context = references
        .map((r, i) => `[${i + 1}] 来源：${r.source}\n内容：${r.text}`)
        .join('\n\n')
    }
  } catch (err) {
    console.warn('向量检索失败，将直接调用大模型：', err)
  }

  // 2. 构建 messages 数组（system + 历史 + 当前提问）
  const messages = []

  // System prompt：有知识库内容时注入上下文
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

  // 注入最近 N 轮历史对话
  const recentHistory = chatHistory.slice(-MAX_HISTORY_ROUNDS)
  for (const item of recentHistory) {
    messages.push({ role: 'user', content: item.question })
    messages.push({ role: 'assistant', content: item.answer })
  }

  messages.push({ role: 'user', content: question })

  // 3. 调用通义千问大模型
  try {
    const data = await callDashScope(CHAT_PATH, {
      model: 'qwen-turbo',
      input: { messages },
      parameters: { temperature: 0.7, max_tokens: 1500 },
    })

    const answer = data.output?.text || '抱歉，未能获取到有效的回答。'
    return { answer, references }
  } catch (error) {
    console.error('通义千问 API 调用失败：', error)
    throw error
  }
}

export { askWithRAG }

/**
 * 流式 RAG 问答：向量检索 + 流式输出
 * @param {string} question - 用户提问
 * @param {ChatMessage[]} chatHistory - 历史对话
 * @param {(text: string) => void} onChunk - 每次收到新文本时的回调
 * @returns {Promise<{answer: string, references: SearchResult[]}>}
 */
const askWithRAGStream = async (question, chatHistory = [], onChunk) => {
  if (!question.trim()) return { answer: '', references: [] }

  // 1. 向量检索
  let references = []
  let context = ''
  try {
    references = await searchSimilar(question, TOP_K)
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

  const recentHistory = chatHistory.slice(-MAX_HISTORY_ROUNDS)
  for (const item of recentHistory) {
    messages.push({ role: 'user', content: item.question })
    messages.push({ role: 'assistant', content: item.answer })
  }
  messages.push({ role: 'user', content: question })

  // 3. 流式调用
  try {
    const answer = await callDashScopeStream(CHAT_PATH, {
      model: 'qwen-turbo',
      input: { messages },
      parameters: {
        temperature: 0.7,
        max_tokens: 1500,
        incremental_output: true,  // 通义千问增量输出模式
      },
    }, onChunk)

    return { answer: answer || '抱歉，未能获取到有效的回答。', references }
  } catch (error) {
    console.error('通义千问流式调用失败：', error)
    throw error
  }
}

export { askWithRAGStream }

/**
 * 总结当前对话：将所有问答内容发给大模型，生成结构化重点总结
 * @param {ChatMessage[]} chatMessages - 当前会话的所有对话
 * @returns {Promise<string>} Markdown 格式的总结内容
 */
const summarizeChat = async (chatMessages) => {
  if (!chatMessages.length) throw new Error('没有对话内容可总结')

  // 将对话拼成文本
  const chatText = chatMessages
    .map((m, i) => `【问题 ${i + 1}】${m.question}\n【回答 ${i + 1}】${m.answer}`)
    .join('\n\n')

  const messages = [
    {
      role: 'system',
      content: `你是一个专业的内容总结助手。请对以下对话内容进行结构化总结，输出 Markdown 格式，包含：
1. **核心要点**：提炼 3-5 个关键信息点
2. **详细摘要**：用简洁的段落概括对话的主要内容
3. **关键词**：列出 5-8 个关键词/标签

要求：简洁准确，重点突出，使用中文。`
    },
    { role: 'user', content: `请总结以下对话内容：\n\n${chatText}` }
  ]

  const data = await callDashScope(CHAT_PATH, {
    model: 'qwen-turbo',
    input: { messages },
    parameters: { temperature: 0.3, max_tokens: 2000 },
  })

  return data.output?.text || '总结生成失败'
}

export { summarizeChat }
