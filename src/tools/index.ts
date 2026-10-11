import { defineTool } from '@deepseek-ai/dsh-tools'
import { autoParseDocument, inspectDocument, readExcelSheet, readPdfDocument, readWordDocument } from '../parsers/index.ts'
import type { Config } from '../types.ts'

const output: any = {
  schema: { type: 'object', additionalProperties: true, properties: {} },
  render: (_args: any, value: any) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

export function registerOfficeTools(ctx: any, _config: Config = {}): void {
  const toolsService = ctx.tools
  if (!toolsService?.register) return

  const reg = (toolDef: any) => {
    ctx.effect(() => toolsService.register(defineTool(toolDef)))
  }

  // 1. 文档元数据与结构快速透视
  reg({
    name: 'doc_inspect',
    description: '快速透视 PDF、Excel 或 Word 文档的基础元数据（页数、工作表清单、标题、预估 Token），在读取大文档前先执行此工具了解文档结构，避免无脑全量读取撑爆上下文。',
    parameters: {
      path: { type: 'string', required: true, description: '待检查的文件路径（相对当前工作区或绝对路径）' },
    },
    output,
    isConcurrencySafe: () => true,
    async execute(args: { path: string }) {
      const meta = await inspectDocument(args.path)
      return {
        success: true,
        ...meta,
      }
    },
  })

  // 2. 分页按需读取 PDF 文档
  reg({
    name: 'doc_read_pdf',
    description: '分页、按范围按需抽取 PDF 文档正文。支持指定页码范围或离散页码（如第 1-5 页），彻底杜绝超长研报/图书溢出上下文。',
    parameters: {
      path: { type: 'string', required: true, description: 'PDF 文件路径' },
      startPage: { type: 'number', description: '起始页码（从 1 开始）' },
      endPage: { type: 'number', description: '结束页码' },
      pages: { type: 'array', items: { type: 'number' }, description: '具体需要抽取的页码列表，例如 [1, 2, 5]' },
      maxChars: { type: 'number', description: '最大字符数截断上限（默认 40000）' },
    },
    output,
    isConcurrencySafe: () => true,
    async execute(args: { path: string; startPage?: number; endPage?: number; pages?: number[]; maxChars?: number }) {
      const result = await readPdfDocument(args.path, args)
      return {
        success: true,
        ...result,
      }
    },
  })

  // 3. 读取 Excel 表格并转为 Markdown / JSON
  reg({
    name: 'doc_read_excel',
    description: '读取 Excel 表格 (.xlsx, .xls, .csv) 并将表格数据转换为清晰的 Markdown 表格、JSON 或 CSV。内置安全行数截断，防止几十万行数据炸毁 Token。',
    parameters: {
      path: { type: 'string', required: true, description: 'Excel 文件路径 (.xlsx, .xls, .csv)' },
      sheet: { type: 'string', description: '工作表名称（Sheet Name），留空则读取首个工作表' },
      maxRows: { type: 'number', description: '安全行数上限，默认 100 行以保护 Token 预算' },
      format: { type: 'string', enum: ['markdown', 'json', 'csv'], description: '数据输出格式，默认 markdown' },
    },
    output,
    isConcurrencySafe: () => true,
    async execute(args: { path: string; sheet?: string; maxRows?: number; format?: 'markdown' | 'json' | 'csv' }) {
      const result = readExcelSheet(args.path, args)
      return {
        success: true,
        ...result,
      }
    },
  })

  // 4. 将 Word (.docx) 解析为结构化 Markdown
  reg({
    name: 'doc_read_word',
    description: '将 Word (.docx) 文档精准解析为结构化 Markdown，保留标题层级、列表与表格。支持按特定章节标题精准抽取小节。',
    parameters: {
      path: { type: 'string', required: true, description: 'Word 文件路径 (.docx)' },
      targetHeading: { type: 'string', description: '目标章节标题（例如 "项目背景"），指定时仅提取该小节' },
      maxChars: { type: 'number', description: '最大字符数截断上限（默认 40000）' },
    },
    output,
    isConcurrencySafe: () => true,
    async execute(args: { path: string; targetHeading?: string; maxChars?: number }) {
      const result = await readWordDocument(args.path, args)
      return {
        success: true,
        ...result,
      }
    },
  })

  // 5. 自动万能文档读取入口
  reg({
    name: 'doc_parse_auto',
    description: '一步提取中小型文档内容。自动根据文件后缀识别 PDF、Excel 或 Word 格式，并提取清洗后的 Markdown 正文与概要。',
    parameters: {
      path: { type: 'string', required: true, description: '文档文件路径' },
    },
    output,
    isConcurrencySafe: () => true,
    async execute(args: { path: string }) {
      const result = await autoParseDocument(args.path)
      return {
        success: true,
        ...result,
      }
    },
  })
}
