import { existsSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import type { DocumentMeta, DocumentType } from '../types.ts'
import { detectDocumentType, estimateTokens } from './detector.ts'
import { inspectPdf, readPdfDocument } from './pdf.ts'
import { inspectExcel, readExcelSheet } from './excel.ts'
import { readWordDocument } from './word.ts'

export * from './detector.ts'
export * from './pdf.ts'
export * from './excel.ts'
export * from './word.ts'

/**
 * 统一快速透视文档元数据
 */
export async function inspectDocument(filePath: string): Promise<DocumentMeta> {
  const full = resolve(filePath)
  if (!existsSync(full)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  const stat = statSync(full)
  const type: DocumentType = detectDocumentType(full)
  const meta: DocumentMeta = {
    type,
    filePath,
    fileName: basename(full),
    fileSize: stat.size,
  }

  if (type === 'pdf') {
    try {
      const pdfInfo = await inspectPdf(full)
      meta.pageCount = pdfInfo.totalPages
      meta.title = pdfInfo.title
      meta.author = pdfInfo.author
    } catch {}
  } else if (type === 'excel') {
    try {
      const excelInfo = inspectExcel(full)
      meta.sheets = excelInfo.sheets
    } catch {}
  } else if (type === 'word') {
    try {
      const wordInfo = await readWordDocument(full, { maxChars: 2000 })
      meta.paragraphsCount = wordInfo.headings.length
      meta.title = wordInfo.headings[0]
    } catch {}
  }

  return meta
}

/**
 * 自动识别并一步提取文档内容
 */
export async function autoParseDocument(filePath: string, options: any = {}): Promise<{
  type: DocumentType
  fileName: string
  content: string
  summary: string
  estimatedTokens: number
  truncated: boolean
}> {
  const full = resolve(filePath)
  if (!existsSync(full)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  const type = detectDocumentType(full)
  const fileName = basename(full)

  if (type === 'pdf') {
    const res = await readPdfDocument(full, options)
    const tokens = estimateTokens(res.fullText)
    return {
      type,
      fileName,
      content: res.fullText,
      summary: `PDF 文档共 ${res.totalPages} 页，本次读取 ${res.totalLoadedPages} 页。`,
      estimatedTokens: tokens,
      truncated: res.truncated,
    }
  }

  if (type === 'excel') {
    const res = readExcelSheet(full, options)
    const tokens = estimateTokens(res.content)
    return {
      type,
      fileName,
      content: res.content,
      summary: `Excel 表格包含工作表 [${res.availableSheets.join(', ')}]，当前呈现工作表 "${res.sheetName}" (${res.totalRows} 行 x ${res.totalCols} 列)。`,
      estimatedTokens: tokens,
      truncated: res.truncated,
    }
  }

  if (type === 'word') {
    const res = await readWordDocument(full, options)
    const tokens = estimateTokens(res.markdown)
    return {
      type,
      fileName,
      content: res.markdown,
      summary: `Word 文档已转为 Markdown，包含章节：${res.headings.slice(0, 5).join(' / ') || '无明确大纲'}。`,
      estimatedTokens: tokens,
      truncated: res.truncated,
    }
  }

  throw new Error(`不支持的文档格式: ${fileName}（目前支持 .pdf, .xlsx, .xls, .csv, .docx）`)
}
