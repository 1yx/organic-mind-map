# 开放性问题 (MVP Fixtures Validation 设计)

本文件记录对 `@openspec/changes/mvp-fixtures-validation/**` 提案与设计进行审查后发现的前后架构矛盾、测试死角与术语残留问题。

---

## 1. 幽灵复活的 `--seed` 参数与确定性冲突 (Deprecated `--seed` Parameter) [已决策]

### 发现的问题
在 `design.md` 的 Smoke Workflow 章节中，明确写着这样一个命令行示例：`omm preview fixtures/agent-list/simple-zh.json --seed demo`。并且上面提到 "Generated outputs should be deterministic when a seed is supplied."

### 苏格拉底式问题
* 在我们前几天的 `OPEN_QUESTIONS_8.md` 核心架构审阅中，我们已经明确拍板定案：**CLI 层彻底剥离了 `--seed` 参数的解析与传递**。导图形态的受控随机性（确定性），是前端浏览器通过 `cyrb53` 算法直接对 `OrganicTree` 的内容进行哈希计算得出的 `organicSeed`。
* 为什么测试规范里依然出现了 `--seed demo` 这样的传参？如果测试工程师按照这份旧规范去写集成测试，会不会又偷偷把这个被我们砍掉的“冗余参数”在 CLI 源码里加回来，从而破坏整个“内容即哈希”的极简架构？
* **是否应该立刻修正文档**：删除所有的 `--seed demo` 命令行示例，并强制规定“测试的确定性（Determinism）必须且只能来源于输入 JSON 文本的内容哈希，禁止一切外部随机数种子的干预”？

### 决策记录
* **决策结果**: 坚决抹除文档中所有关于 `--seed` 的命令行残留。在 MVP 的自动化和手动测试规范中，**必须依赖“内容即哈希（Content Hash）”的架构来保证渲染结果的绝对确定性（Determinism）**。
* **决策理由**: 测试用例（Fixtures）是指导开发的唯一真理。如果测试规范中出现了已被废弃的设计（如传 `--seed` 参数），开发者极大概率会为了让测试跑通，而在 CLI 中把这个被砍掉的功能重新做回来，导致架构腐化。通过强制要求不传 `--seed` 且依然能得到稳定的渲染输出，才能真正倒逼前端同学把 `cyrb53` 同步哈希算法写对、写稳。
* **后续修改文档**: 在 `mvp-fixtures-validation` 的相关文档中，将命令行用例更改为最简形式（`omm preview fixtures/organic-tree/simple-zh.json`），并明确“渲染的稳定性直接来源于测试用例文件本身的内容”。

---

## 2. 缺失的浏览器降级（Fallback）测试用例 (Missing Browser Fallback Fixtures) [已决策]

### 发现的问题
规范中列出了诸如 `invalid-sentence-like.json` 和 `invalid-too-large.json` 等用于测试大模型结构和容量错误的测试用例。

### 苏格拉底式问题
* 我们在 `OPEN_QUESTIONS_9.md` 和 `10.md` 中做出了一个至关重要的改动：CLI 只负责透传受控图库的 `svgUrl` 链接，**由前端浏览器去负责异步加载，并且在图片加载失败或跨域被拦截时，平滑降级（Fallback）为内置的哈希模板图**。
* 但是在目前的 Fixture 列表里，只有正常的 `center-visual-hint.json`，却没有针对这个复杂前端降级机制的测试用例！
* **是否应该在列表中追加一个类似 `organic-tree-unreachable-svg-url.json` 的极端用例**：强制塞入一个会报 404 或超时的无效图片 URL，以此来在自动化或手动 Smoke 测试中，严格验证前端渲染器是否会因为死链而崩溃，能否完美展示出兜底的内置模板图？

### 决策记录
* **决策结果**: 必须在 Fixture 列表中追加一个用于测试网络死链与前端降级的核心极端用例，如 `unreachable-svg-url.json`（其中中心图的 URL 指向一个必然 404 或超时的地址）。
* **决策理由**: 前端在处理异步网络请求和 `<image>` 标签加载错误（`onerror`）时，非常容易出现“页面假死”、“白屏”或“JavaScript 异常崩溃”等灾难性故障。因为问题 9 的最终决策把“加载中心图与容错降级”的重任全部压给了浏览器，所以我们必须用一个真实的“毒药数据（Poison Fixture）”来对前端的错误边界（Error Boundary）进行极限施压，从而保证产品即使在网络极差或图库 API 宕机时，依然能稳如磐石地显示出一张内置的精美导图，而不是向用户抛出一个冷冰冰的白屏报错。
* **后续修改文档**: 在测试用例任务清单中追加 `Add an unreachable SVG URL fixture to test browser fallback resilience` 的相关要求。

---

## 3. 旧石器时代的 "Agent List" 命名残留 (Legacy Terminology) [已决策]

### 发现的问题
在 `design.md`、`spec.md` 和目录结构中，到处充斥着 `fixtures/agent-list/`、`agent list contract`、`agent list fixture` 等字眼。

### 苏格拉底式问题
* 在本项目早期的架构统一定调中（参见系统上下文和之前的更改），我们已经将大模型生成出来的那个核心 JSON 结构，从抽象的 "Agent List" 正式命名为了一目了然的 **`OrganicTree`**（随后被 CLI 包装成 `PreviewPayload` 传给前端）。
* “名不正，则言不顺”。如果任由自动化测试用例文件夹被命名为 `agent-list/`，测试代码里到处都是 `const agentList = ...`，这是否会与核心业务代码中的 `OrganicTree` 和 `PreviewPayload` 产生严重的“认知割裂”，让后续接手代码的人感到极度困惑？
* **是否应该执行一次全量的“术语大清洗”**：将提及到的 `agent list` 统统改为 `OrganicTree`，并把测试资源目录更名为 `fixtures/organic-tree/`？

### 决策记录
* **决策结果**: 坚决执行一次彻底的术语大清洗（Terminology Cleanup）。所有文档和目录结构中的 `agent list`、`agent-list` 必须统一更名为核心概念 **`OrganicTree`**（及其对应格式如 `organic-tree`）。
* **决策理由**: 在软件工程中，DDD（领域驱动设计）的基石就是“统一语言（Ubiquitous Language）”。如果我们在核心渲染引擎里高呼 `OrganicTree` 和 `PreviewPayload`，而在测试用例和校验脚手架里却叫它 `agent list`，这不仅会严重干扰后续使用 AI 写码助手（如 Copilot）时的上下文连贯性，也会给初级开发者带来巨大的思维负担。术语必须百分之百对齐，这是高质量代码库的基本修养。
* **后续修改文档**: 在涉及测试集验证的所有的 Markdown 文档、任务列表（Task）以及真实的文件目录结构中，发起全局替换，彻底抹除 `agent list` 这一过时且易产生歧义的代称。