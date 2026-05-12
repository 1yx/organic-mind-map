# 开放性问题 (.omm Document Format 设计)

本文件记录从 `@openspec/changes/omm-document-format/**` 的提案与设计审查中发现的架构设计缺陷、风险及待决策点。

---

## 1. 序列化数据结构的冗余与脆弱性 (Redundancy in JSON Tree Model) [已决策]

### 发现的问题
在 `design.md` 定义的 `MindMap` 和 `MindNode` 模型中，节点被存储为一个扁平的字典（`nodes: Record<NodeId, MindNode>`）。但是，每个 `MindNode` 中竟然同时保存了 `parentId: NodeId | null` 和 `childIds: NodeId[]`。

### 苏格拉底式问题
* 这种“双向指针（Doubly-linked）”的数据结构在内存状态管理（如 Vue 的 Pinia Store）中非常高效，但在**静态序列化的 JSON 文件**中是否过度冗余且极度脆弱？
* 如果第三方工具或 Agent CLI 尝试生成 `.omm`，它们必须极其小心地同时维护父节点的 `childIds` 数组和子节点的 `parentId` 字段。一旦出现一个 ID 拼写错误或没对齐，整个文档就会在严格的校验器中崩溃。
* 在持久化文件格式中，我们是否应该采用更经典的单向树状嵌套结构（`children: [Node]`），或者只保留 `parentId` 让系统在加载时动态还原树的拓扑关系？

### 决策记录
* **决策结果**: `.omm` 静态文件格式采用**单向嵌套树结构**，即节点通过 `children: MindNode[]` 表达层级和顺序；不在静态 JSON 中同时保存 `parentId` 与 `childIds` 这种双向指针。
* **决策理由**: `.omm` 是持久化交换格式，不是运行时 Store。双向指针虽然利于内存索引，但会让第三方工具、Agent CLI 或手写 JSON 同时维护父子两端引用，任何一侧漏改都会导致文件拓扑不一致。嵌套树更符合 JSON 文件的自然表达方式，也天然保存兄弟顺序。运行时如果需要 `parentId`、扁平索引或 `nodesById`，应在加载 `.omm` 后由应用动态派生。
* **后续修改文档**: 修改 `omm-document-format` 的 `design.md`、`spec.md` 和 `tasks.md`，将 `nodes: Record<NodeId, MindNode>`、`rootChildren`、`parentId`、`childIds` 从持久化模型中移除，改为 `rootMap.children: MindNode[]` 与节点内嵌 `children?: MindNode[]`。

---

## 2. `.omm` 是否需要保存布局计算结果（坐标/路径）？(Missing Layout Coordinates) [已决策]

### 发现的问题
我们在 Scaffold 阶段刚刚决策过：“CLI 唤醒浏览器，由浏览器进行真实的 DOM 文本测量和布局动态生成，随后用户从浏览器下载保存为 `.omm` 文件”。
然而，审查 `.omm` 的数据模型发现，里面仅仅保存了逻辑树（`concept`, `childIds`, `organicSeed`），**完全没有预留任何 `x, y, width, height` 或 `svgPath` 等物理坐标字段**。

### 苏格拉底式问题
* 如果 `.omm` 文件不保存浏览器辛辛苦苦算出来的物理坐标和文本截断状态，那浏览器导出它的意义是什么？（CLI 也可以直接生成这个只有逻辑树的 JSON）
* 每次用户或第三方工具打开这个 `.omm` 文件，是否都必须强制经过一次完整的浏览器 DOM 渲染和复杂的防碰撞测算引擎才能知道节点在哪里？
* 这是否违背了“导出稳定的一张纸”的初衷？如果我们要在未来把 `.omm` 无缝转换给 Figma，没有内置坐标的 `.omm` 如何直接提供矢量定位信息？

### 决策记录
* **决策结果**: `.omm` 必须保存浏览器计算后的**布局快照（Layout Snapshot）**，包括中心图、节点、分支路径、文本路径、边界盒等足以复现一张纸的物理坐标信息。
* **决策理由**: MVP 的关键架构已经决定由浏览器做真实 DOM/SVG 文本测量和布局计算。如果导出的 `.omm` 不保存这些结果，就退化成 CLI 也能生成的纯逻辑树，无法体现“浏览器导出稳定纸张结果”的价值，也不利于未来 Figma/SVG/PDF 等矢量导出。逻辑树负责表达语义来源，布局快照负责表达浏览器计算出的纸面事实；两者分层保存，既能复现成品，也允许未来在重新布局时更新快照。
* **后续修改文档**: 修改 `omm-document-format`，在 `OmmDocument` 或 `MindMap` 中加入 `layout` / `LayoutSnapshot`，用 `nodeId` 引用逻辑节点，保存坐标、路径、边界盒和布局环境信息。

