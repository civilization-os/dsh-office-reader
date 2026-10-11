import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type { Config as PluginConfig } from './types.ts'
import { registerOfficeTools } from './tools/index.ts'
import { autoParseDocument, inspectDocument } from './parsers/index.ts'

export const name = '@civilization/dsh-office-reader'
export const inject = ['tools', 'webServer', 'skills']

export * from './types.ts'
export * from './parsers/index.ts'

export interface Config extends PluginConfig {}

export const Config: Schema<Config> = Schema.object({
  maxPdfPagesPerRead: Schema.natural()
    .default(20)
    .description('单次读取 PDF 的默认最大页数上限（防止 Token 溢出）'),
  maxExcelRowsPerRead: Schema.natural()
    .default(100)
    .description('单次读取 Excel 表格的默认最大行数截断（防止超大表格）'),
  maxTextCharsLimit: Schema.natural()
    .default(40000)
    .description('单次提取文档正文的字符数软上限（默认 40,000 字）'),
  enableFormatPreview: Schema.boolean()
    .default(true)
    .description('是否启用右侧栏文档结构与内容快速透视面板'),
}).description('Office 与 PDF 文档安全解析与阅读器')

async function readSkillContent(): Promise<string> {
  try {
    const skillUrl = new URL('../skills/office-reader/SKILL.md', import.meta.url)
    const text = await readFile(skillUrl, 'utf8')
    return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim()
  } catch {
    return 'Office 与 PDF 文档安全解析与阅读指南'
  }
}

async function readJsonBody(req: any): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body) } catch {}
  }
  if (req.readableEnded || req.complete) return {}

  return new Promise((resolve, reject) => {
    let raw = ''
    let timer: any = null
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      req.off?.('data', onData)
      req.off?.('end', onEnd)
      req.off?.('error', onError)
    }
    const onData = (chunk: Buffer) => { raw += chunk.toString('utf8') }
    const onEnd = () => {
      cleanup()
      try { resolve(raw ? JSON.parse(raw) : {}) } catch (err) { reject(err) }
    }
    const onError = (err: any) => { cleanup(); reject(err) }

    req.on('data', onData)
    req.on('end', onEnd)
    req.on('error', onError)
    timer = setTimeout(() => { cleanup(); resolve({}) }, 2000)
  })
}

function writeJson(res: any, status: number, body: any): void {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
  })
  res.end(data)
}

export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  // 1. 注册专属 Skill
  try {
    const skillContent = await readSkillContent()
    ctx.effect(() => (ctx as any).skills?.register?.({
      name: 'office-reader',
      description: 'Inspect, read, and extract content from PDF, Excel (.xlsx, .xls, .csv), and Word (.docx) documents with token-safe chunking.',
      whenToUse: 'Use when reading, analyzing, or summarizing PDF, Excel, or Word documents.',
      source: 'bundled',
      content: skillContent,
    }))
  } catch {}

  // 2. 注册 AI 模型 Tools
  registerOfficeTools(ctx, config)

  // 3. 注册 WebServer 交互 API 端点
  registerApiRoutes(ctx, config)
}

function registerApiRoutes(ctx: Context, _config: Config): void {
  const webServer = (ctx as any).webServer
  if (!webServer?.register) return

  ctx.effect(() => webServer.register({
    kind: 'prefix',
    path: '/dsh-office-reader/api',
    handler: async (req: any, res: any) => {
      const url = new URL(req.url || '/', 'http://localhost')
      const pathname = url.pathname

      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        return res.end()
      }

      // 1. 透视元数据
      if (pathname === '/dsh-office-reader/api/inspect') {
        let filePath = url.searchParams.get('path')
        if (!filePath && req.method === 'POST') {
          const body = await readJsonBody(req)
          filePath = body.path
        }

        if (!filePath) {
          return writeJson(res, 400, { error: '缺少 path 参数' })
        }

        try {
          const meta = await inspectDocument(filePath)
          return writeJson(res, 200, meta)
        } catch (err: any) {
          return writeJson(res, 500, { error: err.message || String(err) })
        }
      }

      // 2. 解析提取正文
      if (pathname === '/dsh-office-reader/api/parse') {
        let filePath = url.searchParams.get('path')
        let options: any = {}

        if (req.method === 'POST') {
          const body = await readJsonBody(req)
          filePath = body.path || filePath
          options = body.options || {}
        }

        if (!filePath) {
          return writeJson(res, 400, { error: '缺少 path 参数' })
        }

        try {
          const result = await autoParseDocument(filePath, options)
          return writeJson(res, 200, result)
        } catch (err: any) {
          return writeJson(res, 500, { error: err.message || String(err) })
        }
      }

      writeJson(res, 404, { error: '接口未找到' })
    },
  }))
}
