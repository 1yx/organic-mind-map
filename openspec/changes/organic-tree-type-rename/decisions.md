# 开放性问题 (OrganicTree Type Rename 设计)

本文件记录对 `@openspec/changes/organic-tree-type-rename/**` 提案与设计进行审查后发现的术语冲突、类型一致性及命名债务问题。

---

## 1. `ConciseListJSON` 的定义及其与 `OrganicTree` 的关系 [已决策]

### 发现的问题
`design.md` 引入了 `ConciseListJSON -> OrganicTree` 的转换链路，但未明确该 JSON 的具体形态。

### 决策记录
* **决策结果**: 在当前 rename 变更中**忽略** `ConciseListJSON` 的具体细节。
* **决策理由**: `ConciseListJSON` 的具体定义（例如其是否为纯 Markdown 或极简数组）将在下一个专门的 change 中进行讨论和定义。当前阶段只需专注于将现有的语义模型重命名为 `OrganicTree`，以清空术语债务。

---

## 2. `OrganicLeafNode` 的类型一致性与扩展性 [已决策]

### 发现的问题
目前的 TypeScript 定义中，叶子节点（LeafNode）被设计为没有 `children` 字段的封闭结构，以强制执行“最大 3 层”的限制。

### 决策记录
* **决策结果**: 修改 `OrganicLeafNode` 的 TypeScript 定义，使其**必须包含 `children` 字段**（可选）。
* **决策理由**: 为了保持树状结构在类型系统上的递归一致性，叶子节点不应在物理结构上与其他分支节点发生断裂。即便在 MVP 阶段我们通过校验器严格限制深度为 3 层，但在类型定义层面保留 `children` 字段（哪怕为空）能为未来的深度扩展提供更好的向前兼容性，避免在未来增加第 4 层时需要进行大规模的类型重构。

---

## 3. 函数名与实体目录的物理大清洗 [已决策]

### 发现的问题
`design.md` 原本建议在本次 rename 中保持 `validateAgentList` 等函数名不变。

### 决策记录
* **决策结果**: 坚决执行“名实相副”的原则，本次变更不仅重命名 TypeScript 类型，还必须**同步完成函数名与物理目录的更名**。
* **具体要求**:
    1. **函数更名**: 代码中的 `validateAgentList` 必须同步修正为 `validateOrganicTree`。
    2. **物理目录迁移**: 将硬盘上的真实目录 `fixtures/agent-list/` 物理重命名为 `fixtures/organic-tree/`。
* **决策理由**: 为了彻底贯彻 DDD（领域驱动设计）的统一语言原则，不能在文档里叫 `OrganicTree` 而在代码里叫 `AgentList`。这种认知割裂会严重干扰开发者（特别是 AI 编程助手）的理解。必须在本次 Change 中一次性解决所有术语残留。
