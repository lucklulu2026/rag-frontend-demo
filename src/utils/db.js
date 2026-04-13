import Dexie from 'dexie'

// IndexedDB 数据库，替代 localStorage，支持大容量存储
const db = new Dexie('ragKnowledgeBase')

db.version(1).stores({
  // 文档表：按 fileName 主键
  documents: 'fileName, uploadTime',
  // 向量表：自增 id，按 fileName 索引（方便按文档删除）
  vectors: '++id, fileName',
  // 问答历史表
  qaHistory: '++id, time'
})

export default db
