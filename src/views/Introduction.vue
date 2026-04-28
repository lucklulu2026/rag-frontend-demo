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
        <div class="intro-hero-badge">✨ 面向本地知识库的 RAG 问答工作台</div>
        <h1 class="intro-hero-title">
          把分散文档，<br/>变成可追溯的智能知识库
        </h1>
        <p class="intro-hero-desc">
          支持多格式文档解析、本地向量化、混合检索与 AI 对话问答。<br/>
          不只是“能问”，还能给出引用来源、管理知识库、保留多轮上下文。
        </p>
        <div class="intro-hero-actions">
          <router-link to="/app" class="intro-btn-primary">立即体验</router-link>
          <a class="intro-btn-secondary" @click.prevent="scrollToFeatures">了解更多 ↓</a>
        </div>
        <div class="intro-hero-highlights">
          <span>多格式解析</span>
          <span>混合检索</span>
          <span>来源可追溯</span>
          <span>本地数据持久化</span>
        </div>
      </div>
    </section>

    <!-- 功能介绍 -->
    <section id="features" class="intro-features intro-reveal-section">
      <div class="intro-section-inner">
        <h2 class="intro-section-title intro-reveal">核心功能</h2>
        <div class="intro-feature-grid">
          <div class="intro-feature-card intro-reveal" style="--reveal-delay: 0.05s">
            <div class="intro-feature-icon">📄</div>
            <h3>多格式文档解析入库</h3>
            <p>支持 TXT、Markdown、PDF、DOCX 上传解析，自动提取文本并进入知识库，减少人工整理成本。</p>
          </div>
          <div class="intro-feature-card intro-reveal" style="--reveal-delay: 0.1s">
            <div class="intro-feature-icon">🧩</div>
            <h3>智能分块与向量化</h3>
            <p>自动按段落或代码结构切分内容，完成向量生成与存储，让长文档、技术资料也能被稳定召回。</p>
          </div>
          <div class="intro-feature-card intro-reveal" style="--reveal-delay: 0.15s">
            <div class="intro-feature-icon">🔎</div>
            <h3>混合检索更精准</h3>
            <p>结合语义检索、关键词检索与结果融合机制，在自然语言提问和术语检索场景下都能提高命中率。</p>
          </div>
          <div class="intro-feature-card intro-reveal" style="--reveal-delay: 0.2s">
            <div class="intro-feature-icon">💬</div>
            <h3>AI 问答与多轮会话</h3>
            <p>在检索结果基础上生成回答，支持连续追问、会话切换与上下文保留，适合持续式文档问答。</p>
          </div>
          <div class="intro-feature-card intro-reveal" style="--reveal-delay: 0.25s">
            <div class="intro-feature-icon">📎</div>
            <h3>回答附带引用来源</h3>
            <p>每次回答都可展开查看参考片段、来源文档和相关性分数，方便校验结论是否可信。</p>
          </div>
          <div class="intro-feature-card intro-reveal" style="--reveal-delay: 0.3s">
            <div class="intro-feature-icon">🗂️</div>
            <h3>知识库管理与本地持久化</h3>
            <p>支持文档分组、筛选、预览与删除，文档、向量和历史会话均保存在本地浏览器中，刷新不丢失。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用流程 -->
    <section class="intro-steps intro-reveal-section">
      <div class="intro-section-inner">
        <h2 class="intro-section-title intro-reveal">三步开始</h2>
        <div class="intro-steps-grid">
          <div class="intro-step intro-reveal" style="--reveal-delay: 0.05s">
            <div class="intro-step-num">1</div>
            <h3>导入资料</h3>
            <p>上传制度文档、项目资料、技术手册或学习笔记，自动完成解析与知识入库</p>
          </div>
          <div class="intro-step-arrow intro-reveal" style="--reveal-delay: 0.1s">→</div>
          <div class="intro-step intro-reveal" style="--reveal-delay: 0.15s">
            <div class="intro-step-num">2</div>
            <h3>按需提问</h3>
            <p>直接输入自然语言问题，也可以围绕当前话题连续追问，快速锁定目标信息</p>
          </div>
          <div class="intro-step-arrow intro-reveal" style="--reveal-delay: 0.2s">→</div>
          <div class="intro-step intro-reveal" style="--reveal-delay: 0.25s">
            <div class="intro-step-num">3</div>
            <h3>查看答案与出处</h3>
            <p>系统返回基于知识库的回答，并附上来源片段和文档定位信息，方便继续核对</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 适用场景 -->
    <section class="intro-scenarios intro-reveal-section">
      <div class="intro-section-inner">
        <h2 class="intro-section-title intro-reveal">适用场景</h2>
        <div class="intro-scenario-grid">
          <div class="intro-scenario-item intro-reveal" style="--reveal-delay: 0.05s">
            <span class="intro-scenario-icon">👨‍💻</span>
            <div>
              <h4>技术资料检索</h4>
              <p>上传 API 文档、研发规范、项目说明，快速定位接口参数、流程规则和实现背景</p>
            </div>
          </div>
          <div class="intro-scenario-item intro-reveal" style="--reveal-delay: 0.1s">
            <span class="intro-scenario-icon">📋</span>
            <div>
              <h4>制度与流程问答</h4>
              <p>导入公司制度、流程手册和运营规范，随时查询报销标准、审批节点和执行口径</p>
            </div>
          </div>
          <div class="intro-scenario-item intro-reveal" style="--reveal-delay: 0.15s">
            <span class="intro-scenario-icon">📖</span>
            <div>
              <h4>学习内容沉淀</h4>
              <p>把课件、论文、笔记整理成可对话知识库，用问答代替反复翻阅和手动摘录</p>
            </div>
          </div>
          <div class="intro-scenario-item intro-reveal" style="--reveal-delay: 0.2s">
            <span class="intro-scenario-icon">🏢</span>
            <div>
              <h4>团队知识沉淀</h4>
              <p>沉淀项目文档、交付材料和内部 SOP，让新成员通过问答快速完成信息补齐</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="intro-cta intro-reveal-section">
      <div class="intro-section-inner">
        <h2 class="intro-reveal">让文档真正变成可用知识</h2>
        <p class="intro-reveal" style="--reveal-delay: 0.08s">从上传、检索到问答全流程打通，适合做轻量知识库 Demo、内部工具验证和场景原型展示</p>
        <router-link to="/app" class="intro-btn-primary intro-btn-lg intro-reveal" style="--reveal-delay: 0.16s">开始体验 →</router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="intro-footer">
      <p>RAG 智能知识库 · 基于通义千问 & Vue 3 构建</p>
    </footer>

    <div class="intro-contact-float">
      <div class="intro-contact-title">扫码咨询 / 获取演示</div>
      <img :src="contactQrCode" alt="联系二维码" class="intro-contact-qr" />
      <div class="intro-contact-phone-label">手机联系方式</div>
      <a class="intro-contact-phone" :href="`tel:${contactPhone}`">{{ contactPhone }}</a>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import contactQrCode from '../assets/images/qrcode.jpeg'

