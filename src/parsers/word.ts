import rawMammoth from 'mammoth'
import type { WordReadOptions, WordReadResult } from '../types.ts'

const mammoth: any = (rawMammoth as any).default || rawMammoth

/**
 * 将 Word (.docx) 文档解析为结构化 Markdown
 */
export async function readWordDocument(filePath: string, options: WordReadOptions = {}): Promise<WordReadResult> {
  const result = await mammoth.convertToMarkdown({ path: filePath })
  let markdown = result.value || ''
  const maxChars = options.maxChars || 40000
  let truncated = false

  // 提取各级标题
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: string[] = []
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push(match[2].trim())
  }

  // 如果指定了仅读取某个二级标题/章节
  if (options.targetHeading) {
    const target = options.targetHeading.trim().toLowerCase()
    const lines = markdown.split(/\r?\n/)
    let capturing = false
    const capturedLines: string[] = []

    for (const line of lines) {
      const isHeader = line.startsWith('#')
      if (isHeader) {
        const title = line.replace(/^#+\s*/, '').trim().toLowerCase()
        if (title.includes(target)) {
          capturing = true
          capturedLines.push(line)
          continue
        } else if (capturing) {
          // 遇到下一个同级或高级标题则停止
          break
        }
      }
      if (capturing) {
        capturedLines.push(line)
      }
    }

    if (capturedLines.length > 0) {
      markdown = capturedLines.join('\n')
    }
  }

  if (markdown.length > maxChars) {
    markdown = markdown.slice(0, maxChars) + '\n\n*(...内容过长已自动截断)*'
    truncated = true
  }

  return {
    filePath,
    markdown,
    headings,
    truncated,
  }
}
