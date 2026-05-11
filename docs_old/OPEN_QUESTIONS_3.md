# 开放性问题 (MVP 架构与 Changes 设计)

本文件记录从 `@openspec/changes/**` (01 到 08) 的提案审查中发现的架构设计缺陷、风险及待决策点。

---

## 1. UX 体验断层：用户如何获取“OrganicTree”？[已决策]

### 发现的问题
`organic-tree-contract` 规定了将长文本转化为 OrganicTree 树状结构的契约，但 `cli-preview-handoff` 明确说明 CLI 只是读取该结构，“No AI API calls”。这意味着在 MVP 阶段，系统并不负责调用大模型。

### 苏格拉底式问题
* 如果 CLI 不调用 AI，用户是通过什么途径（例如手动在 ChatGPT 里输入 Prompt 拿到 JSON，再保存为文件喂给 CLI）来完成从长文本到 `.omm` 的转换的？
* 这种高度割裂的体验（外部 AI -> 存本地 -> CLI 生成 -> Web 预览）是否符合 MVP 验证“一键生成博赞导图”核心价值的预期？
* 是否应该在 MVP 阶段引入一个轻量级的编排层（例如利用 Gemini CLI / Codex CLI / Claude Code 等 Agent CLI），来打通“文本 -> AI -> CLI -> 预览”的全链路？

### 决策记录
* **决策结果**: MVP 阶段的工作流建立在 **Agent CLI + Agent Skill** 的编排之上，当前外层 Agent CLI 包括 Gemini CLI / Codex CLI / Claude Code。
* **决策理由**: 我们所规划的真实场景是由 Agent CLI 作为编排层来调用本项目的 `skill`（如 `@openspec/changes/organic-tree-contract` 中定义的）。由 Skill 调用大模型并生成简短的契约树，随后自动将其传递给本项目的 CLI 工具（如 `omm preview`），接着启动 Web 服务进行本地预览。因此，这并非割裂的“手动复制粘贴”体验，而是一套顺畅的、基于 Agent 工具链串联的自动化“文本 -> 导图 -> 预览”全链路。
* **后续修改文档**: 可以在相关文档（如 `PRD` 或 `cli-preview-handoff` 的背景说明）中补充这个完整的端到端用例，以打消关于“用户体验断层”的疑虑。

---

## 2. 文本测量与布局责任的错位 (Text Measurement & Layout) [已决策]

### 发现的问题
根据 `TECH_DESIGN.md`，博赞导图的“线字等长”和“留白保护”强依赖于**真实的文本测量 (Text Measurement)**。然而，`cli-preview-handoff` 只负责把 OrganicTree 交给浏览器，而 `05-readonly-svg-renderer`（在浏览器中运行）负责渲染。`.omm` 文件似乎只保存了逻辑树和 `organicSeed`，并不包含具体的坐标。

### 苏格拉底式问题
* 如果 CLI 不知道具体的字体渲染尺寸，它如何判断生成的节点数量是否超出了 A3/A4 纸张的物理边界（空间耗尽）？
* 在 MVP 没有可视化编辑器的情况下，如果 Agent 生成了一个节点过多、无法排布在单张纸上的结构，Web 渲染器是会直接重叠/挤爆，还是暴切？
* 布局求解器（Layout Engine）到底是跑在 CLI 侧（生成带坐标的 `.omm`）还是跑在 Web 侧（拿到逻辑 `.omm` 动态计算坐标）？如果是后者，如何保证 CLI 导出的结果是可控的？

### 决策记录
* **决策结果**: 动态计算布局和真实的文本测量是**浏览器端**的责任。产品的数据流并非“CLI 直接生成最终排版好的 `.omm` 然后用浏览器仅仅当看图器打开”，而是“**CLI 读取数据并唤起浏览器 -> 浏览器基于 DOM 进行真实的文本测量和布局动态生成 -> 随后用户可以从浏览器将结果下载到本地保存为 `.omm` 格式的文件**”。
* **决策理由**: 这是解决文本渲染依赖 DOM 环境（字体、像素、抗锯齿等）唯一且最优雅的方案。不在 CLI 中集成笨重的 Headless Browser，而是直接利用用户系统中已有的真实浏览器去承担“布局求解器 (Layout Engine)”和“文本测量”的工作。这样既保证了“线字等长”和空间检测的精准度，也为后续在浏览器内加入编辑能力（Phase 2/3）打好了完全一致的布局底座基础。
* **后续修改文档**: 必须大幅度修正 `cli-preview-handoff` 和 `06-local-preview-server` 的职责边界。CLI 阶段不再写入最终带有坐标/计算结果的 `.omm` 实体，而是作为一个服务启动器，将 Agent 输出的 JSON 数据喂给前端浏览器。浏览器内的应用接收数据、完成核心计算排版后，提供**下载/导出 `.omm` 文件**的能力。

