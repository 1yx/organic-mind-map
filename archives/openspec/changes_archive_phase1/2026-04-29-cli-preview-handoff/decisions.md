# 开放性问题 (CLI Preview Handoff 设计)

本文件记录对 `@openspec/changes/cli-preview-handoff/**` 提案与设计进行审查后发现的架构设计缺陷、风险及待决策点。

---

## 1. 模块命名与实际职责的严重背离 (Misnomer & Responsibility) [已决策]

### 发现的问题
这个提案模块的名称是 `cli-generate-omm`。但在设计文档中，明确写着："The browser, not the CLI, performs final DOM-based text measurement, layout, and .omm download/export." 并且实际注册的 CLI 命令是 `omm preview input.json`。

### 苏格拉底式问题
* 如果 CLI 根本不负责生成最终合法的 `.omm` 文件（因为缺坐标），为什么这个模块依然叫 `cli-generate-omm`？这是否会给未来的开发者带来极大的认知混乱？
* 既然实际的 CLI 命令是 `omm preview`，这个模块的职责和后面 `06-local-preview-server` 的职责边界究竟在哪里？
* 我们是否应该将这个模块重命名为 `cli-preview-handoff` 或者干脆将其与 `06-local-preview-server` 合并成一个单一的"读取校验并启动本地服务"的闭环模块？

### 决策记录
* **决策结果**: 将该模块重命名为 `cli-preview-handoff`，以消除"CLI 会生成最终 `.omm` 文件"的误导性暗示。
* **决策理由**: "Generate OMM" 容易让后续维护者误以为 CLI 是生成最终带排版坐标产品的核心引擎。既然架构上 CLI 仅负责数据 I/O、阈值校验并启动本地服务进行预览切换，将其命名为 `cli-preview-handoff` 更加诚实且准确地反映了它的管道与握手（handoff）属性。
* **后续修改文档**: 已将该 change 文件夹 `cli-generate-omm` 重命名为 `cli-preview-handoff`，并更新所有涉及该模块名称的文档及包名。

---

## 2. 内部通信负载：是残缺的 `.omm` 还是独立的 Payload？ [已决策]

### 发现的问题
在 `design.md` 的 Pipeline 中提到，CLI 会 "build preview payload / draft logical document"，然后将其传给本地浏览器。

### 苏格拉底式问题
* 我们在 `omm-document-format` 的审查中刚刚决定，标准的 `.omm` 文件**必须**包含布局坐标（x, y, path 等）。如果 CLI 生成的是一个"Draft logical document（草稿版 omm）"，那这个缺失了坐标的 JSON 对象在传入前端时，是否会引发前端基于标准 `.omm` Schema 的强校验报错？
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
* 既然浏览器端最终要负责极其复杂的"DOM排版计算"甚至未来还要负责"自由拖拽导出"，那将节点 ID 和颜色的分配工作放在 Node.js CLI 端做，是否是合理的职责划分？
* 如果 CLI 仅仅是做个轻量的 JSON 读取器和容量校验器（Threshold Check），直接把原始的 `OrganicTree` 喂给浏览器，让浏览器的 Vue 应用（它本就有完整的 ViewModel 和 Pinia Store）去统一接管 ID 生成、颜色分配、布局测算和 OMM 组装，这样前后的代码会不会更加高内聚、低耦合？
* 我们是否应该把 CLI 的职责进一步削薄：**只做 I/O 读取、Schema 校验和容量拦截，业务逻辑（ID、颜色、排版）全部下放给 Web App？**

