import { useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['slots', 'sidebarRightTabs']
const TAB_ID = 'dsh-office-reader'
const TAB_KIND = 'sidebar-office-reader'

interface OfficialContext extends Context {
  slots: any
  sidebarRightTabs: any
}

export function apply(ctx: Context): void {
  const official = ctx as OfficialContext

  ctx.effect(() => official.sidebarRightTabs?.register?.({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: 'extension',
    title: () => '文档透视',
    guide: [{
      order: 215,
      title: () => '文档透视',
      description: () => 'PDF、Excel、Word 快速解析与 Token 安全透视',
      icon: OfficeIcon,
    }],
  }), 'dsh-office-reader: tab definition')

  ctx.effect(() => official.slots?.inject?.('sidebar.right.pane.tab', () => official.slots.register({
    name: 'sidebar.right.pane.tab',
    key: TAB_ID,
  }, OfficeReaderPanel)), 'dsh-office-reader: tab body')

  ctx.effect(() => official.slots?.inject?.('sidebar.right.pane.tab.title', () => official.slots.register({
    name: 'sidebar.right.pane.tab.title',
    key: TAB_ID,
  }, OfficeTabTitle)), 'dsh-office-reader: tab title')
}

function OfficeTabTitle(): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <OfficeIcon size={15} />
      <span>文档透视</span>
    </div>
  )
}

function OfficeReaderPanel({ sessionId, useSessions }: any): JSX.Element {
  const cwd = useSessions?.((sessions: any) => sessions?.byId?.[sessionId]?.cwd) as string | undefined
  const [filePath, setFilePath] = useState('')
  const [meta, setMeta] = useState<any>(null)
  const [parsed, setParsed] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleInspect = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!filePath.trim()) return
    setLoading(true)
    setError('')
    setMeta(null)
    setParsed(null)

    try {
      const res = await fetch('/dsh-office-reader/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '检查文件失败')
      setMeta(data)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleParse = async () => {
    if (!filePath.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/dsh-office-reader/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '解析失败')
      setParsed(data)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (parsed?.content) {
      navigator.clipboard?.writeText(parsed.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <OfficeIcon size={18} />
          <span>Office & PDF 文档透视</span>
        </div>
        <div style={styles.headerBadge}>安全防爆</div>
      </div>

      <form onSubmit={handleInspect} style={styles.inputGroup}>
        <input
          style={styles.input}
          placeholder="输入文件相对或绝对路径 (.pdf, .xlsx, .docx)..."
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
        />
        <button type="submit" style={styles.btnPrimary} disabled={loading || !filePath.trim()}>
          {loading ? '分析中...' : '透视'}
        </button>
      </form>

      {error && <div style={styles.errorBox}>❌ {error}</div>}

      {/* 元数据卡片 */}
      {meta && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span>📊 文档结构速览</span>
            <span style={styles.tagType}>{meta.type.toUpperCase()}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>文件名：</span>
            <span style={styles.metaValue}>{meta.fileName}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>大小：</span>
            <span style={styles.metaValue}>{(meta.fileSize / 1024).toFixed(1)} KB</span>
          </div>
          {meta.pageCount !== undefined && (
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>总页数：</span>
              <span style={styles.metaValue}>{meta.pageCount} 页</span>
            </div>
          )}
          {meta.sheets && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>工作表清单 ({meta.sheets.length})：</div>
              <div style={styles.sheetList}>
                {meta.sheets.map((s: any) => (
                  <span key={s.name} style={styles.sheetBadge}>
                    {s.name} ({s.rowCount}行 x {s.colCount}列)
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={styles.actionRow}>
            <button style={styles.btnSecondary} onClick={handleParse} disabled={loading}>
              ⚡ 转换为 Markdown 提取
            </button>
          </div>
        </div>
      )}

      {/* 解析内容展示 */}
      {parsed && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span>📝 提取结果预览</span>
            <button style={styles.btnCopy} onClick={handleCopy}>
              {copied ? '已复制！' : '复制正文'}
            </button>
          </div>
          <div style={styles.summaryText}>{parsed.summary}</div>
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>预估 Token：</span>
            <span style={styles.metaHighlight}>~{parsed.estimatedTokens} tokens</span>
          </div>
          <pre style={styles.previewBox}>{parsed.content}</pre>
        </div>
      )}

      {!meta && !parsed && (
        <div style={styles.helpBox}>
          <div style={styles.helpTitle}>💡 支持的格式与场景：</div>
          <ul style={styles.helpList}>
            <li>📄 <b>PDF</b>：分页按需读取，避免长篇论文撑爆上下文；</li>
            <li>📊 <b>Excel</b>：工作表自动转 Markdown 表格，支持行数截断；</li>
            <li>📝 <b>Word</b>：保留标题与段落语义转换为 Markdown。</li>
          </ul>
        </div>
      )}
    </div>
  )
}

function OfficeIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#3b82f6" />
      <polyline points="14 2 14 8 20 8" stroke="#60a5fa" />
      <line x1="16" y1="13" x2="8" y2="13" stroke="#93c5fd" />
      <line x1="16" y1="17" x2="8" y2="17" stroke="#93c5fd" />
      <polyline points="10 9 9 9 8 9" stroke="#93c5fd" />
    </svg>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: 'var(--text-normal, #e0e0e0)',
    fontSize: 13,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text-title, #ffffff)',
  },
  headerBadge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    fontWeight: 500,
  },
  inputGroup: {
    display: 'flex',
    gap: 6,
  },
  input: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    color: '#fff',
    fontSize: 12,
    outline: 'none',
  },
  btnPrimary: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    color: '#93c5fd',
    cursor: 'pointer',
    width: '100%',
  },
  btnCopy: {
    fontSize: 11,
    border: 'none',
    background: 'none',
    color: '#60a5fa',
    cursor: 'pointer',
    padding: 0,
  },
  card: {
    backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: 12,
    color: 'var(--text-muted, #aaa)',
  },
  tagType: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#93c5fd',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  metaLabel: {
    color: '#94a3b8',
  },
  metaValue: {
    color: '#e2e8f0',
    fontWeight: 500,
  },
  metaHighlight: {
    color: '#34d399',
    fontWeight: 600,
  },
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  sheetList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  sheetBadge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#cbd5e1',
  },
  actionRow: {
    marginTop: 6,
  },
  summaryText: {
    fontSize: 11,
    color: '#94a3b8',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '6px 8px',
    borderRadius: 4,
  },
  previewBox: {
    maxHeight: 260,
    overflowY: 'auto',
    fontSize: 11,
    lineHeight: 1.4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: '#e2e8f0',
    fontFamily: 'Consolas, monospace',
    margin: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '8px 10px',
    borderRadius: 6,
    fontSize: 11,
  },
  helpBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed var(--border-color, rgba(255, 255, 255, 0.08))',
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    color: 'var(--text-muted, #94a3b8)',
  },
  helpTitle: {
    fontWeight: 500,
    marginBottom: 6,
    color: '#e2e8f0',
  },
  helpList: {
    margin: 0,
    paddingLeft: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    lineHeight: 1.4,
  },
}
