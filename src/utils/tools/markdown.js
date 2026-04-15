/**
 * @file Markdown 渲染工具
 * @description 使用 marked 解析 Markdown，highlight.js 实现代码语法高亮
 * @module tools/markdown
 */
import { marked } from 'marked'
import hljs from 'highlight.js'

// 配置 marked 渲染选项
marked.setOptions({
  /**
   * 代码高亮回调
   * @param {string} code - 代码内容
   * @param {string} lang - 语言标识
   * @returns {string} 高亮后的 HTML
   */
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  /** 换行符转 <br> */
  breaks: true,
  /** 启用 GitHub Flavored Markdown */
  gfm: true,
})

/**
 * 将 Markdown 文本渲染为 HTML 字符串
 * @param {string} text - Markdown 原文
 * @returns {string} 渲染后的 HTML
 */
export function renderMarkdown(text) {
  if (!text) return ''
  return marked.parse(text)
}
