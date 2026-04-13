import { defineStore } from 'pinia'
import db from '../utils/db.js'

export const useRagStore = defineStore('rag', {
  state: () => ({
    documentList: [],
    qaHistory: [],
    tags: [],
    initialized: false,
  }),
  getters: {
    // 按标签分组的文档
    groupedDocuments(state) {
      const groups = {}
      for (const doc of state.documentList) {
        const tag = doc.tag || '默认'
        if (!groups[tag]) groups[tag] = []
        groups[tag].push(doc)
      }
      return groups
    }
  },
  actions: {
    async init() {
      if (this.initialized) return
      this.documentList = await db.documents.toArray()
      // 给没有 tag 的旧文档补上默认标签
      this.documentList.forEach(doc => {
        if (!doc.tag) doc.tag = '默认'
      })
      // 提取所有标签
      this.tags = [...new Set(this.documentList.map(d => d.tag))]
      if (this.tags.length === 0) this.tags = ['默认']
      this.qaHistory = (await db.qaHistory.toArray()).map(item => ({
        question: item.question,
        answer: item.answer,
        relatedTexts: item.relatedTexts || [],
        time: item.time
      }))
      this.initialized = true
    },

    addTag(tag) {
      if (tag && !this.tags.includes(tag)) {
        this.tags.push(tag)
      }
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

    async updateDocTag(fileName, newTag) {
      const doc = this.documentList.find(d => d.fileName === fileName)
      if (doc) {
        doc.tag = newTag
        this.addTag(newTag)
        await db.documents.put({ ...doc })
      }
    },

    async removeDocument(fileName) {
      this.documentList = this.documentList.filter(d => d.fileName !== fileName)
      await db.documents.delete(fileName)
    },

    // 删除标签：该标签下的文档全部移到"默认"
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

    async addQaHistory(question, answer, relatedTexts = []) {
      const record = { question, answer, relatedTexts, time: new Date().toLocaleString() }
      this.qaHistory.push(record)
      await db.qaHistory.add(record)
    },

    async clearQaHistory() {
      this.qaHistory = []
      await db.qaHistory.clear()
    }
  }
})
