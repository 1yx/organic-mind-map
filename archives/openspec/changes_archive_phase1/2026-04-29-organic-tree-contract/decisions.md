# 开放性问题 (OrganicTree Contract 设计)

本文件记录从 `@openspec/changes/agent-list-contract/**` 的提案与设计审查中发现的架构设计缺陷、风险及待决策点。

---

## 1. 质量校验 (Quality Validation) 失败是警告还是打回重试？[已决策]

### 发现的问题
在 `design.md` 的 Validation Layers 中提到：“Quality validation can be reported as warnings unless the input cannot produce a coherent document”。但是在处理“句子状”的过长节点时，它又说“Sentence-like concept -> THEN validation returns a concept quality error”。

### 苏格拉底式问题
* 如果 CLI 将“句子太长”视为 Warning（仅仅打印在终端），那么这些超长文本依然会被送进 Web 前端渲染，进而因为物理边界限制被“暴力截断”成省略号，这是否违背了我们在上一阶段决策的“防线前置，在 CLI 层拒绝不合规长文”的初衷？
* 如果 CLI 将其视为 Error 并强制打回给 Agent 重试，如果大模型对某个专业概念无法用极短的词语概括，是否会导致 Agent 陷入无限重试的死循环？
* 对于“结构性超载（节点太多）”和“语义性超载（单个节点字数过多）”，我们的拒绝策略是否应该有所区分？

### 决策记录
* **决策结果**: 明确将“句子状”的过长概念节点作为 **Error** 处理，强制打回给 Agent 重试。但在大模型的 Prompt 契约和 CLI 的字数校验逻辑上做妥协：**要求大模型以“语义单元（Semantic Unit）”为粒度进行压缩，不再死板地强制限制在“中文5个字/英文3个词”以内。**
* **决策理由**: 强硬的极短字数限制容易导致复杂的专业概念（如“大模型提示词工程”）被过度截断而丧失原意，进而导致 Agent 陷入反复重试的死循环。放宽字数限制，以“单一的语义概念/复合词组”为核心校验标准，既能防止出现“因为...所以...”这类真正的冗长解释性句子（此时抛出 Error 打回重试），又能兼顾实际业务中专业词汇表达的完整性。前端 SVG 渲染时，如果有较长但仍然是单个概念的词语，可以通过多行换行或者适度的字体缩放来优雅消化，而非一律暴力裁切。
* **后续修改文档**: 更新 `02-agent-list-contract` 下的 `design.md` 和 `spec.md`：移除极其严苛的字符/单词数量硬编码限制，将重点放在“拒绝完整的解释性句子（Sentence-like clauses）”上。明确任何违背“语义单元”规则的输入都会产生 Error 而非 Warning。

---

## 2. 大模型输出 `rawInput` 导致 Token 成本翻倍的风险 [已决策]

### 发现的问题
`design.md` 和 `spec.md` 中都提到，“The contract preserves raw text where needed” 并且 `AgentBranch` 结构里包含了 `rawInput` 字段。这意味着这是给 Agent 生成的契约。

### 苏格拉底式问题
* 在“长文本自动总结”这个 MVP 场景中，输入的长文本已经非常庞大。如果我们要求大模型在输出浓缩后的 `concept` 的同时，还要把对应的原始原句再复述一遍写进 `rawInput` 字段，这是否会导致模型输出的 Token 数量翻倍、生成速度极速降低，甚至容易触发大模型的 `max_tokens` 截断？
* `rawInput` 是否应该在 Prompt 契约中对 LLM 设定为“无需生成（Omit）”，而仅仅在未来由用户手动输入时才由系统本身保留？

### 决策记录
* **决策结果**: MVP 阶段的 Agent Skill 契约中**不需要**大模型输出 `rawInput`，直接在数据结构和 Prompt 要求中将其移除或标记为非必要（Omit）。
* **决策理由**: 长文本总结场景下，原样复述 `rawInput` 会带来极大的输出 Token 开销，不仅导致生成极其缓慢，增加 API 成本，还会极大地增加大模型截断（Max Tokens）的风险。既然核心价值是生成高度凝练的博赞导图，在目前纯生成的 MVP 阶段，没有交互式“撤销总结/查看原文”的强诉求。
* **后续修改文档**: 在 `@openspec/changes/agent-list-contract` 中的 `design.md`、`proposal.md`、`spec.md` 和 `tasks.md` 中，移除对 `rawInput` 的强制或推荐要求，将其从大模型输出的 JSON Schema 中剥离。

