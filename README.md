# @civilization/dsh-office-reader

**DeepSeek Harness (DSH) 原生多格式文档透视与解析插件（PDF / Excel / Word）**

---

## 🌟 核心特性

- 🛡️ **Token 上下文安全防爆机制**：
  文档往往体量庞大（动辄上百页 PDF 研报或数万行 Excel），盲目读取容易消耗天价 Token 甚至超出上下文限制。本插件提供**两阶段渐进式阅读**，先透视结构大纲，再按需切片读取。
- 📑 **全格式覆盖（纯 JS 本地解析，零外部依赖）**：
  - **PDF (`.pdf`)**：提取元数据、大纲、支持按页码区间（如第 1-5 页）精准抽取。
  - **Excel (`.xlsx`, `.xls`, `.csv`, `.tsv`)**：透视所有工作表（Sheets），将数据清洗转换为对模型极其友好的标准 Markdown 表格或结构化 JSON，支持行列安全截断。
  - **Word (`.docx`)**：语义化解析为层级 Markdown，完整保留标题（`#`、`##`）、列表与数据表格，支持按二级标题定位抽取。
- 🤖 **专属 AI Agent Tools 与 Skill**：
  为模型赋予 5 大语义化工具（`doc_inspect`、`doc_read_pdf`、`doc_read_excel`、`doc_read_word`、`doc_parse_auto`），当用户在会话中提及任何文档或输入 `@document.pdf` 时，AI 自动调用专属工具精准分析。
- 🎨 **DSH 官方右侧栏看板**：
  右侧独立功能面板提供输入文档路径一键“透视结构”与“提取预览”，并实时估算 Token 消耗。

---

## 🧭 AI 模型专属工具集 (Tools)

| 工具名称 | 核心功能简介 |
| :--- | :--- |
| `doc_inspect` | **文档结构快速透视**：在读取大文档前先执行此工具，获取总页数、工作表清单、标题与估计 Token，防止盲目读取。 |
| `doc_read_pdf` | **分页按需读取 PDF**：支持指定页码范围（如 `startPage: 1, endPage: 5`）或特定离散页码（如 `[1, 3, 5]`），杜绝超长研报撑爆上下文。 |
| `doc_read_excel` | **Excel 表格转 Markdown**：指定工作表读取，自动转换为对齐良好的 Markdown 表格，内置默认 100 行安全截断。 |
| `doc_read_word` | **Word (.docx) 语义化提取**：将 Word 转化为标准 Markdown，支持按指定小节标题（如 `targetHeading: "项目背景"`）精准提取。 |
| `doc_parse_auto` | **万能一步提取入口**：自动根据后缀识别格式，适合中小文件（< 5 页 PDF 或小型表格）一步获取结构化文本与摘要。 |

---

## ⚙️ 配置项 (Settings)

本插件采用 `@deepseek-ai/schemastery` 标准，可在 DSH 官方设置面板中可视化配置：

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `maxPdfPagesPerRead` | `number` | `20` | 单次读取 PDF 的最大页数软上限 |
| `maxExcelRowsPerRead` | `number` | `100` | 单次读取 Excel 表格的默认最大行数截断 |
| `maxTextCharsLimit` | `number` | `40000` | 单次提取正文的最大字符数安全阈值（默认 40,000 字） |
| `enableFormatPreview` | `boolean` | `true` | 是否在右侧栏启用文档透视面板 |

---

## 🏗️ 构建与调试

```powershell
# 1. 安装依赖
pnpm install

# 2. 编译打包（双端产物：Node 宿主 + 浏览器侧边栏）
pnpm run build

# 3. 类型检查
pnpm run typecheck

# 4. 运行自动化测试
node tests/test-parsers.mjs
```
