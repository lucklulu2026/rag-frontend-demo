import Dexie from 'dexie'

const db = new Dexie('ragKnowledgeBase')

db.version(1).stores({
  documents: 'fileName, uploadTime',
  vectors: '++id, fileName',
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

// v3: 增加会话表，每个会话包含多条对话
db.version(3).stores({
  documents: 'fileName, uploadTime, tag',
  vectors: '++id, fileName',
  qaHistory: '++id, time',
  sessions: 'id, title, createdAt'
})

export default db
