# MCP 调研报告: 绘图类智能体插件的交互架构 (MCP Research: Diagramming Agent Patterns)

本报告调研了目前主流的绘图类 MCP (Model Context Protocol) 插件（如 Excalidraw、Mermaid）的交互链路，旨在为 `Organic Mind Map` 提供最优的“Agent -> CLI -> Web”协作方案。

---

## 1. 绘图类 MCP 的两大流派

通过调研发现，目前社区中处理“AI 绘图”的 MCP 架构主要分为两种截然不同的模式：

### 流派 A：文本驱动（Mermaid 模式 / Text-to-Render）
*   **交互逻辑**：`LLM 生产 DSL 文本 (如 graph TD) -> MCP 接收 -> 后台调用 Headless 浏览器 -> Mermaid.js 计算排版 -> 返回图片`。
*   **特点**：
    *   **Agent 零认知负担**：大模型不需要知道任何坐标（x, y），只需输出逻辑关系。
    *   **排版黑盒化**：布局算法完全封闭在渲染引擎内部。

### 流派 B：语义到空间驱动（Excalidraw 模式 / Semantic-to-Spatial）
*   **交互逻辑**：`LLM 描述节点与边 -> MCP 内部运行布局算法 -> 计算坐标与尺寸 -> 生成 JSON -> 前端渲染`。
*   **特点**：
    *   **高度可编辑**：生成的不是死图片，而是具有精确坐标的矢量对象。
    *   **空间感知**：Agent 能够感知当前的画布。

---

## 2. 架构层级分析：为什么 `PreviewPayload` 是冗余的？

在本项目最初的规划中，数据流被设计为：
`OrganicTree (LLM输出) -> CLI (清洗) -> PreviewPayload (带ID颜色) -> Web (排版)`。

通过对比 Mermaid 和 Excalidraw 的成熟 MCP 实现，我们发现 **`PreviewPayload` 层级在本项目中属于 100% 的冗余设计**，应当被剔除。

### 2.1 职责重叠
在先前的架构演进中，我们已经做出了以下核心决策：
1.  **ID 与颜色的分配权下放**：我们决定 CLI 不再负责分配节点 ID、分支颜色和中心图模板，这些“视觉/业务实例化”的工作全部由浏览器端的 Pinia Store 接管。
2.  **随机种子的确定性哈希**：我们决定 `organicSeed` 不再由 CLI 生成，而是由浏览器对内容进行哈希计算得出。
3.  **CLI 的职责削薄**：CLI 现在的角色仅是“守门员（Validator）”，负责校验容量和安全性。

### 2.2 结论：回归“三层架构”
如果保留 `PreviewPayload`，CLI 将被迫把 `OrganicTree` 重新组装成一个结构极其相似但名称不同的对象。这不仅增加了数据序列化的开销，还导致了类型定义的重复。

**优化后的极简链路（与 Mermaid/Excalidraw 模式对齐）：**
1.  **Agent 层**：输出最简的 `OrganicTree` (JSON)。
2.  **CLI 层**：校验 `OrganicTree` 的合法性。校验通过后，直接将原始的 `OrganicTree` 透传给浏览器。
3.  **浏览器层**：
    *   接收原始 `OrganicTree`。
    *   在内存中实时实例化 ViewNode（自动分配 ID、颜色、计算 Seed）。
    *   执行排版并渲染为 `Organic Mind Map`。

---

## 3. 最终架构建议

参考 Excalidraw 的极简主义，我们将整个 MVP 的数据流定格为：
**`Agent (OrganicTree) -> CLI (Filter) -> Web (Layout/Render)`**。

这种架构不仅让 CLI 保持了极致的轻量，更保证了系统在处理“从语义到空间”转换时的职责边界极其清晰——**CLI 负责“对不对”，Web 负责“在哪画”**。
