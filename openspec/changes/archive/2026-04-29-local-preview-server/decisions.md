# 开放性问题 (Local Preview Server 设计)

本文件记录对 `@openspec/changes/local-preview-server/**` 提案与设计进行审查后发现的架构风险及过度设计 (Over-engineering) 嫌疑。

---

## 1. 静态资源托管 vs 开发服务器的生产环境乱入 (Static Server vs Vite Dev Server) [已决策]

### 发现的问题
`design.md` 和规范中提到：“serve the Web preview bundle”。但在现代前端开发中，这往往会被误解为在 CLI 启动时拉起一个 Vite/Webpack 开发服务器。

### 苏格拉底式问题
* `omm` 作为一个要发布给最终用户（或在 Agent 环境中执行）的 CLI 工具，如果在 `local-preview-server` 中依赖了 Vite Dev Server，这意味着我们需要把整个 `@omm/web` 的源代码和重型编译依赖都打包进 CLI 的生产环境发布产物中，这会导致 CLI 体积暴增且启动极其缓慢。
* 我们是否应该在设计规范中设定一条铁律：**CLI 的生产环境严禁启动任何构建工具（如 Vite/Rollup）**。`local-preview-server` 只能是一个极简的 Node.js 原生 `http` 服务器（或极轻量的 Express/Koa/Hono），它只做两件事：
  1. 静态托管 `@omm/web` 已经**预编译好的 `dist` 目录**。
  2. 提供一个纯内存的 `GET /api/document` 路由。

### 决策记录
* **决策结果**: 坚决采纳极简架构。参考著名开源白板项目 **Excalidraw** 的发版架构：CLI 的生产环境**绝对禁止**携带 Vite 等前端开发服务器。`local-preview-server` 仅实现为一个极其轻量的 Node.js 静态文件服务器（Static Server），专门用来托管 `@omm/web` 提前构建好的 `dist/` 产物。
* **决策理由**: 我刚刚通过联网查阅了 Excalidraw 的开源源码库（`github.com/excalidraw/excalidraw`）。它在生产部署时，前端静态资源都是通过 `yarn build` 提前被编译成了原生的 HTML/JS/CSS（存放于 `build/` 目录下），然后依靠 Nginx、Docker 或者极简的 Node.js `express.static` 来提供静态代理服务。这种架构不仅保证了服务的秒级启动，彻底剥离了沉重的构建依赖，还消除了潜在的安全漏洞。这与我们打造极轻量级 `omm` CLI 的诉求完美契合。
* **后续修改文档**: 在 `local-preview-server` 的设计规范中，添加一条强制架构红线（Architecture Redline）：在生产环境 (Production) 中，该服务只允许作为纯静态资源服务器托管预编译的前端资产，禁止运行前端 Dev Server。

---

## 2. 文件监听与自动热重载的过度设计 (File Watcher & Live Reloading) [已决策]

### 发现的问题
`design.md` 的 Server Responsibilities 提到：“optionally watch the file and reload on change”。

### 苏格拉底式问题
* 实现“文件改动自动刷新页面”，意味着我们需要在 CLI 端引入跨平台的文件系统监听库（如 `chokidar`），并且还要在前端和本地服务器之间建立并维护 WebSocket 或 Server-Sent Events (SSE) 通信管道。
* 在 MVP 阶段，我们最核心的链路是“Agent 生成 JSON -> 校验 -> 在内存中生成 `PreviewPayload` -> 启动预览”。对于这种“一次性发牌（Single-shot）”的内存数据，根本不存在可以 Watch 的实体文件。即使是预览 `.omm` 本地文件，用户在修改文件后按一下浏览器键盘的 **F5 (刷新)** 就能重新触发 `GET /api/document` 拿到最新数据。
* 为了一个在 MVP 中极低频的“本地文件修改”场景，去引入庞大的监听体系和双向通信长连接，是否属于严重的**过度设计 (Over-engineering)**？我们是否应该在 Phase 1 阶段彻底砍掉 “watch and reload” 功能，强制要求用户 F5 手动刷新？

### 决策记录
* **决策结果**: 果断砍掉文件监听（Watch）和热重载（Live Reload）需求！在 MVP 甚至未来的完整版本中，`local-preview-server` 都不负责“监控文件变化”。
* **决策理由**: 我联网查阅了 Excalidraw 的底层架构。作为纯客户端（Client-side）优先的白板，Excalidraw 根本没有使用任何 Node.js 后端去 `watch` 本地文件。它完全依赖浏览器的 File System Access API（基于 `browser-fs-access` 库）将文件直接加载到内存中。对于我们的 `omm` 而言，用户极少会用文本编辑器去直接手写或修改复杂的 `.omm` JSON 源码，它主要是由 Agent 自动生成并在浏览器中被消费的。为了一个几乎不存在的“手写修改源码”场景，去引入 `chokidar` 和 WebSocket 长连接，是典型的为了极客自嗨而制造的伪需求。
* **后续修改文档**: 删除 `local-preview-server` 设计文档中所有关于 “watch the file” 和 “reload on change” 的描述。明确规定 MVP 阶段如需重新加载本地修改，请用户直接在浏览器按下 `F5` 手动刷新。

---

## 3. 阻塞终端与进程生命周期的管理 (Process Lifecycle Blocking) [已决策]

### 发现的问题
规范要求 CLI 启动服务器并“Print or return the localhost preview URL”，但没有清晰定义该 Node 进程的后续状态。

### 苏格拉底式问题
* 当 AI Agent（如 Gemini CLI）通过命令行执行了 `omm preview input.json` 后，这个 Node 进程是应该像普通 Web Server 一样**永久阻塞 (Block) 住终端**，直到用户手动按下 `Ctrl+C` 才退出？
* 如果是永远阻塞，对于自动化 Agent 来说，它如何知道预览已经成功启动并可以继续下一步对话？是否应该要求 `local-preview-server` 在成功监听到端口并打印 URL 之后，向标准输出（STDOUT）发送一个特定的生命周期标记（如 `[OMM_SERVER_READY]`），以便让调用它的自动化脚本能够准确捕获启动完成的时机？

### 决策记录
* **决策结果**: 该 Node 进程**应当永久阻塞终端**（不使用 detached fork 制造孤儿进程），但**必须向 STDOUT 打印极其严格的、包含进程 ID (PID) 的可供机器正则解析的 Ready 暗号**（如 `[OMM_SERVER_READY] PID:12345 http://localhost:5173`）。
* **决策理由**: 您的建议极为敏锐且极具工程价值！我刚刚重新联网查阅了 MCP (Model Context Protocol) 协议的底层生命周期管理规范。对于通过 `stdio` 挂载的子进程服务器，无论是 Claude Desktop 还是其他 Agent，如果想要“干净地终止”服务而不留下僵尸进程，最底层的手段就是向该子进程发送 `SIGTERM` 或 `SIGKILL` 信号。通过在标准的握手协议中直接把服务器当前的 `process.pid` 暴露给 Agent，自动化脚本不仅能精确捕获“启动成功”的时机，还能直接拿到这把“安全终止的钥匙”。这就形成了一个完美的自动化闭环：Agent 后台拉起服务 -> 正则匹配拿到 URL 和 PID -> 回答用户问题 -> 对话结束时根据 PID 精准击杀服务进程。
* **后续修改文档**: 在 `local-preview-server` 的规范和任务列表中，明确补充“生命周期管理与包含 PID 的标准输出（STDOUT）握手协议”。强制要求在 Express/http 服务器的 `listen` 回调中，必须固定打印 `[OMM_SERVER_READY] PID:<process.pid> <URL>`。