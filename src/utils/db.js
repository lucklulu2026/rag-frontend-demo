import Dexie from 'dexie'

const db = new Dexie('ragKnowledgeBase')

db.version(1).stores({
  documents: 'fileName, uploadTime',
  vectors: '++id, fileName',
  qaHistory: '++id, time'
})

// v2: 文档增加 tag 字段索引
db.version(2).stores({
  documents: 'fileName, uploadTime, tag',
  vectors: '++id, fileName',
  qaHistory: '++id, time'
}).upgrade(tx => {
  // 给旧文档设置默认标签
  return tx.table('documents').toCollection().modify(doc => {
    if (!doc.tag) doc.tag = '默认'
  })
})

export default db
