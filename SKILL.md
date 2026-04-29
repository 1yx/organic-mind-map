# OrganicTree Agent Skill

> 本文件是 Agent CLI（Gemini CLI / Codex CLI / Claude Code 等）将长文本转换为 Organic Mind Map 的操作指令。
> Agent 应严格遵循本文件，输出合法的 `OrganicTree` JSON。

---

## 流程总览

```text
长文本
  → Agent CLI 读取本 SKILL.md
  → Agent 输出 OrganicTree JSON
  → omm preview <OrganicTree>
  → CLI 结构验证 + 质量验证 + 容量检查
  → 本地预览服务器 /api/document
  → 浏览器端布局与渲染（只读 SVG）
```

**职责边界：**

| 角色 | 负责内容 |
|------|----------|
| **Agent / LLM** | 阅读长文本，提炼语义结构，输出 `OrganicTree` JSON |
| **CLI** | 验证 `OrganicTree` 合法性 + 容量检查；启动本地预览服务器 |
| **浏览器** | 分配节点 ID、颜色、有机种子、布局坐标、`.omm` 导出、PNG 导出 |

Agent **只需关注语义结构**，不要生成任何视觉/布局字段。

---

## 输出格式

Agent 必须直接输出一个 **合法的 `OrganicTree` JSON 对象**，不要包裹在 Markdown 代码块之外的其他结构中。

### 最小合法示例

```json
{
  "version": 1,
  "title": "项目复盘",
  "center": {
    "concept": "项目复盘"
  },
  "branches": [
    {
      "concept": "目标",
      "children": [
        { "concept": "用户增长" },
        {
          "concept": "收入验证",
          "children": [
            { "concept": "毛利润" },
            { "concept": "ROI" }
          ]
        }
      ]
    }
  ]
}
```

---

## 结构说明

```
OrganicTree
  ├── version: 1
  ├── title: string
  ├── center: OrganicTreeCenter
  │     ├── concept: string          ← 中心主题（必填）
  │     ├── visualHint?: string      ← 中心视觉提示（可选）
  │     └── svgUrl?: string          ← 中心 SVG 图标 URL（可选，仅限白名单域名）
  ├── branches: OrganicMainBranch[]  ← 主分支数组（必填）
  │     ├── concept: string
  │     ├── children?: OrganicSubBranch[]
  │     ├── visualHint?: string
  │     └── colorHint?: string
  └── meta?: { sourceTitle?: string; sourceSummary?: string }
```

**层级限制（最大 3 层）：**

```
OrganicMainBranch          ← 第 1 层（主分支）
  └── OrganicSubBranch     ← 第 2 层（子分支）
        └── OrganicLeafNode ← 第 3 层（叶节点，不可再嵌套）
```

---

## 约束规则

### 概念单元规则

- **每个分支携带一个认知概念单元**，不是完整句子或段落。
- 英文关键词默认使用**大写**（如 `ROI`、`KPI`、`API`）。
- 概念文本应简洁精炼，优先使用 2-6 个字/词。

### 概念宽度限制

- **最大 25 单位宽度**。
- CJK 字符（中日韩）每个计为 **2 单位**，ASCII 字符每个计为 **1 单位**。
- 示例：`"项目复盘"` = 4 × 2 = **8 单位**（合法）；`"用户增长与留存分析"` = 8 × 2 = **16 单位**（合法）。

### 容量限制

| 约束 | 值 |
|------|------|
| 最大主分支数 | **8** |
| 最大总节点数 | **45**（含中心节点） |
| 最大层级深度 | **3** |
| 单节点最大子节点数 | **8** |

### 语义保真

- 必须忠实还原原文的核心语义结构和层级关系。
- 合并高度相似的概念，避免冗余节点。
- 不遗漏原文的主要主题维度。

---

## 可选字段

| 字段 | 位置 | 说明 |
|------|------|------|
| `center.visualHint` | center | 中心视觉提示文本 |
| `center.svgUrl` | center | 中心 SVG 图标 URL（**仅限白名单 HTTPS 域名**） |
| `meta.sourceTitle` | root | 原文标题 |
| `meta.sourceSummary` | root | 原文摘要 |
| `visualHint` | branch | 分支视觉提示 |
| `colorHint` | main branch | 主分支颜色提示 |

