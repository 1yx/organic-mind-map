# 开放性问题 (Project Scaffold 架构设计)

本文件记录从 `@openspec/changes/project-scaffold/**` 的提案与设计审查中发现的架构设计缺陷、风险及待决策点。

---

## 1. 单体仓 vs. Monorepo 架构边界不明 [已决策]

### 发现的问题
`design.md` 的架构图给出的是一个非常单体的目录结构：
```text
src/
  core/
  cli/
  renderer/
  web/
```
然而 `design.md` 中又提到 “Use a small multi-package or folder-separated TypeScript structure” 以及 “Overbuilding a monorepo before the product has code.”。同时，`cli` 需要作为 Node.js 应用运行，而 `web` 和 `renderer` 需要在浏览器（Vite）中运行。

### 苏格拉底式问题
* 如果 `src/cli` 和 `src/web` 放在同一个标准的 TypeScript 项目根目录下，它们的 `tsconfig.json` 如何处理截然不同的运行环境（Node 专属的 API vs DOM/Browser 专属的 API）？
* 在单体项目中，如何真正在物理上（不仅是口头上）防止 `web` 的代码不小心 import 了 `cli` 中的 Node.js 模块（例如 `fs` 或 `path`），从而导致浏览器打包失败？
* 既然 `core` 和 `renderer` 会被 CLI（部分工具）和 Web 端复用，是否应该从第一天起就采用原生的 NPM Workspace（如 pnpm workspaces）进行物理隔离，以极低的成本获得严格的依赖边界，而不是在一个 `src/` 下靠人为约定？

### 决策记录
* **决策结果**: 从项目第一天起就采用原生的 **pnpm workspaces (Monorepo)** 架构进行物理隔离。
* **决策理由**: `CLI` 和 `Web` 运行环境（Node.js vs Browser DOM）存在本质冲突。如果放在同一个 `src/` 下，不仅 `tsconfig.json` 的类型定义（如 `@types/node` 和 `DOM`）会互相污染，还会导致前端代码极易意外引入后端 Node 库而导致打包失败。使用 pnpm workspace 可以通过 `packages/core`、`packages/cli`、`packages/renderer`、`packages/web` 这种极低成本的方式，从物理层面、模块解析层面和 TypeScript 配置层面严格划分依赖边界。
* **后续修改文档**: 必须修改 `@openspec/changes/project-scaffold` 下的 `design.md` 和 `proposal.md`，将架构描述从“单体仓下分文件夹”明确修正为“基于 pnpm workspace 的轻量级 Monorepo 多包架构”。

---

## 2. 渲染器 (Renderer) 对框架的耦合性 [待决策]

### 发现的问题
`design.md` 提到 `renderer` 模块：`returns SVG-oriented render models or SVG strings/components.`，并且 `web` 宿主使用了 `Vite`。但在项目总体 `TECH_DESIGN.md` 中，我们之前定下过技术栈是 `Vue 3`。

### 苏格拉底式问题
* 这里的 `renderer` 是一个纯框架无关的 TypeScript 库（纯函数输出坐标、SVG String/AST），还是直接输出 Vue 3 组件（如 `mindmap.vue`）？
* 如果 `renderer` 直接包含了 Vue 组件，那它还属于“环境中立的纯粹渲染层”吗？
* 为了保证后续导出的稳定性和可能的跨框架复用，是否应该强制要求 `renderer` 输出的是与框架无关的 Virtual DOM 结构或 SVG AST，然后 `web` 层的 Vue 只是负责去将其挂载？

---

## 3. CLI 与 Web Preview 的通信机制 [已决策]

### 发现的问题
根据刚刚做出的 MVP 决断，流程是：“CLI 解析 JSON -> 校验 -> 唤起本地 Web 服务 -> Web 测算排版”。但在 `design.md` 和 `proposal.md` 里只写了 `cli handles local server startup`。

### 苏格拉底式问题
* 当用户在终端敲下 `omm preview my-list.json` 时，启动的 Web 服务是如何知道要加载哪个文件的？
* CLI 是通过 HTTP 接口暴露这个 JSON 给前端，还是通过 WebSocket，抑或是通过 Vite 的环境变量/注入传递给前端？
* 在 `src/` 的单体结构中，`cli` 需要启动 `web`，那 CLI 是去执行构建好的 Web 静态产物，还是启动 Vite Dev Server？这在生产环境和开发环境下的逻辑差异，Scaffold 阶段是否需要考虑设计？

### 决策记录
* **决策结果**: 采用 **内部暴露 REST API** 的方式进行通信（类似常规本地 CLI 工具的做法）。CLI 启动一个轻量的本地 HTTP 服务（开发环境下可通过 Vite 的 Middleware 代理，生产环境下使用极简的 Node server 挂载构建好的 Web 静态产物），同时暴露一个只读的 `GET /api/document` 接口。前端 Web App（Vue 3）在加载时通过 fetch 请求该接口获取当前 CLI 正在处理的 JSON/omm 数据。
* **决策理由**: REST API 的方式逻辑清晰、解耦度高。前端完全就是一个普通的单页应用（SPA），不需要被强行注入全局变量（避免了超大 JSON 导致 HTML 臃肿），也不需要复杂的 WebSocket（MVP 阶段没有热更新编辑诉求）。CLI 进程作为生命周期宿主，只需要在内存中持有目标文件，并响应前端的 fetch 请求即可。这种架构非常稳定，且为日后（Phase 2/3）如果需要增加“保存/修改”的 `POST` 接口留下了天然的扩展空间。
* **后续修改文档**: 更新 `@openspec/changes/project-scaffold` 和 `06-local-preview-server` 的设计文档，明确 CLI 启动 Web 服务时必须提供 `/api/document` 数据接口，前端通过标准的 HTTP Fetch 获取渲染数据。物，还是启动 Vite Dev Server？这在生产环境和开发环境下的逻辑差异，Scaffold 阶段是否需要考虑设计？