### 决策记录
* **决策结果**: 将 ID 生成、颜色分配以及所有的业务组装逻辑**全部下放给 Web App (Browser 端)**。CLI 的职责被极致削薄，仅作为纯粹的"I/O 读取器、Schema 校验器、容量拦截器和服务启动器"。
* **决策理由**: 这种职责划分极大地提升了系统的高内聚与低耦合。浏览器端的 Vue 应用（配合 Pinia 状态管理）天然适合处理复杂的领域模型实例化、颜色继承、视图状态映射以及最终的 OMM 组装。如果让 CLI 越俎代庖去分配颜色和 ID，不仅会导致前后端代码逻辑严重碎片化，还会让 CLI 变得臃肿，进而增加了维护和测试的成本。把 CLI 剥离成一个纯粹的数据管道（Pipeline + Guard），是最健壮的架构选择。
* **后续修改文档**: 在 `@openspec/changes/cli-preview-handoff` 相关的 `design.md` 和 `tasks.md` 中，移除 CLI 负责分配 ID、分配颜色的描述，明确其仅负责透传清洗后的 `OrganicTree` Payload 给浏览器端。

---

## 4. 随机种子 (Organic Seed) 的丢失导致测试崩溃与刷新闪烁 (Loss of Determinism) [已决策]

### 发现的问题
在 `design.md` 中，明确规定："No `--seed` is required in the CLI handoff layer. Seed generation and deterministic domain instantiation belong to the browser app"。CLI 的任务被完全剥离了 Seed 的概念。

### 苏格拉底式问题
* 如果 CLI 完全不处理 Seed，交由浏览器前端去实例化，那么用户在 Web 页面看图时按下了 **F5 刷新页面**，浏览器重新 fetch Payload 并在内存里重新生成 Seed，这是否会导致整棵导图的节点 ID 全部改变、有机分支的弯曲度、长短和形态发生瞬间突变（视觉闪烁）？
* 在 `08-mvp-fixtures-validation` 中，我们要求测试是**确定性（Deterministic）**的，相同的输入必须得到像素级相同的 SVG 输出。如果 CLI 不提供传入 `--seed` 的入口，我们在自动化 CI 里怎么控制浏览器的随机生成？
* **建议**：CLI 是否应该依然保留 `--seed` 参数的解析？CLI 可以不负责用这个 seed 算排版，但它可以把这个 seed 原封不动地放在 `PreviewPayload.meta.seed` 中透传给浏览器。浏览器一旦读到传入了 seed，就使用它生成固定的 OmmDocument，这是否是更优雅的解法？

### 决策记录
* **决策结果**: 维持 CLI 不处理 `--seed` 参数的设计。浏览器端不需要纯随机生成 Seed，而是**使用轻量、极速、同步的非密码学哈希函数（如 `cyrb53`），对 `OrganicTree` 的 JSON 序列化字符串进行 Hash 计算，得到一个整数作为 `organicSeed`**。
* **决策理由**: 这一方案完美契合了本项目在 `OPEN_QUESTIONS.md` 中定下的核心原则——**"受控随机性 (Controlled Randomness)"**。相比于 Base64 缺乏雪崩效应、SHA-256 在浏览器端是异步操作（阻断同步渲染流水线），`cyrb53` 作为纯函数不仅具备优秀的雪崩效应（改动任意一字都会引起剧烈哈希跳变），并且执行极速、无异步阻塞，也无需抹平 Node 与 Web 端的环境差异。基于内容的同构 Hash 生成 Seed，保证了排版测试的确定性，同时让每一张内容的修改都拥有唯一的"有机视觉签名"。
* **后续修改文档**: 在 `@openspec/changes/cli-preview-handoff` 和 `05-readonly-svg-renderer` 的设计文档中，明确指出浏览器生成 `organicSeed` 的算法是"基于 `OrganicTree` 内容的稳定同步 Hash（推荐 `cyrb53`）"，而不是伪随机数 `Math.random()`，也排除使用异步的 `window.crypto.subtle`。

---

## 5. 与 `06-local-preview-server` 模块的物理重叠风险 (Overlapping Responsibilities) [已决策]

### 发现的问题
`cli-preview-handoff` 里的 Task 包含："5.1 Start or hand off to the local preview server... 5.3 Print the localhost URL..."。但我们还有一个未修改的并列变更：`06-local-preview-server`。

