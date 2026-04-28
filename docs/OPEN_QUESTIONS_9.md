# 开放性问题 (AI SVG Center Visual 设计)

本文件记录对 `@openspec/changes/ai-svg-center-visual/**` 提案与设计进行审查后发现的潜在架构缺陷、风险及待决策点。

---

## 1. Node.js 端的 SVG 净化器是否会导致 CLI 体积严重膨胀？(Sanitization Overhead) [待决策]

### 发现的问题
在 `design.md` 和 `spec.md` 中，要求 CLI（Node.js 端）执行“Strict SVG parse and serialize sanitization”，剥离 `<script>`、`foreignObject` 以及各种外部引用和事件绑定。

### 苏格拉底式问题
* Node.js 原生并没有完整的 DOM 解析器。如果要实现严格且能防范各种 Edge Case 的防 XSS 净化（例如处理不规则的 XML 闭合、被编码的 payload），我们通常需要引入 `jsdom` 配合 `DOMPurify` 这样极其庞大和沉重的依赖。
* 我们刚刚在前面的决策中为了保持 CLI 的“极度轻量化”而移除了 Puppeteer/Playwright。现在为了净化一个 SVG，而在 CLI 中引入完整的虚拟 DOM 解析库，这是否属于 MVP 阶段的**过度设计 (Over-engineering)**？
* **替代方案探讨**：既然我们已经通过“严格的 URL 白名单（如只允许请求 `api.iconify.design`）”从源头上控制了输入，官方受控图库本身就是安全的，我们在 MVP 阶段是否可以信任受控图库的返回结果，仅做最基础的正则检测（如检测是否存在 `<script>`），从而免去引入沉重的解析器？

---

## 2. 本地 CLI 的白名单硬编码导致的僵化 (Hardcoded Allowlist) [待决策]

### 发现的问题
`design.md` 提到使用 “configured controlled HTTPS sources... initially Iconify-compatible endpoints or another explicit allowlist.” 来限制 CLI 只能抓取安全的受控图源。

### 苏格拉底式问题
* 作为一个运行在用户本地电脑上的 CLI 工具，如果把 URL 白名单硬编码在代码里，当未来我们需要增加新的优质开源图库，或者原有图库的 API 域名发生变更时，是否意味着所有用户都必须强制升级 CLI 版本才能继续使用 AI 配图功能？
* 我们是否应该允许大模型在返回 `iconUrl` 的同时，CLI 通过某种轻量级的动态配置（例如读取项目根目录下的 `.ommrc` 或拉取一个极小的在线配置清单）来决定白名单，以保证工具的灵活性？或者在 MVP 阶段，干脆只硬编码允许一个绝对稳定的源（如 Iconify）并明确拒绝其他一切来源？

---

## 3. 为 AI 妥协“至少 3 色”法则是否动摇了产品底线？(Color Compliance Compromise) [已决策]

### 发现的问题
`design.md` 明确声明：“Phase 1 deliberately relaxes the long-term 'center image must contain at least three colors' rule for AI-selected SVGs, because most open vector-library icons are single-color.”

### 苏格拉底式问题
* `GUIDELINES.md` 中将“中心图像至少 3 色”列为了**不可妥协的核心法则**。如果我们为了让大模型能搜到图，就允许中心图变成单色的（比如一个纯黑的灯泡图标），这是否会让这张图退化成普通的“黑白提纲+树状图”，从而背离了“极致复刻博赞有机美学”的产品初衷？
* **替代方案探讨**：既然我们在 Web 渲染器中已经接管了所有的业务逻辑和颜色分配，当浏览器接收到一个单色的 `inlineSvg` 时，我们能否**在前端利用代码动态为其上色**？（例如，解析 SVG 的 `path`，将不同的 `path` 随机或根据主分支的颜色分配成 3 种不同的填充色 `fill`），从而在不依赖大模型生成彩色图的情况下，用技术的手段强行满足“至少 3 色”的博赞法则？

### 决策记录
* **决策结果**: 接受 `ai-svg-center-visual` 提案中的妥协：在 Phase 1 (MVP) 阶段，允许 AI 选取的 SVG 中心图为单色。不在前端实现不可控的动态 SVG 上色逻辑。真正的中心图色彩合规与补全推迟至 Phase 2 解决。
* **决策理由**: 虽然这暂时违背了核心的“至少 3 色”规则，但由于受控开源图标库中的 SVG 通常是高度简化的单色结构（可能仅包含一个合并的 `<path>` 或使用 `stroke` 描边），前端用代码强行解析并动态上色不仅极易引发渲染错误和面目全非的视觉效果，还会引入不可预知的工程复杂度。为了确保 MVP “长文本 -> 智能配图 -> 渲染”这条大链路能够极速跑通，接受暂时的单色妥协是明智之举。在 Phase 2 引入真正的高级手绘图生成（Plus 功能）和丰富的彩色预制库后，自然能彻底弥补这一合规性短板。
* **后续修改文档**: 维持当前 `ai-svg-center-visual` 的设计规范，可以在 `PRD.md` 和 `TECH_DESIGN.md` 中增加批注，明确“允许单色中心图”仅仅是 Phase 1 MVP 对外部受控图库的临时豁免，长期依然以 Phase 2 的多色生成和丰富的多色构图为终态标准。

---

## 4. CLI 异步 Fetch 带来的体验阻塞 (Fetch Latency & Startup Blocking) [待决策]

### 发现的问题
`cli-preview-handoff` 增强了异步 Fetch 步骤：“If the fetch fails or times out, omit inlineSvg and let the browser gracefully fallback”。

### 苏格拉底式问题
* 在用户敲下 `omm preview` 到浏览器自动弹出的这个黄金体验窗口期，如果用户的网络连接特定的图库 API 较慢，CLI 是否会阻塞等待？
* 设定的超时时间（Timeout）应该是多少才不会让用户觉得“CLI 卡死了”？（例如严格限制在 1.5 秒或 2 秒内？）
* 这种由于网络波动导致的“有时能看到 AI 图，有时弹出来的是内置模板”的非确定性体验，是否会增加用户在 MVP 阶段对产品稳定性的疑虑？