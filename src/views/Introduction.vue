<template>
  <div class="intro-page">
    <!-- 导航栏 -->
    <nav class="intro-nav">
      <div class="intro-nav-inner">
        <div class="intro-logo">
          <img src="../assets/images/animal_logo.png" alt="logo" class="intro-logo-img" />
          RAG 智能知识库
        </div>
        <router-link to="/app" class="intro-nav-btn">开始使用</router-link>
      </div>
    </nav>

    <!-- Hero 区域 -->
    <section class="intro-hero">
      <div class="intro-hero-inner">
        <div class="intro-hero-badge">✨ AI 驱动的文档问答</div>
        <h1 class="intro-hero-title">
          上传文档，<br/>AI 帮你秒级找到答案
        </h1>
        <p class="intro-hero-desc">
          基于 RAG（检索增强生成）技术，将你的文档变成智能知识库。<br/>
          提问即检索，回答有出处，告别大海捞针式翻文档。
        </p>
        <div class="intro-hero-actions">
          <router-link to="/app" class="intro-btn-primary">立即体验</router-link>
          <a class="intro-btn-secondary" @click.prevent="scrollToFeatures">了解更多 ↓</a>
        </div>
      </div>
    </section>

    <!-- 功能介绍 -->
    <section id="features" class="intro-features">
      <div class="intro-section-inner">
        <h2 class="intro-section-title">核心功能</h2>
        <div class="intro-feature-grid">
          <div class="intro-feature-card">
            <div class="intro-feature-icon">📄</div>
            <h3>多格式文档支持</h3>
            <p>支持 TXT、Markdown、PDF、Word 文档上传，自动解析提取文本内容，构建你的专属知识库。</p>
          </div>
          <div class="intro-feature-card">
            <div class="intro-feature-icon">🔍</div>
            <h3>智能向量检索</h3>
            <p>文档自动分块并向量化，提问时通过语义相似度匹配最相关的内容片段，精准定位答案来源。</p>
          </div>
          <div class="intro-feature-card">
            <div class="intro-feature-icon">💬</div>
            <h3>AI 对话问答</h3>
            <p>基于通义千问大模型，结合知识库检索结果生成回答，支持多轮对话和上下文记忆。</p>
          </div>
          <div class="intro-feature-card">
            <div class="intro-feature-icon">📎</div>
            <h3>引用溯源</h3>
            <p>每个回答都标注引用来源，展示原文片段和相似度评分，让你验证答案的可靠性。</p>
          </div>
          <div class="intro-feature-card">
            <div class="intro-feature-icon">📚</div>
            <h3>知识库管理</h3>
            <p>支持多文档管理，随时添加或移除文档，数据持久化存储，刷新页面不丢失。</p>
          </div>
          <div class="intro-feature-card">
            <div class="intro-feature-icon">🔒</div>
            <h3>纯前端运行</h3>
            <p>所有数据存储在浏览器本地，文档不上传到任何服务器，保障你的数据隐私安全。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用流程 -->
    <section class="intro-steps">
      <div class="intro-section-inner">
        <h2 class="intro-section-title">三步开始</h2>
        <div class="intro-steps-grid">
          <div class="intro-step">
            <div class="intro-step-num">1</div>
            <h3>上传文档</h3>
            <p>选择你的 TXT、MD、PDF 或 DOCX 文件，点击解析入库</p>
          </div>
          <div class="intro-step-arrow">→</div>
          <div class="intro-step">
            <div class="intro-step-num">2</div>
            <h3>提出问题</h3>
            <p>在对话框中输入你想了解的问题，支持自然语言提问</p>
          </div>
          <div class="intro-step-arrow">→</div>
          <div class="intro-step">
            <div class="intro-step-num">3</div>
            <h3>获取答案</h3>
            <p>AI 从知识库中检索相关内容，生成带引用来源的精准回答</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 适用场景 -->
    <section class="intro-scenarios">
      <div class="intro-section-inner">
        <h2 class="intro-section-title">适用场景</h2>
        <div class="intro-scenario-grid">
          <div class="intro-scenario-item">
            <span class="intro-scenario-icon">👨‍💻</span>
            <div>
              <h4>技术文档查询</h4>
              <p>上传 API 文档、技术规范，快速查找接口说明和使用方法</p>
            </div>
          </div>
          <div class="intro-scenario-item">
            <span class="intro-scenario-icon">📋</span>
            <div>
              <h4>制度规范检索</h4>
              <p>导入公司制度、流程文档，随时查询报销标准、请假流程</p>
            </div>
          </div>
          <div class="intro-scenario-item">
            <span class="intro-scenario-icon">📖</span>
            <div>
              <h4>学习资料整理</h4>
              <p>上传课件、笔记、论文，用提问的方式复习和整理知识点</p>
            </div>
          </div>
          <div class="intro-scenario-item">
            <span class="intro-scenario-icon">🏢</span>
            <div>
              <h4>项目知识沉淀</h4>
              <p>将项目文档入库，新成员通过问答快速了解项目背景和细节</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="intro-cta">
      <div class="intro-section-inner">
        <h2>准备好了吗？</h2>
        <p>无需注册，无需安装，打开浏览器即可使用</p>
        <router-link to="/app" class="intro-btn-primary intro-btn-lg">开始体验 →</router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="intro-footer">
      <p>RAG 智能知识库 · 基于通义千问 & Vue 3 构建</p>
    </footer>
  </div>
