/**
 * @file IndexedDB 数据库定义
 * @description 使用 Dexie.js 封装 IndexedDB，提供文档、向量、会话的持久化存储
 * @module tools/db
 */
import Dexie from 'dexie'

/** @type {Dexie} 全局数据库实例 */
const db = new Dexie('ragKnowledgeBase')

/**
 * 数据库 Schema 版本历史：
 * v1 - 基础表：documents, vectors, qaHistory
 * v2 - documents 增加 tag 字段（标签分组）
 * v3 - 增加 sessions 表（会话管理）
 */
db.version(1).stores({
  /** 文档表 - 主键: fileName, 索引: uploadTime */
  documents: 'fileName, uploadTime',
  /** 向量表 - 自增主键, 索引: fileName（按文档删除用） */
  vectors: '++id, fileName',
  /** 问答历史表（已废弃，保留兼容） */
  qaHistory: '++id, time'
})

db.version(2).stores({
  documents: 'fileName, uploadTime, tag',
  vectors: '++id, fileName',
  qaHistory: '++id, time'
}).upgrade(tx => {
  return tx.table('documents').toCollection().modify(doc => {
    if (!doc.tag) doc.tag = '默认'
  })
})

db.version(3).stores({
  documents: 'fileName, uploadTime, tag',
  vectors: '++id, fileName',
  qaHistory: '++id, time',
  /** 会话表 - 主键: id, 索引: title, createdAt */
  sessions: 'id, title, createdAt'
})

export default db
