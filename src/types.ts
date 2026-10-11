export type DocumentType = 'pdf' | 'excel' | 'word' | 'unknown'

export interface DocumentMeta {
  type: DocumentType
  filePath: string
  fileName: string
  fileSize: number
  title?: string
  author?: string
  pageCount?: number
  sheets?: { name: string; rowCount: number; colCount: number }[]
  paragraphsCount?: number
  estimatedTokens?: number
}

export interface PdfReadOptions {
  pages?: number[]
  startPage?: number
  endPage?: number
  maxChars?: number
}

export interface PdfReadResult {
  filePath: string
  totalLoadedPages: number
  totalPages: number
  pages: { page: number; text: string }[]
  fullText: string
  truncated: boolean
}

export interface ExcelReadOptions {
  sheet?: string
  range?: string
  maxRows?: number
  maxCols?: number
  format?: 'markdown' | 'json' | 'csv'
}

export interface ExcelReadResult {
  filePath: string
  sheetName: string
  availableSheets: string[]
  totalRows: number
  totalCols: number
  content: string // Markdown table or JSON string or CSV
  truncated: boolean
}

export interface WordReadOptions {
  extractHeadingsOnly?: boolean
  targetHeading?: string
  maxChars?: number
}

export interface WordReadResult {
  filePath: string
  title?: string
  markdown: string
  headings: string[]
  truncated: boolean
}

export interface Config {
  maxPdfPagesPerRead?: number
  maxExcelRowsPerRead?: number
  maxTextCharsLimit?: number
  enableFormatPreview?: boolean
}