</template>

<script setup>
const scrollToFeatures = () => {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style lang="scss" scoped>
.intro-page { min-height: 100vh; background: #fff; color: var(--text); }

// 导航
.intro-nav {
  position: fixed; top: 0; left: 0; right: 0;
  background: rgba(255,255,255,0.9); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border); z-index: 100;

  &-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
  &-btn {
    padding: 8px 20px; background: var(--primary); color: #fff; border-radius: 8px;
    font-size: 14px; font-weight: 500; text-decoration: none; transition: background 0.2s;
    &:hover { background: var(--primary-hover); }
  }
}

.intro-logo {
  font-size: 18px; font-weight: 700; color: var(--text);
  display: flex; align-items: center; gap: 8px;
}
.intro-logo-img { width: 28px; height: 28px; object-fit: contain; }

// Hero
.intro-hero {
  padding: 140px 32px 80px; text-align: center;
  background: linear-gradient(180deg, #f0f4ff 0%, #fff 100%);

  &-inner { max-width: 700px; margin: 0 auto; }
  &-badge { display: inline-block; padding: 6px 16px; background: #e8f0fe; color: var(--primary); border-radius: 20px; font-size: 14px; font-weight: 500; margin-bottom: 24px; }
  &-title { font-size: 48px; font-weight: 800; line-height: 1.2; color: var(--text); margin-bottom: 20px; letter-spacing: -1px; }
  &-desc { font-size: 18px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 36px; }
  &-actions { display: flex; gap: 16px; justify-content: center; align-items: center; }
}

.intro-btn {
  &-primary {
    display: inline-block; padding: 12px 32px; background: var(--primary); color: #fff;
    border-radius: 10px; font-size: 16px; font-weight: 600; text-decoration: none;
    transition: all 0.2s; box-shadow: 0 4px 14px rgba(79,110,247,0.3);
    &:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,110,247,0.4); }
  }
  &-lg { padding: 16px 40px; font-size: 18px; }
  &-secondary {
    padding: 12px 24px; color: var(--text-secondary); font-size: 16px;
    text-decoration: none; cursor: pointer; transition: color 0.2s;
    &:hover { color: var(--primary); }
  }
}

// 通用 section
.intro-section {
  &-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; }
  &-title { font-size: 32px; font-weight: 700; text-align: center; margin-bottom: 48px; color: var(--text); }
}

// 功能卡片
.intro-features { padding: 80px 0; background: var(--bg); }
.intro-feature {
  &-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  &-card {
    background: #fff; padding: 32px 28px; border-radius: 16px;
    border: 1px solid var(--border); transition: all 0.2s;
    &:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-2px); }
    h3 { font-size: 18px; font-weight: 600; margin-bottom: 10px; color: var(--text); }
    p { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }
  }
  &-icon { font-size: 36px; margin-bottom: 16px; }
}

// 步骤
.intro-steps { padding: 80px 0; }
.intro-steps-grid { display: flex; align-items: center; justify-content: center; gap: 24px; }
.intro-step {
  text-align: center; flex: 1; max-width: 260px;
  &-num { width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
  p { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
  &-arrow { font-size: 24px; color: #c9cdd4; flex-shrink: 0; }
}

// 场景
.intro-scenarios { padding: 80px 0; background: var(--bg); }
.intro-scenario {
  &-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  &-item {
    display: flex; align-items: flex-start; gap: 16px; padding: 24px;
    background: #fff; border-radius: 12px; border: 1px solid var(--border);
    h4 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    p { font-size: 14px; color: var(--text-secondary); line-height: 1.5; }
  }
  &-icon { font-size: 32px; flex-shrink: 0; }
}

// CTA
.intro-cta {
  padding: 80px 0; text-align: center;
  h2 { font-size: 36px; font-weight: 700; margin-bottom: 12px; }
  p { font-size: 16px; color: var(--text-secondary); margin-bottom: 32px; }
}

// Footer
.intro-footer { padding: 32px; text-align: center; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-secondary); }

// 响应式
@media (max-width: 768px) {
  .intro-hero-title { font-size: 32px; }
  .intro-feature-grid { grid-template-columns: 1fr; }
  .intro-steps-grid { flex-direction: column; }
  .intro-step-arrow { transform: rotate(90deg); }
  .intro-scenario-grid { grid-template-columns: 1fr; }
}
</style>
