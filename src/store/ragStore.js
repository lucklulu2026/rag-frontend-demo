import { defineStore } from 'pinia'
import db from '../utils/tools/db.js'

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
// Dexie 无法存储 Vue 的 Proxy 对象，需要深拷贝成纯对象
const toRaw = (obj) => JSON.parse(JSON.stringify(obj))
const SUMMARY_TRIGGER_MESSAGE_COUNT = 12
const SUMMARY_TRIGGER_CHAR_COUNT = 6000
const AUTO_SUMMARY_STORAGE_KEY = 'rag_auto_summary_enabled'

const shouldTriggerSummary = (session) => {
  if (!session || !Array.isArray(session.messages)) return false
  if (session.messages.length >= SUMMARY_TRIGGER_MESSAGE_COUNT) return true
  const totalChars = session.messages.reduce((sum, msg) => {
    const qLen = msg?.question?.length || 0
    const aLen = msg?.answer?.length || 0
    return sum + qLen + aLen
  }, 0)
  return totalChars >= SUMMARY_TRIGGER_CHAR_COUNT
}

export const useRagStore = defineStore('rag', {
  state: () => ({
    documentList: [],
    tags: [],
    // 会话管理
    sessions: [],         // 所有会话列表 [{id, title, messages, createdAt}]
    currentSessionId: null,
    summaryHints: {},     // { [sessionId]: boolean } 是否建议总结
    autoSummarizeEnabled: false,
    initialized: false,
  }),
  getters: {
    groupedDocuments(state) {
      const groups = {}
      for (const doc of state.documentList) {
        const tag = doc.tag || '默认'
        if (!groups[tag]) groups[tag] = []
        groups[tag].push(doc)
      }
      return groups
    },
    currentSession(state) {
      return state.sessions.find(s => s.id === state.currentSessionId) || null
    },
    currentChat(state) {
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      return session ? session.messages : []
    },
    currentSessionNeedSummary(state) {
      if (!state.currentSessionId) return false
      return !!state.summaryHints[state.currentSessionId]
    },
  },
  actions: {
    setAutoSummarizeEnabled(enabled) {
      this.autoSummarizeEnabled = !!enabled
      localStorage.setItem(AUTO_SUMMARY_STORAGE_KEY, String(this.autoSummarizeEnabled))
    },

    refreshSummaryHint(sessionId) {
      const session = this.sessions.find(s => s.id === sessionId)
      this.summaryHints = {
        ...this.summaryHints,
        [sessionId]: shouldTriggerSummary(session),
      }
    },

    async init() {
      if (this.initialized) return
      this.documentList = await db.documents.toArray()
      this.documentList.forEach(doc => { if (!doc.tag) doc.tag = '默认' })
      this.tags = [...new Set(this.documentList.map(d => d.tag))]
      if (this.tags.length === 0) this.tags = ['默认']
      // 加载会话
      this.sessions = await db.sessions.toArray()
      this.sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const hints = {}
      for (const session of this.sessions) {
        hints[session.id] = shouldTriggerSummary(session)
      }
      this.summaryHints = hints
      this.autoSummarizeEnabled = localStorage.getItem(AUTO_SUMMARY_STORAGE_KEY) === 'true'
      this.initialized = true
    },

    // ===== 会话管理 =====
    async newChat() {
      // 如果当前会话是空的，直接复用，不重复创建
      const current = this.sessions.find(s => s.id === this.currentSessionId)
      if (current && current.messages.length === 0) return current.id

      const session = {
        id: genId(),
        title: '新对话',
        messages: [],
        createdAt: new Date().toISOString(),
      }
      this.sessions.unshift(session)
      this.currentSessionId = session.id
      this.summaryHints = { ...this.summaryHints, [session.id]: false }
      // 不存 DB，等有第一条消息时再持久化
      return session.id
    },

    async switchSession(sessionId) {
      this.currentSessionId = sessionId
    },

    async addMessage(question, answer, relatedTexts = []) {
      // 如果没有当前会话，自动创建
      if (!this.currentSessionId) {
        await this.newChat()
      }
      const session = this.sessions.find(s => s.id === this.currentSessionId)
      if (!session) return

      const record = { question, answer, relatedTexts, time: new Date().toLocaleString() }
      session.messages.push(record)

      // 第一条消息时，用问题作为会话标题
      if (session.messages.length === 1) {
        session.title = question.length > 20 ? question.slice(0, 20) + '...' : question
      }

      await db.sessions.put(toRaw(session))
      this.refreshSummaryHint(session.id)
    },

    /** 删除当前会话中的指定消息 */
    async deleteMessage(index) {
      const session = this.sessions.find(s => s.id === this.currentSessionId)
      if (!session || index < 0 || index >= session.messages.length) return
      session.messages.splice(index, 1)
      await db.sessions.put(toRaw(session))
      this.refreshSummaryHint(session.id)
    },

    /** 更新当前会话中指定消息的回答 */
    async updateMessage(index, answer, relatedTexts = []) {
      const session = this.sessions.find(s => s.id === this.currentSessionId)
      if (!session || index < 0 || index >= session.messages.length) return
      session.messages[index].answer = answer
      session.messages[index].relatedTexts = relatedTexts
      session.messages[index].time = new Date().toLocaleString()
      await db.sessions.put(toRaw(session))
      this.refreshSummaryHint(session.id)
    },

    async renameSession(sessionId, newTitle) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (session) {
        session.title = newTitle
        await db.sessions.put(toRaw(session))
      }
    },

    async deleteSession(sessionId) {
      this.sessions = this.sessions.filter(s => s.id !== sessionId)
      await db.sessions.delete(sessionId)
      const { [sessionId]: _, ...rest } = this.summaryHints
      this.summaryHints = rest
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = this.sessions.length > 0 ? this.sessions[0].id : null
      }
    },

    async clearAllSessions() {
      this.sessions = []
      this.currentSessionId = null
      this.summaryHints = {}
      await db.sessions.clear()
    },

    /**
     * 用一条“会话总结”消息压缩历史，保留最近若干轮上下文
     * @param {string} sessionId
     * @param {string} summaryContent
     * @param {number} keepRecentCount
     */
    async compressSessionWithSummary(sessionId, summaryContent, keepRecentCount = 3) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (!session || !summaryContent) return

      const recent = session.messages.slice(-keepRecentCount)
      const summaryRecord = {
        question: '请总结我们前面的对话重点',
        answer: `以下为自动摘要（用于压缩上下文）:\n\n${summaryContent}`,
        relatedTexts: [],
        time: new Date().toLocaleString(),
      }

      session.messages = [summaryRecord, ...recent]
      await db.sessions.put(toRaw(session))
      this.refreshSummaryHint(session.id)
    },

    // ===== 文档管理 =====
    addTag(tag) {
      if (tag && !this.tags.includes(tag)) this.tags.push(tag)
    },

    async addDocument(doc) {
      if (!doc.tag) doc.tag = '默认'
      this.addTag(doc.tag)
      const exists = this.documentList.find(d => d.fileName === doc.fileName)
      if (exists) {
        Object.assign(exists, doc)
        await db.documents.put(doc)
      } else {
        this.documentList.push(doc)
        await db.documents.put(doc)
      }
    },

    async removeDocument(fileName) {
      this.documentList = this.documentList.filter(d => d.fileName !== fileName)
      await db.documents.delete(fileName)
    },

    async deleteTag(tag) {
      if (tag === '默认') return
      for (const doc of this.documentList) {
        if (doc.tag === tag) {
          doc.tag = '默认'
          await db.documents.put({ ...doc })
        }
      }
      this.tags = this.tags.filter(t => t !== tag)
    },
  }
})
