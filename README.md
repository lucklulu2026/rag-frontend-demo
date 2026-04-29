# 🧠 RAG 智能知识库

基于 RAG（检索增强生成）技术的前端知识库问答应用。上传文档，AI 帮你秒级找到答案。

## 这是什么

一个纯前端的智能文档问答工具。你可以上传自己的文档（TXT、Markdown、PDF、Word），系统会自动解析、分块、向量化，构建成你的私有知识库。提问时，AI 会先从知识库中检索最相关的内容，再结合大模型生成精准回答，并标注引用来源。

## 核心功能

- **多格式文档支持** — 支持 TXT、MD、PDF、DOCX 文件上传和解析
- **智能分块** — 自动识别文档类型（普通文档/代码），按段落或函数为单位分块，支持重叠分块
- **向量化检索** — 基于通义千问 Embedding API 生成向量，余弦相似度匹配最相关内容
- **AI 对话问答** — 基于通义千问大模型，结合知识库检索结果生成回答
- **多轮对话** — 支持上下文记忆，连续追问
- **引用溯源** — 每个回答标注引用来源，展示原文片段和相似度评分
- **知识库管理** — 多文档管理、标签分组、文档预览（原文/分块）
- **会话管理** — 多会话支持，历史对话记录，重命名、删除
- **Markdown 渲染** — AI 回答支持 Markdown 格式和代码语法高亮
- **数据持久化** — 基于 IndexedDB，刷新页面数据不丢失
- **纯前端运行** — 所有数据存储在浏览器本地，保障数据隐私

## 技术栈

- **前端框架** — Vue 3 + Composition API + `<script setup>`
- **状态管理** — Pinia
- **路由** — Vue Router 4
- **样式** — SCSS（scoped）
- **存储** — Dexie.js（IndexedDB 封装）
- **AI 能力** — 通义千问 qwen-turbo（对话）+ text-embedding-v2（向量化）
- **文档解析** — pdfjs-dist（PDF）、mammoth（Word）
- **Markdown** — marked + highlight.js
- **构建工具** — Vite
- **部署** — 支持 Vercel（含 Serverless Function API 代理）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

在项目根目录创建 `.env` 文件：

```
VITE_TONGYI_API_KEY=你的通义千问API Key
VITE_GA_MEASUREMENT_ID=你的GA4统计ID（可选，例如 G-XXXXXXXXXX）
# 以下变量由 Vercel KV 连接项目后自动注入（本地可通过 vercel env pull 获取）
# KV_URL=
# KV_REST_API_URL=
# KV_REST_API_TOKEN=
# KV_REST_API_READ_ONLY_TOKEN=
```

API Key 申请地址：[阿里云 DashScope](https://dashscope.console.aliyun.com/)
GA4 创建入口：[Google Analytics](https://analytics.google.com/)

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173`，首页是产品介绍页，点击"开始体验"进入主应用。

## 访问与对话统计

项目已内置事件统计（优先写入 Vercel KV）：

- `site_visit`：用户打开站点
- `chat_send`：用户发送一次提问

### 如何启用

#### 方案 A：Vercel KV（推荐，国内可用）

1. 在 Vercel 项目中创建并连接 KV 数据库
2. 本地执行：

```bash
vercel link
vercel env pull .env.local
```

3. 重新部署（或本地使用 `vercel dev`）

#### 方案 B：GA4（可选）

在 `.env` 中配置 `VITE_GA_MEASUREMENT_ID` 后，会额外上报到 GA4。

### 在哪里查看

- KV 统计接口：`/api/stats`
- 示例返回：

```json
{
  "date": "2026-04-29",
  "stats": {
    "site_visit": { "total": 123, "today": 19 },
    "chat_send": { "total": 456, "today": 67 }
  }
}
```

- 若启用 GA4：在 GA4 后台的 **事件** 中查看 `chat_send`

## 使用方式

1. **上传文档** — 在左侧知识库面板，拖拽或选择文件，选择标签分组，点击"解析并入库"
2. **提出问题** — 在右侧对话区输入问题，AI 会从知识库中检索相关内容并生成回答
3. **查看引用** — 每个回答下方可展开"参考来源"，查看引用的原文片段和相似度
4. **管理知识库** — 点击文档名预览原文/分块，支持删除文档、管理标签分组
5. **多会话** — 点击"新对话"或 `Ctrl+K` 开启新会话，历史对话可随时切换回看

## 部署到 Vercel

项目已配置 Vercel Serverless Function 作为 API 代理，API Key 不会暴露到前端：

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 添加环境变量 `VITE_TONGYI_API_KEY`
4. 部署完成

## 项目结构

```
├── api/proxy.js              # Vercel Serverless Function（API 代理）
├── src/
│   ├── views/
│   │   ├── Introduction.vue  # 产品介绍落地页
│   │   └── MainApp.vue       # 主应用页
│   ├── components/
│   │   ├── DocumentUpload.vue # 知识库管理（上传、分组、预览）
│   │   └── QaChat.vue        # 智能问答（对话、历史、引用）
│   ├── store/ragStore.js     # Pinia 状态管理（文档、会话、标签）
│   ├── utils/
│   │   ├── db.js             # IndexedDB 数据库定义
│   │   ├── docParser.js      # 多格式文档解析
│   │   ├── embedding.js      # 通义千问 Embedding 封装
│   │   ├── llmUtils.js       # RAG 问答（检索 + 大模型）
│   │   ├── markdown.js       # Markdown 渲染 + 代码高亮
│   │   ├── request.js        # 统一请求层（本地/线上自适应）
│   │   └── vectorUtils.js    # 向量生成、存储、检索、智能分块
│   ├── router/index.js       # 路由配置
│   ├── style.scss            # 全局样式
│   └── main.js               # 入口文件
├── vercel.json               # Vercel 部署配置
└── package.json
```

## License

MIT
