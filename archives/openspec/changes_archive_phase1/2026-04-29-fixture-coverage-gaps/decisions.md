# 开放性问题 (Fixture Coverage Gaps 设计)

本文件记录对 `@openspec/changes/fixture-coverage-gaps/**` 提案与设计进行审查后发现的遗漏盲区、架构冲突及过度设计嫌疑。

---

## 1. 网络死链与前端降级测试的遗漏 (Missing Network Timeout / 404 Fallback Fixture) [已决策]

### 发现的问题
在 `tasks.md` 中，针对中心图的异常测试仅添加了 `poison-xss-protocol.json`（用于测试非法协议拦截）。但是，完全忽略了我们在 `openspec/changes/archive/2026-04-29-mvp-fixtures-validation/decisions.md` 中重点强调的**网络死链与降级测试**。

### 苏格拉底式问题
* 我们在先前的架构决策中（问题 9），为了保证 CLI 轻量化，把拉取中心图的职责交给了前端浏览器，并要求浏览器在加载图片失败（死链、404、超时）时，必须平滑降级（Graceful Fallback）为内置的哈希模板图，绝不能白屏。
* 如果在测试体系里，不加入一个指向无效或超时 URL（例如 `https://httpstat.us/404` 或 `http://10.255.255.1/timeout.svg`）的极端用例，前端开发工程师如何证明他们的 `<image onerror="..."/>` 或超时回退逻辑被正确实现了？
* **是否必须在 Task 和 Spec 中强制追加 `fixtures/organic-tree/stress-unreachable-url.json` 这个核心用例？**

### 决策记录
* **决策结果**: 必须在 Fixture 列表中追加一个用于测试网络死链与前端降级的核心极端用例 `poison-unreachable-svg-url.json`（其中中心图的 URL 指向一个必然 404 或超时的地址）。
* **决策理由**: 前端在处理异步网络请求和 `<image>` 标签加载错误（`onerror`）时，非常容易出现“页面假死”、“白屏”或“JavaScript 异常崩溃”等灾难性故障。既然把“加载中心图与容错降级”的重任全部压给了浏览器，就必须用一个真实的“毒药数据（Poison Fixture）”来对前端的错误边界（Error Boundary）进行极限施压，从而保证产品即使在网络极差或图库 API 宕机时，依然能稳如磐石地显示出一张内置的精美导图。
* **后续修改文档**: 在 `fixture-coverage-gaps` 的任务清单和 spec 中，追加添加 `unreachable SVG URL` 降级测试用例的相关要求。

---

## 2. 缺失 Seed 的修复策略与“布局快照”的逻辑冲突 (Seed Repair vs Layout Snapshot) [已决策]

### 发现的问题
`spec.md` 中提到，当读取到一个缺少 `organicSeed` 的 `.omm` 文件时，“validation fails... or recomputes a deterministic replacement seed through an explicitly tested repair path”。

### 苏格拉底式问题
* 在 `openspec/changes/archive/2026-04-29-omm-document-format/decisions.md` 的第 2 题中，我们做出了一个决定产品底线的重大决策：**`.omm` 文件必须保存计算后的物理坐标和路径（Layout Snapshot）**。
* 这意味着，当一个 `.omm` 文件被打开时，它的视觉形态是由里面保存的物理坐标（x, y, path）直接决定的。在这种情况下，哪怕 `organicSeed` 丢失了，它也完全**不影响**导图的精确渲染。
* 如果我们为了“修复”这个丢失的 Seed，而触发所谓的“repair path”去重新运行一遍排版引擎，这不仅会耗费巨大的计算资源，还会**直接覆盖掉文件里原本保存的精确物理坐标**，这严重违背了“导出稳定的一张纸”的初衷！
* **是否应该明确规范：** 如果 `.omm` 包含合法的布局快照（Layout Snapshot），丢失 `organicSeed` 仅需通过对当前逻辑树内容做一次 `cyrb53` 哈希静默补全即可，**绝对禁止**触发任何重新排版或篡改坐标的修复逻辑？

### 决策记录
* **决策结果**: 明确规定：如果 `.omm` 文件缺失 `organicSeed` 但拥有完整的布局快照（Layout Snapshot），系统只能通过对文档内容进行一次确定的 `cyrb53` 哈希运算来静默补全 Seed，**绝对禁止**因此触发排版引擎重新计算坐标或覆盖现有快照。
* **决策理由**: `.omm` 保存下来的物理坐标就是它的绝对事实（Source of Truth）。丢失 Seed 是一个极小的数据残缺问题，绝不能为了“修复一个小数据”而把整张精心排版好的图纸推倒重来。只有当布局快照也丢失时，才允许重新走完整的排版流水线。
* **后续修改文档**: 在 `fixture-coverage-gaps` 及 `.omm` 数据格式的验证规范中，明确定义这层防覆盖保护机制。

---

## 3. Web 字体封杀的过度设计风险 (Web Font Prohibition vs Strict Schema) [已决策]

### 发现的问题
`tasks.md` 要求添加 “.omm validation tests for forbidden web font declarations”，并在 `spec.md` 中提到将其“normalizes it to the approved system font stack”。

### 苏格拉底式问题
* `.omm` 本质上是一个结构极其严格的 JSON 文件。如果我们在一开始的 JSON Schema 定义中，就直接禁止了未定义的扩展字段（`additionalProperties: false`），并且把与字体相关的字段（如 `theme.fontFamily`）设定为了一个极其严格的系统字体 Enum 枚举类型（例如只允许 `"sans-serif"`, `"system-ui"`）。
* 那么任何试图在 JSON 里注入 Google Fonts 外部链接或 `@font-face` 声明的恶意文件，在第一步 `JSON.parse` 结合 Schema 校验时就会直接因为类型不匹配而报错被拒。
* 我们是否有必要在验证器里写一套复杂的代码去“解析并 normalization（标准化）”违规字体？这是否属于典型的**过度设计 (Over-engineering)**？我们是否应该采取“Fail Fast（快速失败）”策略，利用极简的强类型 Schema 校验直接拒收不合规格式，而不是试图去“修复”它？

### 决策记录
* **决策结果**: 坚决摒弃复杂的“字体标准化（Normalization）”修复代码。全面采用 **“Fail Fast（快速失败）”** 策略：通过极简且强类型的 JSON Schema，直接将任何包含非系统安全字体的 `.omm` 文件拒之门外。
* **决策理由**: 写一套逻辑去解析恶意 JSON 试图在里面洗白数据的做法是典型的前端过度设计，而且极易产生漏洞。最安全的防线就是一把不准通融的锁：只允许白名单内的 Enum 枚举字符串（如 `"sans-serif"`, `"system-ui"`）作为 `fontFamily` 传入，如果出现其他的外部字体甚至 HTTP 引用，Schema 解析器直接抛错拒绝加载。这不仅代码极少，而且防守绝对严密，从根本上防止了 Web Fonts 在 Canvas 导出时导致穿模或崩溃的风险。
* **后续修改文档**: 删除 `fixture-coverage-gaps` 中关于”normalizes it”的过度设计描述，明确要求 `.omm` 的验证器遇到非法字体时直接执行 Fail Fast 报错拒绝机制。拒收不合规格式，而不是试图去”修复”它。明确要求 `.omm` 的验证器遇到非法字体时直接执行 Fail Fast 报错拒绝机制。