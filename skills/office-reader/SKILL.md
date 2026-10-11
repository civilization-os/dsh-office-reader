---
name: office-reader
description: "Inspect, read, and extract content from PDF, Excel (.xlsx, .xls, .csv), and Word (.docx) documents with token-safe chunking and markdown formatting."
whenToUse: "Use whenever reading, analyzing, or summarizing PDF, Excel spreadsheets, or Word documents in the workspace or file system."
source: bundled
---

# 📑 Office 与 PDF 文档安全解析与阅读指南

本 Skill 指导你如何在 DeepSeek Harness (DSH) 中高效、安全地解析非纯文本格式的复杂文档（PDF、Excel、Word）。

---

## ⚠️ 关键原则：切忌盲目读取大文档（Token 保护）

普通的文本文件只有几千字符，但一份 PDF 研报可能长达数百页，一份 Excel 可能有数万行。
**严禁在不了解文件规模的情况下一次性尝试全部读取！**

### 最佳阅读工作流（两阶段原则）：

1. **第一阶段：先透视结构 (`doc_inspect`)**
   - 快速获取文档类型、总页数、章节标题、Excel 工作表清单与行数。
   - 评估文档体量与结构。

2. **第二阶段：按需精准切片抽取**
   - **对于 PDF (`doc_read_pdf`)**：根据用户问题或目录大纲，指定页码范围（如 `startPage: 1, endPage: 5`）。
   - **对于 Excel (`doc_read_excel`)**：指定目标工作表（`sheet: "利润表"`），优先输出 Markdown 表格，并利用 `maxRows` 限制行数。
   - **对于 Word (`doc_read_word`)**：可根据目录大纲指定小节标题（`targetHeading: "核心方案"`）按需读取。

3. **对于明确的小文件（< 5 页 PDF 或小型表格）**：
   - 可以直接调用 `doc_parse_auto` 一步到位获取完整内容。

---

## 🛠️ 可用工具清单

- **`doc_inspect`**：快速透视元数据（页数、工作表、标题、估计 Token）。
- **`doc_read_pdf`**：分页提取 PDF 正文。
- **`doc_read_excel`**：提取 Excel 工作表为 Markdown 表格、JSON 或 CSV。
- **`doc_read_word`**：解析 Word (.docx) 为结构化 Markdown。
- **`doc_parse_auto`**：一键智能提取中小型文档。
