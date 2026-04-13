import { defineStore } from 'pinia'
import db from '../utils/db.js'

export const useRagStore = defineStore('rag', {
  state: () => ({
    documentList: [],
    qaHistory: [],
    initialized: false,
  }),
  actions: {
    // 从 IndexedDB 加载持久化数据（应用启动时调用）
    async init() {
      if (this.initialized) return
      this.documentList = await db.documents.toArray()
      this.qaHistory = (await db.qaHistory.toArray()).map(item => ({
        question: item.question,
        answer: item.answer,
        relatedTexts: item.relatedTexts || [],
        time: item.time
      }))
      this.initialized = true
    },

    async addDocument(doc) {
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

    async addQaHistory(question, answer, relatedTexts = []) {
      const record = {
        question,
        answer,
        relatedTexts,
        time: new Date().toLocaleString()
      }
      this.qaHistory.push(record)
      await db.qaHistory.add(record)
    },

    async clearQaHistory() {
      this.qaHistory = []
      await db.qaHistory.clear()
    }
  }
})
