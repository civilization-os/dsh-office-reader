import { extname, basename } from 'node:path'
import type { DocumentType } from '../types.ts'

/**
 * 根据文件名后缀识别文档类型
 */
export function detectDocumentType(filePath: string): DocumentType {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.pdf') {
    return 'pdf'
  }
  if (['.xlsx', '.xls', '.csv', '.tsv'].includes(ext)) {
    return 'excel'
  }
  if (['.docx', '.doc'].includes(ext)) {
    return 'word'
  }
  return 'unknown'
}

/**
 * 格式化文件字节大小为易读形式
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 估算字符串消耗的 Token 大致数量（中英文混合估算）
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // 中文字符数 + 英文单词数大致对应 token 消耗
  const cnCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const enWordCount = (text.match(/[a-zA-Z0-9_]+/g) || []).length
  return Math.ceil(cnCount * 1.2 + enWordCount * 1.3)
}
