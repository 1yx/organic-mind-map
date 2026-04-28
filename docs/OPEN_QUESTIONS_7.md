# 开放性问题 (CLI Preview Handoff 设计)

本文件记录从原 `@openspec/changes/cli-generate-omm/**`，现 `@openspec/changes/cli-preview-handoff/**` 的提案与设计审查中发现的架构设计缺陷、风险及待决策点。

---

## 1. 模块命名与实际职责的严重背离 (Misnomer & Responsibility) [已决策]

### 发现的问题
这个提案模块的名称是 `cli-generate-omm`。但在设计文档中，明确写着：“The browser, not the CLI, performs final DOM-based text measurement, layout, and .omm download/export.” 并且实际注册的 CLI 命令是 `omm preview input.json`。

### 苏格拉底式问题
* 如果 CLI 根本不负责生成最终合法的 `.omm` 文件（因为缺坐标），为什么这个模块依然叫 `cli-generate-omm`？这是否会给未来的开发者带来极大的认知混乱？
* 既然实际的 CLI 命令是 `omm preview`，这个模块的职责和后面 `06-local-preview-server` 的职责边界究竟在哪里？
* 我们是否应该将这个模块重命名为 `cli-preview-handoff` 或者干脆将其与 `06-local-preview-server` 合并成一个单一的“读取校验并启动本地服务”的闭环模块？

### 决策记录
* **决策结果**: 将该模块重命名为 `cli-preview-handoff`，以消除“CLI 会生成最终 `.omm` 文件”的误导性暗示。
* **决策理由**: “Generate OMM” 容易让后续维护者误以为 CLI 是生成最终带排版坐标产品的核心引擎。既然架构上 CLI 仅负责数据 I/O、阈值校验并启动本地服务进行预览切换，将其命名为 `cli-preview-handoff` 更加诚实且准确地反映了它的管道与握手（handoff）属性。
* **后续修改文档**: 已将该 change 文件夹 `cli-generate-omm` 重命名为 `cli-preview-handoff`，并更新所有涉及该模块名称的文档及包名。

---

## 2. 内部通信负载：是残缺的 `.omm` 还是独立的 Payload？ [已决策]

### 发现的问题
在 `design.md` 的 Pipeline 中提到，CLI 会 “build preview payload / draft logical document”，然后将其传给本地浏览器。

### 苏格拉底式问题
* 我们在 `omm-document-format` 的审查中刚刚决定，标准的 `.omm` 文件**必须**包含布局坐标（x, y, path 等）。如果 CLI 生成的是一个“Draft logical document（草稿版 omm）”，那这个缺失了坐标的 JSON 对象在传入前端时，是否会引发前端基于标准 `.omm` Schema 的强校验报错？
* 为了保证类型安全和领域模型的纯洁性，CLI 传给 Web 前端 REST API (`/api/document`) 的数据体，是否应该被定义为一个全新的类型（例如 `PreviewPayload`），而不是复用或破坏标准的 `OmmDocument` 类型？
* 这个 `PreviewPayload` 是否只需包含分配好颜色和 ID 的逻辑树，然后由浏览器解析它、测算排版，最终才在内存里实例化并导出真正的 `OmmDocument`？

### 决策记录
* **决策结果**: CLI 向 Web 端提供的内部 REST API 数据应当是一个独立的类型：`PreviewPayload`，而不是缺失了物理坐标且无法通过严格 Schema 校验的残缺版 `OmmDocument`。
* **决策理由**: 维护数据类型的一致性和安全性是工程的底线。既然我们已经定义了 `OmmDocument` 必须包含坐标，如果 CLI 组装一个只含概念的草稿塞入 `OmmDocument` 结构，会导致前端强类型和 Schema 解析陷入混乱。`PreviewPayload` 仅仅是一个清洗过后的 `AgentList`，前端接收到 `PreviewPayload` 后进行一系列内存实例化、排版渲染，当需要导出时，再由前端亲自实例化出真正合法的 `OmmDocument`。
* **后续修改文档**: 修正相关的内部接口定义文档，确保 CLI 提供给浏览器的 API 返回类型为 `PreviewPayload`，并在文档中注明 `OmmDocument` 仅由 Browser 负责生成与导出。

---

## 3. ID 与颜色的分配权：CLI 还是 Browser？ [已决策]

### 发现的问题
`design.md` 规定 CLI 负责 `assign ids` 和 `assign colors`。

### 苏格拉底式问题
* 既然浏览器端最终要负责极其复杂的“DOM排版计算”甚至未来还要负责“自由拖拽导出”，那将节点 ID 和颜色的分配工作放在 Node.js CLI 端做，是否是合理的职责划分？
* 如果 CLI 仅仅是做个轻量的 JSON 读取器和容量校验器（Threshold Check），直接把原始的 `OrganicTree` 喂给浏览器，让浏览器的 Vue 应用（它本就有完整的 ViewModel 和 Pinia Store）去统一接管 ID 生成、颜色分配、布局测算和 OMM 组装，这样前后的代码会不会更加高内聚、低耦合？
* 我们是否应该把 CLI 的职责进一步削薄：**只做 I/O 读取、Schema 校验和容量拦截，业务逻辑（ID、颜色、排版）全部下放给 Web App？**

### 决策记录
* **决策结果**: 将 ID 生成、颜色分配以及所有的业务组装逻辑**全部下放给 Web App (Browser 端)**。CLI 的职责被极致削薄，仅作为纯粹的“I/O 读取器、Schema 校验器、容量拦截器和服务启动器”。
* **决策理由**: 这种职责划分极大地提升了系统的高内聚与低耦合。浏览器端的 Vue 应用（配合 Pinia 状态管理）天然适合处理复杂的领域模型实例化、颜色继承、视图状态映射以及最终的 OMM 组装。如果让 CLI 越俎代庖去分配颜色和 ID，不仅会导致前后端代码逻辑严重碎片化，还会让 CLI 变得臃肿，进而增加了维护和测试的成本。把 CLI 剥离成一个纯粹的数据管道（Pipeline + Guard），是最健壮的架构选择。
* **后续修改文档**: 在 `@openspec/changes/cli-preview-handoff` 相关的 `design.md` 和 `tasks.md` 中，移除 CLI 负责分配 ID、分配颜色的描述，明确其仅负责透传清洗后的 `OrganicTree` Payload 给浏览器端。