const contactPhone = '189-3046-4565'

let revealObserver

const scrollToFeatures = () => {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  const revealItems = document.querySelectorAll('.intro-reveal')

  if (!revealItems.length) return

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      revealObserver?.unobserve(entry.target)
    })
  }, {
    threshold: 0.18,
    rootMargin: '0px 0px -8% 0px'
  })

  revealItems.forEach((item) => revealObserver.observe(item))
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
})
</script>

<style lang="scss" scoped>
.intro-page { min-height: 100vh; background: #fff; color: var(--text); }

.intro-reveal {
  --reveal-delay: 0s;
  opacity: 0;
  transform: translateY(32px);
  transition:
    opacity 0.7s ease,
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--reveal-delay);
  will-change: opacity, transform;

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

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
  &-highlights {
    margin-top: 28px; display: flex; gap: 12px; justify-content: center;
    flex-wrap: wrap;
    span {
      padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.9);
      border: 1px solid rgba(79,110,247,0.12); color: var(--text-secondary); font-size: 13px;
    }
  }
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

.intro-contact-float {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 188px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(79, 110, 247, 0.12);
  box-shadow: 0 16px 40px rgba(16, 24, 40, 0.14);
  z-index: 110;
  text-align: center;
}

.intro-contact-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 10px;
}

.intro-contact-qr {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
}

.intro-contact-phone-label {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.intro-contact-phone {
  display: inline-block;
  margin-top: 4px;
  font-weight: 400;
  color: var(--primary);
  text-decoration: none;
}

.intro-contact-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

@media (prefers-reduced-motion: reduce) {
  .intro-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

// 响应式
@media (max-width: 768px) {
  .intro-hero-title { font-size: 32px; }
  .intro-hero { padding-left: 20px; padding-right: 20px; }
  .intro-nav-inner,
  .intro-section-inner { padding-left: 20px; padding-right: 20px; }
  .intro-feature-grid { grid-template-columns: 1fr; }
  .intro-steps-grid { flex-direction: column; }
  .intro-step-arrow { transform: rotate(90deg); }
  .intro-scenario-grid { grid-template-columns: 1fr; }
  .intro-contact-float {
    right: 16px;
    bottom: 16px;
    width: 150px;
    padding: 12px;
  }
  .intro-contact-title { font-size: 13px; }
  .intro-contact-phone { font-size: 16px; }
}
</style>
