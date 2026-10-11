import { useState, useEffect } from 'react'
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

  // 注册右侧栏“文档透视”标签页
  ctx.effect(() => official.sidebarRightTabs?.register?.({
    id: TAB_ID,
    kind: TAB_KIND,
    priority: 'extension',
    title: () => '文档透视',
    guide: [{
      order: 215,
      title: () => '文档透视',
      description: () => 'PDF、Excel、Word 智能解析与 Token 安全透视',
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

  // 设置中心卡片
  ctx.effect(() => official.slots?.inject?.('settings.plugins.card', () => official.slots.register({
    name: 'settings.plugins.card',
    key: TAB_ID,
  }, OfficeReaderSettingsCard)), 'dsh-office-reader: settings card')
}

function OfficeTabTitle(): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <OfficeIcon size={14} />
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
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

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
      showToast('已复制 Markdown 内容！')
    }
  }

  const handleInsertToChat = () => {
    if (parsed?.content) {
      const ok = insertTextToComposer(`\n\`\`\`markdown\n# 文档内容 (${meta?.fileName || 'Office Document'})\n${parsed.content.slice(0, 3000)}\n\`\`\`\n`)
      showToast(ok ? '已填入当前对话输入框！' : '无法自动填入，已复制')
      if (!ok) navigator.clipboard?.writeText(parsed.content)
    }
  }

  return (
    <div className="dsh-office-root">
      <GlobalOfficeReaderStyle />

      {toast && (
        <div className="dsh-office-toast">{toast}</div>
      )}

      {/* 顶部标题栏 */}
      <header className="dsh-office-header">
        <div className="dsh-office-header-info">
          <div className="dsh-office-title-line">
            <OfficeIcon size={16} />
            <span className="dsh-office-title">Office & PDF 文档透视</span>
            <span className="dsh-office-badge-safe">Token 防爆保护</span>
          </div>
          <div className="dsh-office-sub-path" title={cwd}>
            {cwd ? `工作目录: ${cwd}` : '支持输入工作区相对路径或绝对路径'}
          </div>
        </div>
      </header>

      {/* 路径输入与解析操作 */}
      <section className="dsh-office-card">
        <form onSubmit={handleInspect} className="dsh-office-form">
          <div className="dsh-office-input-row">
            <input
              className="dsh-office-input"
              placeholder="输入文档相对或绝对路径 (.pdf, .xlsx, .docx)..."
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="dsh-office-btn-primary"
              disabled={loading || !filePath.trim()}
            >
              {loading ? '分析中...' : '透视'}
            </button>
          </div>
        </form>

        {error && (
          <div className="dsh-office-error-box">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* 元数据卡片 */}
      {meta && (
        <section className="dsh-office-card">
          <div className="dsh-office-card-header">
            <div className="dsh-office-card-title">
              <span>📊</span>
              <span>文档结构速览</span>
            </div>
            <span className="dsh-office-type-tag">{meta.type.toUpperCase()}</span>
          </div>

          <div className="dsh-office-meta-grid">
            <div className="dsh-office-meta-item">
              <span className="dsh-office-meta-k">文件名</span>
              <span className="dsh-office-meta-v" title={meta.fileName}>{meta.fileName}</span>
            </div>
            <div className="dsh-office-meta-item">
              <span className="dsh-office-meta-k">文件大小</span>
              <span className="dsh-office-meta-v">{(meta.fileSize / 1024).toFixed(1)} KB</span>
            </div>
            {meta.pageCount !== undefined && (
              <div className="dsh-office-meta-item">
                <span className="dsh-office-meta-k">总页数</span>
                <span className="dsh-office-meta-v">{meta.pageCount} 页</span>
              </div>
            )}
          </div>

          {meta.sheets && (
            <div className="dsh-office-section-block">
              <div className="dsh-office-section-title">工作表清单 ({meta.sheets.length})</div>
              <div className="dsh-office-sheet-list">
                {meta.sheets.map((s: any) => (
                  <span key={s.name} className="dsh-office-sheet-pill">
                    {s.name} ({s.rowCount}行 × {s.colCount}列)
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="dsh-office-action-row">
            <button
              type="button"
              className="dsh-office-btn-action"
              onClick={handleParse}
              disabled={loading}
            >
              ⚡ 转换为 Markdown 并估算 Token
            </button>
          </div>
        </section>
      )}

      {/* 解析内容展示 */}
      {parsed && (
        <section className="dsh-office-card">
          <div className="dsh-office-card-header">
            <div className="dsh-office-card-title">
              <span>📝</span>
              <span>提取结果预览</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="dsh-office-btn-mini"
                onClick={handleCopy}
              >
                复制正文
              </button>
              <button
                type="button"
                className="dsh-office-btn-mini is-primary"
                onClick={handleInsertToChat}
                title="插入 Markdown 到当前对话"
              >
                插入对话 ↵
              </button>
            </div>
          </div>

          <div className="dsh-office-summary-box">{parsed.summary}</div>

          <div className="dsh-office-meta-row">
            <span className="dsh-office-meta-k">预估 Token 消耗</span>
            <span className="dsh-office-meta-tokens">~{parsed.estimatedTokens} tokens</span>
          </div>

          <pre className="dsh-office-preview-box">{parsed.content}</pre>
        </section>
      )}

      {/* 空状态引导 */}
      {!meta && !parsed && (
        <section className="dsh-office-card-muted">
          <div className="dsh-office-help-title">💡 支持的格式与防护场景</div>
          <ul className="dsh-office-help-list">
            <li>📄 <b>PDF 格式</b>：智能提取目录与按页解析，防长文档撑爆 Context；</li>
            <li>📊 <b>Excel 表格</b>：多 Sheet 自动转换为表格 Markdown，可配置行级截断；</li>
            <li>📝 <b>Word 文档</b>：精准保留各级大纲标题、表格与正文层级结构。</li>
          </ul>
        </section>
      )}
    </div>
  )
}

function OfficeReaderSettingsCard(): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div className={`dsh-office-settings-card ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="dsh-office-settings-header"
        onClick={() => setOpen(!open)}
      >
        <div className="dsh-office-settings-head-left">
          <div className="dsh-office-settings-title-row">
            <OfficeIcon size={16} />
            <span className="dsh-office-settings-title">Office & PDF 文档透视</span>
            <span className="dsh-office-badge-version">v0.1.0</span>
          </div>
          <div className="dsh-office-settings-desc">
            PDF/Excel/Word 本地安全预览、大文档 Token 防爆截断与结构化解析工具。
          </div>
        </div>
        <span className={`dsh-office-chevron ${open ? 'is-open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="dsh-office-settings-body">
          <div className="dsh-office-settings-row">
            <div className="dsh-office-row-text">
              <div className="dsh-office-row-label">Token 防爆截断上限</div>
              <div className="dsh-office-row-hint">
                针对大文档默认启用 Token 预警与智能截断（默认 20,000 tokens），避免上下文超载。
              </div>
            </div>
            <div className="dsh-office-row-ctrl">
              <span className="dsh-office-tag-status">已启用</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function insertTextToComposer(text: string): boolean {
  if (typeof document === 'undefined') return false

  const candidates = [
    document.querySelector<HTMLElement>('[data-composer-input="true"]'),
    document.querySelector<HTMLElement>('[data-composer-input]'),
    document.querySelector<HTMLElement>('[data-composer-card] [contenteditable="true"]'),
    document.querySelector<HTMLElement>('[contenteditable="true"][role="textbox"]'),
    document.querySelector<HTMLTextAreaElement>('textarea:not([readonly])'),
  ].filter(Boolean) as HTMLElement[]

  const target = candidates[0]
  if (!target) return false

  target.focus()

  if (target.getAttribute('contenteditable') === 'true' || target.isContentEditable) {
    let success = false
    try {
      success = document.execCommand('insertText', false, text)
    } catch {}
    if (!success) {
      try {
        const evt = new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text,
        })
        target.dispatchEvent(evt)
        success = true
      } catch {}
    }
    return success
  }

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart ?? target.value.length
    const end = target.selectionEnd ?? target.value.length
    const prev = target.value
    let success = false
    try {
      target.selectionStart = start
      target.selectionEnd = end
      success = document.execCommand('insertText', false, text)
    } catch {}

    if (!success) {
      const next = prev.slice(0, start) + text + prev.slice(end)
      target.value = next
      target.selectionStart = target.selectionEnd = start + text.length
      target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
      target.dispatchEvent(new Event('change', { bubbles: true }))
      success = true
    }
    return success
  }

  return false
}

function OfficeIcon({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#0284c7" stroke="#0369a1" fillOpacity="0.15" />
      <polyline points="14 2 14 8 20 8" stroke="#0284c7" />
      <line x1="16" y1="13" x2="8" y2="13" stroke="#0284c7" strokeLinecap="round" />
      <line x1="16" y1="17" x2="8" y2="17" stroke="#0284c7" strokeLinecap="round" />
      <line x1="10" y1="9" x2="8" y2="9" stroke="#0284c7" strokeLinecap="round" />
    </svg>
  )
}

function GlobalOfficeReaderStyle(): JSX.Element {
  return (
    <style>{`
/* 基础根容器 */
.dsh-office-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-label-primary, #17233c);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.4;
  overflow-y: auto;
  position: relative;
  padding: 12px;
  gap: 12px;
}

/* 顶部标题栏 */
.dsh-office-header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--dsw-alias-bg-layer-2, rgba(100, 120, 150, 0.04));
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.16));
  border-radius: 10px;
}
.dsh-office-header-info {
  flex: 1;
  min-width: 0;
}
.dsh-office-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dsh-office-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-office-badge-safe {
  font-size: 10px;
  font-weight: 500;
  color: #0284c7;
  background: rgba(2, 132, 199, 0.1);
  padding: 1px 6px;
  border-radius: 99px;
  border: 1px solid rgba(2, 132, 199, 0.2);
}
.dsh-office-sub-path {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

/* 卡片 */
.dsh-office-card {
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.16));
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  box-sizing: border-box;
}
.dsh-office-card-muted {
  background: var(--dsw-alias-bg-layer-2, rgba(100, 120, 150, 0.02));
  border: 1px dashed var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.18));
  border-radius: 10px;
  padding: 14px;
}

.dsh-office-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dsh-office-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-office-type-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(2, 132, 199, 0.12);
  color: #0284c7;
  border: 1px solid rgba(2, 132, 199, 0.25);
}

/* 表单输入与按钮 */
.dsh-office-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsh-office-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.dsh-office-input {
  box-sizing: border-box;
  flex: 1;
  padding: 7px 10px;
  font-size: 12px;
  line-height: 1.4;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(118, 137, 166, 0.28));
  background: var(--dsw-alias-bg-layer-3, #ffffff);
  color: var(--dsw-alias-label-primary, inherit);
  outline: none;
  transition: all 0.15s ease;
}
.dsh-office-input::placeholder {
  color: var(--dsw-alias-label-tertiary, #9aa5b5);
}
.dsh-office-input:focus {
  border-color: var(--dsw-alias-brand-primary, #4b70e2);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary, #4b70e2) 18%, transparent);
}

.dsh-office-btn-primary {
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 550;
  border-radius: 7px;
  border: none;
  background: var(--dsw-alias-brand-primary, #4b70e2);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.dsh-office-btn-primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-0.5px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
}
.dsh-office-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dsh-office-btn-action {
  width: 100%;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #4b70e2) 40%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4b70e2) 8%, transparent);
  color: var(--dsw-alias-brand-primary, #4b70e2);
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-office-btn-action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4b70e2) 15%, transparent);
}

.dsh-office-btn-mini {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.2));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6f7f9b);
  cursor: pointer;
  transition: all 0.12s ease;
}
.dsh-office-btn-mini:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(100, 120, 150, 0.1));
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-office-btn-mini.is-primary {
  color: var(--dsw-alias-brand-primary, #4b70e2);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4b70e2) 30%, transparent);
}

/* 元数据网格 */
.dsh-office-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.dsh-office-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(100, 120, 150, 0.04));
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.1));
}
.dsh-office-meta-k {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
}
.dsh-office-meta-v {
  font-size: 12px;
  font-weight: 550;
  color: var(--dsw-alias-label-primary, inherit);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-office-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
}
.dsh-office-meta-tokens {
  color: #10b981;
  font-weight: 600;
}

/* Sheet 清单 */
.dsh-office-section-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dsh-office-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #6f7f9b);
}
.dsh-office-sheet-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.dsh-office-sheet-pill {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--dsw-alias-interactive-bg-hover, rgba(100, 120, 150, 0.06));
  color: var(--dsw-alias-label-secondary, #6f7f9b);
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.12));
}

.dsh-office-summary-box {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary, #6f7f9b);
  background: var(--dsw-alias-interactive-bg-hover, rgba(100, 120, 150, 0.05));
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.12));
  padding: 6px 10px;
  border-radius: 6px;
}

/* 代码与正文预览 */
.dsh-office-preview-box {
  max-height: 260px;
  overflow-y: auto;
  font-size: 11.5px;
  line-height: 1.5;
  background: var(--dsw-alias-interactive-bg-hover, rgba(100, 120, 150, 0.06));
  border: 1px solid var(--dsw-alias-border-l1, rgba(118, 137, 166, 0.15));
  color: var(--dsw-alias-label-primary, inherit);
  padding: 10px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: Consolas, Monaco, "Courier New", monospace;
  margin: 0;
}

.dsh-office-error-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11.5px;
}

/* 帮助提示 */
.dsh-office-help-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #6f7f9b);
  margin-bottom: 6px;
}
.dsh-office-help-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
  line-height: 1.5;
}

/* 吐司通知 */
.dsh-office-toast {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--dsw-alias-label-primary, #1f2328);
  color: var(--dsw-alias-bg-base, #ffffff);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 999;
  pointer-events: none;
  animation: fadeIn 0.15s ease-out;
}

/* 设置卡片样式 */
.dsh-office-settings-card {
  border: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  background: var(--dsw-alias-bg-layer-3, #ffffff);
  border-radius: 12px;
  transition: border-color .16s, background .16s;
  box-sizing: border-box;
}
.dsh-office-settings-card.is-open {
  background: var(--dsw-alias-bg-layer-2, #f7f8fa);
  border-color: var(--dsw-alias-label-dimmed, #c8ccd4);
}
.dsh-office-settings-header {
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  border-radius: 12px;
}
.dsh-office-settings-head-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}
.dsh-office-settings-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-office-badge-version {
  font-size: 11px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
}
.dsh-office-settings-desc {
  font-size: 12.5px;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
}
.dsh-office-chevron {
  font-size: 14px;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
  transition: transform .16s ease;
}
.dsh-office-chevron.is-open {
  transform: rotate(180deg);
}
.dsh-office-settings-body {
  border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb);
  margin: 0 16px;
  padding: 8px 0 12px;
}
.dsh-office-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
}
.dsh-office-row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dsh-office-row-label {
  font-size: 13px;
  font-weight: 550;
  color: var(--dsw-alias-label-primary, inherit);
}
.dsh-office-row-hint {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary, #8c9ba5);
}
.dsh-office-tag-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
  font-weight: 500;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
    `}</style>
  )
}