### 苏格拉底式问题
* 既然我们之前决定 `cli-preview-handoff` 只是一个启动器，那么这两个模块的代码边界究竟在哪里？
* `cli-preview-handoff` 应该只负责"读取 JSON -> 校验 -> 生成 PreviewPayload -> 调用 `server.start(payload)`"；而真正的 Express/Vite HTTP 监听、CORS 配置、`/api/document` 的路由挂载，是不是应该严格圈定在 `06-local-preview-server` 的变更范围内？
* 两个 Change 文档在 Task 层面如果发生重叠，是否会导致开发实现时重复造轮子或产生代码冲突？

### 决策记录
* **决策结果**: 将本地服务器的启动细节、网络层挂载、端口占用检查以及控制台打印 URL（如原 Task 5.1、5.3 等）的实现责任**全部剥离下放至 `06-local-preview-server` 这个 Change 中**。
* **决策理由**: 强依赖于架构的单一职责原则（Single Responsibility Principle）。`cli-preview-handoff` 模块的本职工作仅仅是负责"从代理（Agent）处获取 JSON、校验结构和容量、清洗为 `PreviewPayload`"。将底层的网络框架（Vite/Express）、路由配置（`/api/document`）都放到其本该在的 `06-local-preview-server` 中，能完全避免前后两个独立 Change 出现重复造轮子、代码冲突或测试死锁。在 `cli-preview-handoff` 的代码里，只需简单地通过统一暴露的模块函数调用（如 `await startPreviewServer(payload)`）即可。
* **后续修改文档**: 在 `@openspec/changes/cli-preview-handoff` 的 `tasks.md` 和 `design.md` 中，删除或弱化 5.1、5.3 这些涉及网络底层启动细节的独立子任务。明确指出这些职责属于 `06-local-preview-server` 的实施范围，`cli-preview-handoff` 仅作为调用方传入 `PreviewPayload`。

---

## 6. 中心图选择权的下放带来的状态不稳定 (Center Visual Selection Instability) [已决策]

### 发现的问题
`design.md` 写道："Browser performs ID generation, color assignment, center visual selection"。

### 苏格拉底式问题
* 对于 ID 和颜色，浏览器可以通过 `OrganicTree` 的树状层级遍历来赋予定值的伪随机（比如根据同级 index 决定颜色），但"选择哪个基础中心图模板"如果交由浏览器随机选择，同样面临着页面刷新导致中心图突然变化的问题。
* 即使下放给浏览器，浏览器是否应该强制依赖 `PreviewPayload` 中提供的某些固定属性（如文档标题的 Hash 值）来确定中心图 ID？或者 CLI 在进行文本清洗时，直接把一个算好的稳定的内置模板 ID（如 `template_default_1`）塞进 Payload 传给浏览器，避免前端产生纯随机的业务逻辑？

### 决策记录
* **决策结果**: 采用"AI 智能配图 + 哈希保底"的混合双轨架构。首选方案是：大模型在生成 `OrganicTree` 时从官方受控的开源矢量库（如 Iconify）中搜索符合主题的 SVG 并提供 URL；CLI 在后台异步下载该 SVG，进行 XSS 净化后将其转换为内联（Inline）纯文本塞入 `PreviewPayload` 传给浏览器，实现真正的"图像优先"。如果大模型未提供链接或 CLI 下载失败，浏览器则作为降级保底（Graceful Fallback），使用基于内容的确定性哈希（`cyrb53`）算法从内置基础中心图模板中稳定挑选一张。
* **决策理由**: 这一方案完美兼顾了博赞法则对"图像必须与主题高度相关"的要求和系统的工程底线。通过 CLI 后台下载内联，彻底解决了前端直接渲染外链导致 Canvas 导出 PNG 时的跨域污染（Tainted Canvas）崩溃问题，也消灭了死链（Link Rot）风险，完全实现了单文件原子化保全。而降级方案中使用哈希挑选模板，则保证了即使没有 AI 配图，页面无论怎么刷新都不会发生视觉闪烁。
* **后续修改文档**: 新增了 `ai-svg-center-visual` 的 Change 提案以专门处理 AI 中心图下载与净化流程；在相关的 Web 渲染器或 `cli-preview-handoff` 文档说明中，明确规定"内联 SVG 优先，哈希模板保底"的处理逻辑。