---

## 3. `displayText` 渲染副作用泄露到文档模型 (Render Artifacts in Document Model) [已决策]

### 发现的问题
`MindNode` 的字段中包含了 `concept`（原始精简概念）和 `displayText`（实际显示的文本，可能因为物理长度限制被“截断或渐隐”）。

### 苏格拉底式问题
* `displayText`（比如加上了省略号的字符串）完全是一个依赖当前操作系统字体、DPI 和渲染器测量的**渲染副产物**。
* 如果换一台没有安装特定字体的电脑打开同一个 `.omm`，其实际的渲染长度可能并不需要被截断。把这种基于特定环境的“渲染期副作用”固化保存到 `.omm` 这样代表事实来源的逻辑文档中是否合理？
* 我们是否应该将 `displayText` 从静态文档模型中剔除，仅仅在内存运行时的 ViewModel 中存在？

### 决策记录
* **决策结果**: 从 `.omm` 静态文档模型中移除 `displayText`。`.omm` 只保存语义事实 `concept` 和浏览器计算出的几何布局快照，不保存截断、省略号、渐隐后的显示字符串。
* **决策理由**: `displayText` 是当前字体、DPI、浏览器渲染和文本测量环境共同决定的运行时副作用，不应固化为逻辑文档事实。不同设备重新打开同一 `.omm` 时，可以使用保存的布局快照复现纸面几何，也可以重新计算视图态的裁切策略；但原始概念文本必须保持干净。
* **后续修改文档**: 修改 `omm-document-format` 的 `MindNode` 模型、spec 和 tasks，删除 `displayText` 字段。裁切状态只允许存在于运行时 ViewModel 或导出渲染流程中，不进入 `.omm` 语义模型。

---

## 4. 单体 JSON 包含全量 Base64 导致的文件体积与性能灾难 (Base64 Bloat in JSON) [已决策]

### 发现的问题
`design.md` 明确规定：“Uploaded custom image data inside .omm so the file opens with required custom images intact.”，并且是存为 JSON 内部的 `data`（Base64 字符串）。

### 苏格拉底式问题
* 如果用户上传了 3 张未经压缩的 5MB 高清原图作为节点插图，整个 `.omm` JSON 文件的体积将瞬间飙升至 20MB 以上。
* 浏览器主线程在执行 `JSON.parse()` 解析一个 20MB 且充斥着超长 Base64 字符串的单体 JSON 时，极有可能发生严重的卡顿或内存溢出。此外，如果在 VS Code 中双击打开这个 JSON，编辑器会直接卡死。
* 尽管 MVP 阶段用 Base64 最简单，但我们是否应该在规范里强制加上“对上传图片进行极致的宽高和质量压缩（例如不超过 200KB）”的前置防御？或者从长远看，纯正的单文件是否应该参考 `.epub` 或 `.docx` 那样，采用 `.zip` 打包 JSON 和图片文件的模式？

### 决策记录
* **决策结果**: 为了彻底规避 Base64 导致的体积灾难，**在 Phase 1 (MVP) 阶段，直接砍掉“用户上传中央图片/节点图片”的功能**。MVP 将完全依赖系统内置的中心图模板（仅记录 ID）。
* **决策理由**: 处理用户图片的裁剪、体积压缩、Base64 编码或转换为 `.zip` 包格式等工作涉及大量复杂的工程与边界条件处理，这会严重分散 Phase 1 “验证大模型生成与有机导图算法”的核心目标。推迟该功能，保证了 MVP 阶段不仅能够极速落地，同时保证所有的 `.omm` 文件都如同纯文本一样轻巧和高效。
* **后续修改文档**: 
  1. 修改 `PRD.md`、`TECH_DESIGN.md`、`BP.md` 中所有提及“允许免费版/MVP 本地上传图片”的描述，将其明确延后至后续阶段或 Phase 2。
  2. 修改 `@openspec/changes/omm-document-format`，从数据模型和 Schema 中移除对 `source: "uploaded"` 和 Base64 `data` 字段的支持。