---

## 3. JSON 递归嵌套生成的稳定性 (Recursive JSON Generation Risk) [已决策]

### 发现的问题
`AgentMindMapList` 契约定义了一个完全递归的树状结构（`children?: AgentBranch[]`）。

### 苏格拉底式问题
* 目前主流的 Agent CLI 和底层 LLM API（如 OpenAI, Gemini 的 Function Calling）对于未知层级的深层递归 JSON Schema 支持通常存在盲区或幻觉。如果模型生成了极深的嵌套导致 JSON 结构损坏或意外截断，CLI 该如何自处？
* 我们是否应该在提供给大模型的 OpenAPI Schema / Prompt 中，物理上写死一个具体的嵌套层级上限（例如只允许展开到三级结构：`MainBranch -> SubBranch -> LeafBranch`），而不是给出一个无限递归的 TypeScript 类型定义？

### 决策记录
* **决策结果**: 为了保证大模型生成的稳定性和 JSON 的结构完整性，在发给大模型的 JSON Schema 以及 Prompt 契约中，**强制物理限制最大嵌套层级为 3 层结构**（例如：`MainBranch -> SubBranch -> LeafBranch`）。
* **决策理由**: 主流大模型的 Structured Output (Function Calling) 对深层且未限定最大深度的递归类型（Recursive Types）支持非常脆弱，极易导致大面积的幻觉、死循环或提前截断从而使得 JSON 解析失败。将数据结构扁平化或硬性限制在 3 层内，不仅大大降低了模型输出损坏的概率，而且完全符合“在一张 A3/A4 纸上”进行核心概念可视化的视觉承载极限（超过三层在单张横向纸张上往往已经无法阅读和排布）。
* **后续修改文档**: 更新 `02-agent-list-contract` 中的数据结构定义。不要在给 Agent 的定义里使用无穷递归的 `children?: AgentBranch[]`，而是明确地拆分为例如 `MainBranch`、`SubBranch`、`LeafNode` 这样有着硬性层级深度的静态类型组合。

---

## 4. 中英文字汇长度阈值的自动判定机制 [已决策]

### 发现的问题
产品法则要求：“中文优先收敛到 5 个汉字以内，英文优先收敛到 3 个单词以内”。在契约的 `meta` 里面有一个可选的 `language` 字段。

### 苏格拉底式问题
* 在 CLI 的“容量检查（Threshold Check）”防线中，CLI 是通过检测 LLM 自己填写的 `meta.language` 来决定用哪一套校验规则，还是 CLI 会自动通过正则表达式去探测字符串中的中文字符比例？
* 如果大模型生成了一个混合词（比如：“AI 驱动的 CLI 架构”），这个混合词的长度应该采用哪种规则计算？
* 如果大模型没有返回 `language` 字段，CLI 的校验器会 fallback 到哪种最安全的策略？

### 决策记录
* **决策结果**: 采用基于“单位宽度（Unit Width）”的统一计算法。每个英文字母或半角符号算作 **1 个单位宽度**，每个汉字或全角字符算作 **2 个单位宽度**。只需保证单个概念节点的**总宽度在 25 个单位以下**即可。
* **决策理由**: 这种算法完美解决了“中英夹杂复合词”的长短判定难题。比起依赖不可靠的 `language` 字段或复杂的正则表达式，这种基于东亚宽字符（East Asian Width）的计算法非常轻量且直观，也能在物理层面（SVG 渲染的横向占用空间）给出更准确的字宽预估。只要总宽度不超过 25，就能保证词汇既有充足的表达空间（最多约 12 个汉字或 25 个英文字母），又不会因为过长而在最终的博赞导图上破坏“线字等长”与留白的排版美感。
* **后续修改文档**: 在 `02-agent-list-contract` 的设计文档中，移除根据 `meta.language` 进行长短校验的设计，改为引入“单位宽度（汉字=2，英文=1，总宽度阈值 <= 25）”的统一验证器逻辑。