---

## 3. CLI 无头导出与环境依赖 (Headless Export Dependency) [已决策]

### 发现的问题
`07-png-export` 原先提出“提供 Web 预览按钮或 CLI 导出路径”。但由于 SVG 的有机布局依赖浏览器 DOM 的文本测量 API，如果在 CLI 层实现无头导出（`omm export`），通常需要引入 Puppeteer 或 Playwright 这样的无头浏览器依赖。

### 苏格拉底式问题
* 我们是否愿意在 Phase 1 MVP 的 CLI 工具中引入沉重的 Headless Browser 依赖？
* 如果为了保持轻量级，仅仅在 Web Preview 页面上放置一个“导出 PNG”按钮（通过 Canvas 序列化），是否足够满足首批用户的核心使用场景？
* 这样是否会阻碍后续在 CI/CD 或服务端进行自动导出的能力？

### 决策记录
* **决策结果**: 在 Phase 1 MVP 阶段不提供 CLI 端的无头导出（one-shot PNG export）。导出动作仅在 Web Preview 页面中由浏览器端 API（如 Canvas 序列化）完成。
* **决策理由**: 保持 CLI 工具的轻量化至关重要。引入 Puppeteer 或 Playwright 等无头浏览器依赖会使工具体积急剧膨胀，且带来额外的环境依赖问题。由于有机导图的渲染本就强依赖真实的 DOM 文本测量，在前端直接利用已渲染好的 SVG 节点进行图片序列化是性价比最高、工程风险最小的 MVP 方案。未来如果有 CI/CD 或服务端的强诉求，可作为独立扩展服务实现，而不应捆绑进轻量级 CLI 核心。
* **后续修改文档**: `07-png-export` 的 `design.md` 与 `proposal.md` 已经更新完成，在 `Non-goals` 中明确排除了 "No CLI one-shot PNG export" 和 "No Puppeteer, Playwright, or bundled browser dependency in the CLI just for export"。

---

## 4. MVP 遗漏了高价值的 SVG 导出 (Omission of SVG Export) [已决策]

### 发现的问题
我们在 `OPEN_QUESTIONS_2.md` 的第 6 题中刚刚决策：**“唯一导出的标准核心格式为支持 Figma 友好的高质量分层 SVG”**。然而 `07-png-export` 中明确提到 “No editable export format in MVP”，只提供 PNG 导出。

### 苏格拉底式问题
* 既然 `05-readonly-svg-renderer` 已经在 DOM 中渲染出了 SVG，为什么在 MVP 阶段我们不顺手将这个 DOM 序列化并提供纯正的 SVG 下载？
* 考虑到项目宣称的核心价值之一是“自由导出出口”（导入到 Figma），推迟 SVG 导出是否会让 MVP 看起来只是一个不可编辑的“图片生成器”，从而失去专业用户的吸引力？

### 决策记录
* **决策结果**: SVG 导出是项目的核心价值，肯定会做，但**不在 MVP (Phase 1) 版本实现**，MVP 阶段仅聚焦于 PNG 导出。
* **决策理由**: 尽管 DOM 中已经存在 SVG，但要实现一个“Figma 友好、带语义化图层和内嵌素材的高质量 SVG”（如 `OPEN_QUESTIONS_2.md` 中所定义的标准），不仅仅是简单的 DOM 序列化（`outerHTML`），还需要处理命名空间、外部 CSS 内联、编组结构优化以及图像资源的 Base64 嵌入等复杂工作。MVP 的核心目标是快速验证“Agent 列表 -> 渲染为博赞图”的视觉可行性和产品流程，PNG 已经足够满足最基本的视觉验证和分享诉求。将高难度的 SVG 语义化导出推迟，可以保证 MVP 阶段的极速交付和聚焦。
* **后续修改文档**: 暂时不需要大改当前提案文档，只需在未来的迭代路线图（Roadmap）中明确将“高质量分层 SVG 导出”列为紧随 MVP 之后的高优特性。

