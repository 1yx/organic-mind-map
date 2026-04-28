# 开放性问题 (CLI Preview Handoff 设计)

本文件记录对 `@openspec/changes/cli-preview-handoff/**` 提案与设计进行“二次审阅”后，发现在剥离了大量职责后可能引发的**新设计缺陷与边界风险**。

---

## 1. 随机种子 (Organic Seed) 的丢失导致测试崩溃与刷新闪烁 (Loss of Determinism) [已决策]

### 发现的问题
在 `design.md` 中，明确规定：“No `--seed` is required in the CLI handoff layer. Seed generation and deterministic domain instantiation belong to the browser app”。CLI 的任务被完全剥离了 Seed 的概念。

### 苏格拉底式问题
* 如果 CLI 完全不处理 Seed，交由浏览器前端去实例化，那么用户在 Web 页面看图时按下了 **F5 刷新页面**，浏览器重新 fetch Payload 并在内存里重新生成 Seed，这是否会导致整棵导图的节点 ID 全部改变、有机分支的弯曲度、长短和形态发生瞬间突变（视觉闪烁）？
* 在 `08-mvp-fixtures-validation` 中，我们要求测试是**确定性（Deterministic）**的，相同的输入必须得到像素级相同的 SVG 输出。如果 CLI 不提供传入 `--seed` 的入口，我们在自动化 CI 里怎么控制浏览器的随机生成？
* **建议**：CLI 是否应该依然保留 `--seed` 参数的解析？CLI 可以不负责用这个 seed 算排版，但它可以把这个 seed 原封不动地放在 `PreviewPayload.meta.seed` 中透传给浏览器。浏览器一旦读到传入了 seed，就使用它生成固定的 OmmDocument，这是否是更优雅的解法？

### 决策记录
* **决策结果**: 维持 CLI 不处理 `--seed` 参数的设计。浏览器端不需要纯随机生成 Seed，而是**使用轻量、极速、同步的非密码学哈希函数（如 `cyrb53`），对 `OrganicTree` 的 JSON 序列化字符串进行 Hash 计算，得到一个整数作为 `organicSeed`**。
* **决策理由**: 这一方案完美契合了本项目在 `OPEN_QUESTIONS.md` 中定下的核心原则——**“受控随机性 (Controlled Randomness)”**。相比于 Base64 缺乏雪崩效应、SHA-256 在浏览器端是异步操作（阻断同步渲染流水线），`cyrb53` 作为纯函数不仅具备优秀的雪崩效应（改动任意一字都会引起剧烈哈希跳变），并且执行极速、无异步阻塞，也无需抹平 Node 与 Web 端的环境差异。基于内容的同构 Hash 生成 Seed，保证了排版测试的确定性，同时让每一张内容的修改都拥有唯一的“有机视觉签名”。
* **后续修改文档**: 在 `@openspec/changes/cli-preview-handoff` 和 `05-readonly-svg-renderer` 的设计文档中，明确指出浏览器生成 `organicSeed` 的算法是“基于 `OrganicTree` 内容的稳定同步 Hash（推荐 `cyrb53`）”，而不是伪随机数 `Math.random()`，也排除使用异步的 `window.crypto.subtle`。

---

## 2. 与 `06-local-preview-server` 模块的物理重叠风险 (Overlapping Responsibilities) [已决策]

### 发现的问题
`cli-preview-handoff` 里的 Task 包含：“5.1 Start or hand off to the local preview server... 5.3 Print the localhost URL...”。但我们还有一个未修改的并列变更：`06-local-preview-server`。

### 苏格拉底式问题
* 既然我们之前决定 `cli-preview-handoff` 只是一个启动器，那么这两个模块的代码边界究竟在哪里？
* `cli-preview-handoff` 应该只负责“读取 JSON -> 校验 -> 生成 PreviewPayload -> 调用 `server.start(payload)`”；而真正的 Express/Vite HTTP 监听、CORS 配置、`/api/document` 的路由挂载，是不是应该严格圈定在 `06-local-preview-server` 的变更范围内？
* 两个 Change 文档在 Task 层面如果发生重叠，是否会导致开发实现时重复造轮子或产生代码冲突？