### center.svgUrl 白名单域名

仅允许以下 HTTPS 域名：

- `api.iconify.design`
- `api.simplesvg.com`
- `cdn.jsdelivr.net`

URL 必须以 `https://` 开头且指向上述域名之一。非白名单 URL 将被浏览器端过滤，中心视觉将回退为默认内置图标。

---

## 🚫 禁止输出以下字段

Agent 输出中**不得包含**以下内容：

| 禁止项 | 说明 |
|--------|------|
| 布局坐标 | `x`、`y`、`width`、`height`、`position` 等任何空间定位字段 |
| 节点 ID | `id`、`nodeId`、`uuid` 等任何标识符字段 |
| 颜色值 | `color`、`fill`、`stroke`、`backgroundColor` 等颜色字段（`colorHint` 除外） |
| 有机种子 | `seed`、`organicSeed` 等随机种子字段 |
| 纸张尺寸 | `paper`、`paperSize`、`pageSize` 等纸张规格字段 |
| PreviewPayload | 不得将 OrganicTree 包裹在 `PreviewPayload` 结构中 |
| OmmDocument | 不得输出 `.omm` 文档格式（那是浏览器导出产物） |
| 导出数据 | 不得包含 PNG、SVG 导出数据或 base64 编码内容 |

> **原则**：Agent 只负责语义结构，所有视觉计算和渲染工作由浏览器完成。

---

## 反思循环（Reflection Loop）

当 CLI 验证失败时，Agent 应根据错误信息修正 `OrganicTree` 并重新生成。

### 错误反馈格式

CLI 验证失败时，输出 JSON 格式的错误信息，每个错误包含：

```json
{
  "path": "branches[2].children[1].concept",
  "message": "Concept exceeds 25 unit-width; current: 28, limit: 25",
  "suggestion": "Truncate to: '数据分析与可视化'"
}
```

### 退出码含义

| 退出码 | 含义 | Agent 应对策略 |
|--------|------|---------------|
| **1** | 结构/质量错误 | 定位 `path` 指示的具体字段，修正类型、必填项或格式 |
| **2** | 容量超限 | 减少分支数量、缩短概念文本、合并相似节点 |

### 修正步骤

1. **解析错误**：读取 CLI 输出的 JSON 错误数组。
2. **定位路径**：根据 `path` 字段找到需要修正的具体位置。
3. **应用建议**：优先采用 `suggestion` 字段中的修正建议。
4. **重新生成**：仅修改错误位置的内容，保持其他合法部分不变。
5. **重新提交**：将修正后的 `OrganicTree` 再次提交给 CLI 验证。

### 常见错误与修正

| 错误 | 修正方法 |
|------|----------|
| `concept exceeds 25 unit-width` | 缩短概念文本，参考 suggestion 中的截断建议 |
| `branches must not be empty` | 确保至少有 1 个主分支 |
| `Nesting exceeds maximum depth of 3` | 将第 4 层节点提升到第 3 层或合并到父节点 |
| `Total nodes exceed 45` | 删除低优先级节点或合并相似概念 |
| `Main branches exceed 8` | 合并语义相近的主分支 |
| `version must be 1` | 确保 `version` 字段值为 `1` |
| `concept must be a non-empty string` | 确保所有 `concept` 字段为非空字符串 |

---

## 完整示例

```json
{
  "version": 1,
  "title": "Q4 产品战略",
  "center": {
    "concept": "Q4 产品战略"
  },
  "meta": {
    "sourceTitle": "第四季度产品规划会议纪要",
    "sourceSummary": "讨论 Q4 产品路线图、资源分配和关键里程碑"
  },
  "branches": [
    {
      "concept": "用户增长",
      "children": [
        { "concept": "获客渠道" },
        { "concept": "留存策略" },
        { "concept": "NPS 提升" }
      ]
    },
    {
      "concept": "技术架构",
      "children": [
        { "concept": "微服务拆分" },
        {
          "concept": "性能优化",
          "children": [
            { "concept": "CDN 加速" },
            { "concept": "缓存策略" }
          ]
        }
      ]
    },
    {
      "concept": "商业化",
      "children": [
        { "concept": "定价模型" },
        { "concept": "ENTERPRISE" }
      ]
    }
  ]
}
```
