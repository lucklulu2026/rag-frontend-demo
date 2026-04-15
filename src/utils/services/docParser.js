/**
 * @file 文档解析服务
 * @description 支持 TXT、MD、PDF、DOCX 多格式文档解析，提取纯文本内容
 * @module services/docParser
 */
import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import mammoth from 'mammoth'

// 配置 pdf.js Worker（使用 Vite ?url 导入本地文件）
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * 解析 PDF 文件，逐页提取文本
 * @param {File} file - PDF 文件对象
 * @returns {Promise<string>} 全部页面的文本内容（换行分隔）
 */
const parsePDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map(item => item.str).join(' ')
    pages.push(text)
  }

  return pages.join('\n')
}

/**
 * 解析 Word 文件（.docx），提取纯文本
 * @param {File} file - DOCX 文件对象
 * @returns {Promise<string>} 文档文本内容
 */
const parseWord = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * 解析纯文本文件（TXT / MD）
 * @param {File} file - 文本文件对象
 * @returns {Promise<string>} 文件文本内容
 */
const parseText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file, 'utf-8')
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('文件读取失败'))
  })
}

/**
 * 统一文档解析入口，根据文件扩展名自动选择解析方式
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 解析后的纯文本
 * @throws {Error} 不支持的文件格式
 */
const parseDocument = async (file) => {
  const ext = file.name.split('.').pop().toLowerCase()

  switch (ext) {
    case 'pdf':  return parsePDF(file)
    case 'docx': return parseWord(file)
    case 'txt':
    case 'md':   return parseText(file)
    default:     throw new Error(`不支持的文件格式：.${ext}`)
  }
}

export { parseDocument }
