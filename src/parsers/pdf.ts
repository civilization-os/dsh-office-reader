import { readFileSync } from 'node:fs'
import rawPdfParse from 'pdf-parse'
import type { PdfReadOptions, PdfReadResult } from '../types.ts'

const pdfParse: any = (rawPdfParse as any).default || rawPdfParse

export interface PdfInspectResult {
  filePath: string
  totalPages: number
  info: Record<string, any>
  title?: string
  author?: string
}

/**
 * 快速检查 PDF 元数据与总页数
 */
export async function inspectPdf(filePath: string): Promise<PdfInspectResult> {
  const buffer = readFileSync(filePath)
  const data = await pdfParse(buffer, { max: 1 })

  return {
    filePath,
    totalPages: data.numpages || 1,
    info: data.info || {},
    title: data.info?.Title || undefined,
    author: data.info?.Author || undefined,
  }
}

/**
 * 分页与按需读取 PDF 正文
 */
export async function readPdfDocument(filePath: string, options: PdfReadOptions = {}): Promise<PdfReadResult> {
  const buffer = readFileSync(filePath)
  const pageTexts: { page: number; text: string }[] = []

  let currentPage = 1
  const customPagerender = (pageData: any) => {
    return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent: any) => {
      let lastY: any = null
      let text = ''
      for (const item of textContent.items) {
        if (lastY === item.transform[5] || lastY === null) {
          text += item.str
        } else {
          text += '\n' + item.str
        }
        lastY = item.transform[5]
      }
      pageTexts.push({ page: currentPage++, text: text.trim() })
      return text
    })
  }

  const maxPages = options.endPage ? options.endPage : (options.pages ? Math.max(...options.pages) : 50)
  const data = await pdfParse(buffer, {
    max: maxPages,
    pagerender: customPagerender,
  })

  const totalPages = data.numpages || pageTexts.length

  let filteredPages = pageTexts
  if (options.pages && options.pages.length > 0) {
    filteredPages = pageTexts.filter(p => options.pages!.includes(p.page))
  } else if (options.startPage || options.endPage) {
    const start = options.startPage || 1
    const end = options.endPage || totalPages
    filteredPages = pageTexts.filter(p => p.page >= start && p.page <= end)
  }

  const maxChars = options.maxChars || 40000
  let fullText = filteredPages.map(p => `--- [第 ${p.page} 页] ---\n${p.text}`).join('\n\n')
  let truncated = false

  if (fullText.length > maxChars) {
    fullText = fullText.slice(0, maxChars) + '\n\n*(...内容过长已自动截断)*'
    truncated = true
  }

  return {
    filePath,
    totalPages,
    totalLoadedPages: filteredPages.length,
    pages: filteredPages,
    fullText,
    truncated,
  }
}