---

## 5. 中心图像与素材体积膨胀 (Center Visual Bloat) [已决策]

### 发现的问题
`03` 和 `04` 提到 CLI 生成时会包含“center visual placeholder or selected free template”，并且“embedded or self-contained image assets”。

### 苏格拉底式问题
* 如果 MVP 提供“内置免费模板”，这些图片是直接 Base64 编码打入每一个 `.omm` 文件中吗？
* 这是否会导致 `.omm` 文件体积急剧膨胀，不符合纯文本/JSON 的轻量化管理预期？
* 是否应该把系统内置模板作为引用的内置 ID，只有当用户上传本地自定义图片时，才使用 Base64 内嵌？

### 决策记录
* **决策结果**: 对于系统提供的“内置免费模板”或基础素材，`.omm` 文件中**仅保存模板 ID 的引用**，不进行 Base64 编码内嵌。只有当用户上传**本地自定义图片**时，才使用 Base64 数据全量内嵌保存。
* **决策理由**: “模板 ID 的引用机制”能极大程度保持 `.omm` 文件的轻量化，避免结构化文档因为几张固定素材被反复复制而出现无意义的急剧膨胀。由于 Web 渲染器（前端 JS）负责加载和排版，具体的“模板 ID”与实际图像资源（如 URL、SVG 图标、图片数据）的映射关系完全可以内置、收敛在 Web 端的静态资源或 JS 映射表中。这样既满足了轻量、高效、易分发的原子化文件管理需求，也兼顾了用户自定义创作时的文件完整性（`OPEN_QUESTIONS_2.md` 中的要求：单文件发给别人时不能丢失个性化图片）。
* **后续修改文档**: 在 `omm-document-format` 的 `Asset Handling` 设计中，明确区分 `AssetManifest` 里 `builtin` 资源（仅保存 ID）和 `uploaded` 资源（保存 Base64 数据）的存储策略。

---

## 6. 浏览器端渲染的异常降级方案缺失 (Fallback Strategy for Render Failure) [已决策]

### 发现的问题
`05-readonly-svg-renderer/design.md` 提到，“如果文本超出分支长度，接受明显的文本裁切”。但这是一种“软失败”。如果输入的数据结构由于某种原因（比如分支极其密集、节点多达数百个）导致局部甚至全局发生严重重叠、溢出、甚至无法计算有效的空间时，设计案中仅提到了“Diagnostics are for tests and development”。

### 苏格拉底式问题
* 如果用户通过大模型生成了一份极其庞大的 JSON，并在浏览器端渲染时发生了严重的布局溢出，用户能知道这是“内容太多”还是“渲染引擎 bug”吗？
* 我们是否需要在 Web Preview 中加入一个“渲染健康度”指示器，或者在发生灾难性重叠时提供一个“优雅降级”的展示模式（例如显示局部警告并提示用户需要精简原文）？
* 将所有布局约束放在浏览器端算，当算不出合法结果时，系统如何进行自我保护？

### 决策记录
* **决策结果**: 不在浏览器端实现复杂的异常降级 UI（如灾难警告弹窗），而是将防线前置：**在调用 CLI 阶段进行内容容量的防御性拦截，超出限制则直接打回给外层 Agent CLI 重新生成。**
* **决策理由**: 浏览器端的 SVG 渲染器在 MVP 阶段只需保持轻量纯粹的“渲染者”角色。如果 JSON 内容过于庞大而导致渲染不可控，真正的源头在于外层 Agent CLI / Skill 产物没有遵循精简契约。通过在 CLI 级别对生成的契约列表或 `.omm` 文档进行快速的结构检查（例如限制最大深度、最大节点数、单节点最大字数估算），不仅保护了前端不会因渲染计算资源耗尽而崩溃，更能利用大模型的重试机制（Reflection / Error Feedback）迫使 AI 自我纠正并返回更符合“博赞纯正性”精简结构的列表。
* **后续修改文档**: 在 `cli-preview-handoff` 或 `organic-tree-contract` 中补充结构和体积的“阈值检查（Threshold Check）”机制，如果超出阈值，抛出带明确错误信息的异常，供外层 Agent CLI（Gemini CLI / Codex CLI / Claude Code）捕获并重试。浏览器端只负责尽力渲染合规体积内的数据即可。
