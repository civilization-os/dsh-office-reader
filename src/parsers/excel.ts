import * as rawXLSX from 'xlsx'
import type { ExcelReadOptions, ExcelReadResult } from '../types.ts'

const XLSX: any = (rawXLSX as any).default || rawXLSX

export interface SheetSummary {
  name: string
  rowCount: number
  colCount: number
}

/**
 * 快速检查 Excel 文件并返回所有工作表信息
 */
export function inspectExcel(filePath: string): { sheets: SheetSummary[]; totalSheets: number } {
  const workbook = XLSX.readFile(filePath, { dense: true, cellDates: true })
  const sheets: SheetSummary[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet || !sheet['!ref']) {
      sheets.push({ name, rowCount: 0, colCount: 0 })
      continue
    }
    const range = XLSX.utils.decode_range(sheet['!ref'])
    const rowCount = range.e.r - range.s.r + 1
    const colCount = range.e.c - range.s.c + 1
    sheets.push({ name, rowCount, colCount })
  }

  return {
    sheets,
    totalSheets: sheets.length,
  }
}

/**
 * 读取并结构化提取指定工作表数据
 */
export function readExcelSheet(filePath: string, options: ExcelReadOptions = {}): ExcelReadResult {
  const workbook = XLSX.readFile(filePath, { dense: true, cellDates: true })
  const availableSheets = workbook.SheetNames

  const targetSheetName = options.sheet && availableSheets.includes(options.sheet)
    ? options.sheet
    : availableSheets[0]

  const sheet = workbook.Sheets[targetSheetName]
  if (!sheet || !sheet['!ref']) {
    return {
      filePath,
      sheetName: targetSheetName || 'None',
      availableSheets,
      totalRows: 0,
      totalCols: 0,
      content: '*(工作表为空)*',
      truncated: false,
    }
  }

  const range = XLSX.utils.decode_range(sheet['!ref'])
  const totalRows = range.e.r - range.s.r + 1
  const totalCols = range.e.c - range.s.c + 1

  const maxRows = options.maxRows || 100
  const maxCols = options.maxCols || 30
  let truncated = false

  // 将工作表转为二维数组
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  let slicedData = rawData
  if (slicedData.length > maxRows) {
    slicedData = slicedData.slice(0, maxRows)
    truncated = true
  }

  // 列截断
  slicedData = slicedData.map(row => {
    if (row.length > maxCols) {
      truncated = true
      return row.slice(0, maxCols)
    }
    return row
  })

  let outputContent = ''
  const format = options.format || 'markdown'

  if (format === 'markdown') {
    outputContent = convertArrayToMarkdownTable(slicedData)
  } else if (format === 'json') {
    const objectRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    const slicedObjects = objectRows.slice(0, maxRows)
    outputContent = JSON.stringify(slicedObjects, null, 2)
  } else {
    // csv
    outputContent = XLSX.utils.sheet_to_csv(sheet)
  }

  return {
    filePath,
    sheetName: targetSheetName,
    availableSheets,
    totalRows,
    totalCols,
    content: outputContent,
    truncated,
  }
}

/**
 * 将二维数组渲染为标准 GitHub 风格的 Markdown 表格
 */
function convertArrayToMarkdownTable(rows: any[][]): string {
  if (rows.length === 0) return '*(空数据表)*'

  // 第一行为表头
  const headers = rows[0].map(h => String(h || '').trim() || '-')
  const dataRows = rows.slice(1)

  const colWidths = headers.map(h => Math.max(3, h.length))
  for (const row of dataRows) {
    for (let c = 0; c < headers.length; c++) {
      const val = String(row[c] !== undefined ? row[c] : '').trim().replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
      colWidths[c] = Math.max(colWidths[c], Math.min(val.length, 40))
    }
  }

  const headerLine = '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |'
  const separatorLine = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |'

  const bodyLines = dataRows.map(row => {
    return '| ' + headers.map((_, i) => {
      const val = String(row[i] !== undefined ? row[i] : '').trim().replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
      return val.padEnd(colWidths[i])
    }).join(' | ') + ' |'
  })

  return [headerLine, separatorLine, ...bodyLines].join('\n')
}
