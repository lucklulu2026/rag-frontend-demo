import * as pdfjsLib from 'pdfjs-dist/build/pdf'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'
import mammoth from 'mammoth'

// 使用 Vite 的 ?url 导入 worker 文件，避免 CDN 版本不匹配
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * 解析 PDF 文件
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
 * 解析 Word 文件（.docx）
 */
const parseWord = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * 解析 TXT / MD 文件
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
 * 根据文件类型自动选择解析方式
 */
const parseDocument = async (file) => {
  const ext = file.name.split('.').pop().toLowerCase()

  switch (ext) {
    case 'pdf':
      return parsePDF(file)
    case 'docx':
      return parseWord(file)
    case 'txt':
    case 'md':
      return parseText(file)
    default:
      throw new Error(`不支持的文件格式：.${ext}`)
  }
}

export { parseDocument }
