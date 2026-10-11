import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { inspectDocument, autoParseDocument, readExcelSheet } from '../lib/index.js'

console.log('--- 1. 创建测试 Excel 文件 ---')
const wb = XLSX.utils.book_new()
const wsData = [
  ['产品名称', '季度销售额', '同比增长', '负责人'],
  ['DSH-核心引擎', 120500, '35.2%', 'DeepSeek'],
  ['DSH-Obsidian插件', 45000, '120.5%', '张三'],
  ['DSH-OfficeReader', 78900, '88.0%', '李四'],
]
const ws = XLSX.utils.aoa_to_sheet(wsData)
XLSX.utils.book_append_sheet(wb, ws, '销售业绩')

const testExcelPath = join(process.cwd(), 'test-sample.xlsx')
XLSX.writeFile(wb, testExcelPath)
console.log('已生成测试文件:', testExcelPath)

try {
  console.log('\n--- 2. 测试 doc_inspect 透视 ---')
  const meta = await inspectDocument(testExcelPath)
  console.log('透视结果:', JSON.stringify(meta, null, 2))

  console.log('\n--- 3. 测试 readExcelSheet 读取并转为 Markdown 表格 ---')
  const excelRes = readExcelSheet(testExcelPath, { format: 'markdown' })
  console.log('生成的 Markdown 表格:\n' + excelRes.content)

  console.log('\n--- 4. 测试 autoParseDocument 自动识别与读取 ---')
  const autoRes = await autoParseDocument(testExcelPath)
  console.log('自动识别格式:', autoRes.type)
  console.log('概要信息:', autoRes.summary)
  console.log('预估 Token:', autoRes.estimatedTokens)

  console.log('\n✅ 测试全部顺利通过！')
} finally {
  try { unlinkSync(testExcelPath) } catch {}
}