### 决策记录
* **决策结果**: 将本地服务器的启动细节、网络层挂载、端口占用检查以及控制台打印 URL（如原 Task 5.1、5.3 等）的实现责任**全部剥离下放至 `06-local-preview-server` 这个 Change 中**。
* **决策理由**: 强依赖于架构的单一职责原则（Single Responsibility Principle）。`cli-preview-handoff` 模块的本职工作仅仅是负责“从代理（Agent）处获取 JSON、校验结构和容量、清洗为 `PreviewPayload`”。将底层的网络框架（Vite/Express）、路由配置（`/api/document`）都放到其本该在的 `06-local-preview-server` 中，能完全避免前后两个独立 Change 出现重复造轮子、代码冲突或测试死锁。在 `cli-preview-handoff` 的代码里，只需简单地通过统一暴露的模块函数调用（如 `await startPreviewServer(payload)`）即可。
* **后续修改文档**: 在 `@openspec/changes/cli-preview-handoff` 的 `tasks.md` 和 `design.md` 中，删除或弱化 5.1、5.3 这些涉及网络底层启动细节的独立子任务。明确指出这些职责属于 `06-local-preview-server` 的实施范围，`cli-preview-handoff` 仅作为调用方传入 `PreviewPayload`。

---

## 3. 中心图选择权的下放带来的状态不稳定 (Center Visual Selection Instability) [已决策]

### 发现的问题
`design.md` 写道：“Browser performs ID generation, color assignment, center visual selection”。

### 苏格拉底式问题
* 对于 ID 和颜色，浏览器可以通过 `OrganicTree` 的树状层级遍历来赋予定值的伪随机（比如根据同级 index 决定颜色），但“选择哪个基础中心图模板”如果交由浏览器随机选择，同样面临着页面刷新导致中心图突然变化的问题。
* 即使下放给浏览器，浏览器是否应该强制依赖 `PreviewPayload` 中提供的某些固定属性（如文档标题的 Hash 值）来确定中心图 ID？或者 CLI 在进行文本清洗时，直接把一个算好的稳定的内置模板 ID（如 `template_default_1`）塞进 Payload 传给浏览器，避免前端产生纯随机的业务逻辑？

### 决策记录
* **决策结果**: 采用“AI 智能配图 + 哈希保底”的混合双轨架构。首选方案是：大模型在生成 `OrganicTree` 时从官方受控的开源矢量库（如 Iconify）中搜索符合主题的 SVG 并提供 URL；CLI 在后台异步下载该 SVG，进行 XSS 净化后将其转换为内联（Inline）纯文本塞入 `PreviewPayload` 传给浏览器，实现真正的“图像优先”。如果大模型未提供链接或 CLI 下载失败，浏览器则作为降级保底（Graceful Fallback），使用基于内容的确定性哈希（`cyrb53`）算法从内置基础中心图模板中稳定挑选一张。
* **决策理由**: 这一方案完美兼顾了博赞法则对“图像必须与主题高度相关”的要求和系统的工程底线。通过 CLI 后台下载内联，彻底解决了前端直接渲染外链导致 Canvas 导出 PNG 时的跨域污染（Tainted Canvas）崩溃问题，也消灭了死链（Link Rot）风险，完全实现了单文件原子化保全。而降级方案中使用哈希挑选模板，则保证了即使没有 AI 配图，页面无论怎么刷新都不会发生视觉闪烁。
* **后续修改文档**: 新增了 `ai-svg-center-visual` 的 Change 提案以专门处理 AI 中心图下载与净化流程；在相关的 Web 渲染器或 `cli-preview-handoff` 文档说明中，明确规定“内联 SVG 优先，哈希模板保底”的处理逻辑。