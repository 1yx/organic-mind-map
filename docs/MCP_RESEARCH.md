# MCP 调研报告: 绘图类 Agent 插件的交互架构

本报告深度分析三个参考项目（Excalidraw MCP、Excalidraw Core、MCP Mermaid），并将其架构决策与我们 Organic Mind Map 项目的历史决策进行交叉验证。

---

## 1. 绘图类 MCP 的两大流派

### 流派 A：文本驱动（Mermaid 模式 / Text-to-Render）

- **交互逻辑**：`LLM 生产 DSL 文本 -> MCP 接收 -> 后台调用 Headless 浏览器 -> 布局引擎计算排版 -> 返回图片`
- **特点**：
  - Agent 零认知负担：大模型不需要知道任何坐标，只需输出逻辑关系
  - 排版黑盒化：布局算法完全封闭在渲染引擎内部
  - 重依赖：需要 Playwright/Chromium 进行服务端渲染

### 流派 B：语义到空间驱动（Excalidraw 模式 / Semantic-to-Spatial）

- **交互逻辑**：`LLM 描述节点与边 -> MCP 内部运行布局算法 -> 计算坐标与尺寸 -> 生成 JSON -> 前端渲染`
- **特点**：
  - 高度可编辑：生成的是具有精确坐标的矢量对象
  - 空间感知：Agent 需要理解坐标系和尺寸
  - 轻依赖：不需要 Headless 浏览器

### Organic Mind Map 的定位

OMM 是流派 A 和 B 的混合体：
- 模型只输出语义结构（OrganicTree），不输出坐标 → 流派 A 的思想
- 浏览器端执行自动布局算法，生成有机分支路径 → 流派 B 的思想
- 不需要 Headless 浏览器 → 流派 B 的优势

---

## 2. 参考项目深度分析

### 2.1 Excalidraw MCP — 流式 SVG 渲染架构

**项目地址**：github.com/nicholasgriffintn/excalidraw-mcp-app
**定位**：让 LLM 通过 MCP 协议直接生成 Excalidraw 图表，支持流式渲染和迭代编辑。

#### 架构总览

```text
LLM 调用 read_me（获取 cheat sheet）
  -> LLM 生成 Excalidraw elements JSON（绝对坐标）
  -> LLM 调用 create_view（传入 JSON 字符串）
  -> Server 校验大小（5MB）、解析 JSON、解析 checkpoint 引用
  -> 返回 checkpointId
  -> MCP Host 流式推送 partial input 到 Widget
  -> Widget 解析 partial JSON、转译为 Excalidraw 元素、调用 exportToSvg
  -> morphdom diff-and-patch 更新 SVG DOM（增量渲染）
  -> 最终渲染完成后截图 PNG 返回给模型上下文（model can see and iterate）
```

#### 关键设计决策

**1. 模型必须先读 cheat sheet 再画图**

Server 暴露 5 个工具：`read_me`、`create_view`、`export_to_excalidraw`、`save_checkpoint`、`read_checkpoint`。模型必须先调用 `read_me` 获取约 400 行的元素格式参考（颜色板、坐标系、完整 JSON 示例），然后才能正确调用 `create_view`。这与我们的 `SKILL.md` 设计思路一致：通过指令文件约束 Agent 输出格式。

**2. 流式增量渲染（核心亮点）**

Excalidraw MCP 实现了极致的流式渲染体验：
- `ontoolinputpartial` 处理部分 JSON：尝试 `JSON.parse`，失败则找到最后一个 `}` 并闭合数组
- 丢弃可能不完整的最后一个元素（`excludeIncompleteLastItem`）
- 仅在元素数量变化时触发重新渲染（不是每个 partial 都渲染）
- 使用 `morphdom` 做 SVG DOM 的 diff-and-patch，保留已有元素的动画状态
- 流式阶段使用随机 seed 产生手绘动画效果，最终渲染使用稳定 seed

**3. 绝对坐标定位（无自动布局）**

Excalidraw MCP 不提供任何自动布局能力。每个元素都有显式的 `x`, `y`, `width`, `height`。通过 `cameraUpdate` 伪元素控制视口：
```json
{ "type": "cameraUpdate", "width": 800, "height": 600, "x": 0, "y": 0 }
```
视口动画使用线性插值（lerp），速度 0.03/帧，强制 4:3 宽高比。

**4. 三层 Checkpoint 存储**

| 实现 | 场景 | 持久化 | 淘汰策略 |
|---|---|---|---|
| FileCheckpointStore | 本地 dev/stdio | `$TMPDIR/excalidraw-mcp-checkpoints/` | 超过 100 个文件时删除最旧 |
| MemoryCheckpointStore | Vercel 无 Redis | 内存 Map | FIFO，超过 100 条 |
| RedisCheckpointStore | Vercel + Upstash | Redis，key 前缀 `cp:` | 30 天 TTL |

这支持了迭代编辑：模型可以通过 `restoreCheckpoint` 加载之前的状态，通过 `delete` 伪元素删除指定 ID 的元素，然后添加新元素。

**5. 导出：加密上传到 excalidraw.com**

不生成下载文件。导出流程：
- 序列化为 JSON → zlib 压缩 → AES-GCM 加密（随机 128-bit key + 12-byte IV）
- 上传到 `json.excalidraw.com/api/v2/post/`
- 返回 `https://excalidraw.com/#json=${id},${jwk.k}` 分享链接
- Widget 端截取 512px PNG 发送回模型上下文（`app.updateModelContext()`），让模型看到渲染结果并迭代

**6. 伪元素系统**

Excalidraw MCP 创造性地使用"伪元素"来扩展元素数组的控制能力：
- `cameraUpdate`：控制视口位置和大小
- `delete`：按 ID 删除元素（及其绑定文本）
- `restoreCheckpoint`：恢复之前的 checkpoint

这些伪元素不会被渲染，而是在 `convertRawElements()` 阶段被提取和处理。

---

### 2.2 Excalidraw Core — 程序化图表生成 API

**项目地址**：github.com/excalidraw/excalidraw
**定位**：开源手绘风格白板工具。我们重点分析其程序化 API、渲染管线、文本测量、导出机制。

#### 核心数据模型

Excalidraw 使用单一元素数组作为数据模型。基础属性：

```typescript
{
  id: string;           // 唯一标识
  x: number;            // 左上角 x
  y: number;            // 左上角 y
  width: number;
  height: number;
  seed: number;         // roughjs 手绘随机种子
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "hachure" | "cross-hatch" | "solid" | "zigzag";
  roughness: number;    // 0=architect, 1=artist, 2=cartoonist
  // ... 更多属性
}
```

元素类型联合：`rectangle | diamond | ellipse | text | arrow | line | freedraw | image | frame | iframe | embeddable`

完整图表 JSON 格式：
```json
{ "type": "excalidraw", "version": 2, "elements": [...], "appState": {...}, "files": {...} }
```

#### `convertToExcalidrawElements()` — 骨架 API

这是程序化创建图表的主要入口（`packages/element/src/transform.ts`）。接受简化的骨架格式，生成完整的 `ExcalidrawElement[]`：

```typescript
convertToExcalidrawElements([
  { type: "rectangle", x: 100, y: 100, width: 200, height: 100 },
  { type: "text", text: "Hello", x: 150, y: 130 },
  { type: "arrow", x: 300, y: 150, width: 100, height: 0,
    start: { type: "rectangle", id: "..." },
    end: { type: "ellipse" } },
]);
```

特性：自动生成 ID、自动创建绑定文本、自动处理箭头绑定、自动计算 frame 边界。

**对我们的启示**：Excalidraw 的骨架 API 证明了"模型输出简化格式 → 内部转译为完整数据"是可行的。但 Excalidraw MCP 最终选择让模型直接输出完整元素 JSON（而非骨架），因为骨架 API 的抽象层增加了模型的认知负担（需要理解哪些字段会被自动填充）。

#### SVG 渲染管线

```text
renderSceneToSvg(elements, svgRoot, files, opts)
  -> 遍历每个元素
  -> renderElementToSvg(element, root, files, opts)
    -> ShapeCache.generateElementShape(element) // roughjs 生成形状
    -> roughSVGDrawWithPrecision(svgRoot, drawable) // SVG path 输出
  -> 输出 SVG <path>, <text>, <g> 元素
```

Excalidraw MCP 使用 `exportToSvg()` 而非 Excalidraw React Canvas 进行内联渲染。这个选择的关键原因是：SVG 渲染不需要挂载整个 React 组件树，性能更好。

#### 文本测量

Excalidraw 提供了**可插拔的 TextMetricsProvider 接口**：

```typescript
interface TextMetricsProvider {
  getLineWidth(text: string, fontString: FontString): number;
}
```

默认使用 `CanvasRenderingContext2D.measureText()`。服务端可通过 `setCustomTextMetricsProvider()` 注入非浏览器实现（如 `node-canvas`）。

此外有**字符宽度缓存**：`charWidth.calculate(char, font)` 缓存每个 unicode codepoint 的宽度，避免重复测量。

**与我们的对比**：我们也使用 Canvas 2D `measureText()` 进行文本测量，但没有实现字符级缓存和可插拔 provider。这是一个潜在的优化方向。

#### 导出机制

三种公共导出 API：
1. `exportToCanvas()` → `HTMLCanvasElement`：加载字体 → 准备元素 → 计算画布尺寸 → Canvas 渲染
2. `exportToBlob()` → `Promise<Blob>` (PNG/JPEG)：`exportToCanvas()` + `canvas.toBlob()`
3. `exportToSvg()` → `Promise<SVGSVGElement>`：创建 SVG root → 添加字体声明 → roughjs 渲染 → 返回

Node.js 服务端导出示例（`index-node.ts`）：
```javascript
registerFont("./public/Virgil.woff2", { family: "Virgil" });
const canvas = exportToCanvas(elements, appState, {}, opts, createCanvas);
const stream = canvas.createPNGStream();
```

#### 碰撞检测

- `hitElementItself()`：先旋转边界框快速检测，再精确形状交叉
- `isPointInElement()`：光线投射算法（ray-casting），奇偶规则判断内外
- `intersectElementWithLineSegment()`：按元素类型计算线段交点
- `ElementBounds` 类：基于元素版本号的边界缓存

**与我们的对比**：我们的渲染器使用简单的 bounding-box 碰撞检测和局部间距修正。Excalidraw 的方案（旋转感知 + 精确形状交叉 + 缓存）更成熟，但复杂度也更高。

#### 字体处理

Excalidraw 维护了一套复杂的字体系统：
- 字体注册表：Excalifont（默认）、Virgil（弃用）、Helvetica、Cascadia、Nunito 等 9 种
- `FONT_FAMILY` 枚举映射名称到数字 ID
- `FONT_METADATA` 包含每种字体的 `unitsPerEm`、`ascender`、`descender`、`lineHeight`
- SVG 导出时使用 harfbuzz 进行字体子集化（只包含使用的字符）
- 文本换行支持 CJK、emoji、Unicode 感知的软换行

---

### 2.3 MCP Mermaid — Headless 渲染架构

**项目地址**：github.com/hustcc/mcp-mermaid
**定位**：通过 MCP 协议将 Mermaid DSL 转换为图表，支持 6 种输出模式。

#### 架构总览

```text
Agent 调用 generate_mermaid_diagram（传入 DSL + 主题 + 输出类型）
  -> Zod safeParse 校验参数
  -> 根据输出类型选择渲染路径：
     A) base64/svg/file -> mermaid-isomorphic（Playwright + Headless Chromium）渲染
     B) svg_url/png_url -> 编码为 mermaid.ink URL（无需本地渲染）
  -> 返回结果
```

#### 单工具 + 多输出模式设计

MCP Mermaid 只暴露一个工具 `generate_mermaid_diagram`，通过 `outputType` 参数选择输出：

| outputType | 渲染路径 | 返回格式 |
|---|---|---|
| `base64`（默认） | 本地 Playwright | MCP `image` content block |
| `svg` | 本地 Playwright | MCP `text` content block |
| `mermaid` | 不渲染 | MCP `text` content block（原始 DSL） |
| `file` | 本地 Playwright | 写入磁盘，返回文件路径 |
| `svg_url` | mermaid.ink 远程 | 返回 URL |
| `png_url` | mermaid.ink 远程 | 返回 URL |

#### 双渲染路径

**本地渲染**：使用 `mermaid-isomorphic` 库，内部通过 Playwright 启动 Headless Chromium。`MermaidRenderer` 实例作为单例缓存（模块级变量），避免每次请求创建新浏览器实例。

**远程 URL**：将 Mermaid DSL 压缩编码为 URL：
```text
JSON payload -> zlib deflate (level 9) -> Base64URL 编码
-> https://mermaid.ink/<svg|img>/pako:<encoded>
```
这种方式的巧妙之处在于：渲染发生在 mermaid.ink 公共服务上，客户端零依赖。

#### 重试和容错

- 使用 `withRetry()` 包装渲染调用：3 次重试，500ms 基础延迟，指数退避
- 仅对 HTTP 瞬态错误（503, 429, 502, 504）重试
- 非瞬态错误立即抛出
- 所有重试耗尽后抛出最后一次错误

#### 三种传输模式

| 传输层 | 状态管理 | 适用场景 |
|---|---|---|
| STDIO | 无状态，stdin/stdout 管道 | 本地 CLI |
| SSE (Express) | 会话级内存 Map | 远程 HTTP |
| HTTP Streamable | 每请求创建新 Server 实例 | 无状态 HTTP |

---

## 3. 三个项目的架构决策对比

| 维度 | Excalidraw MCP | Excalidraw Core | MCP Mermaid | **Organic Mind Map** |
|---|---|---|---|---|
| **布局方式** | 无自动布局，模型输出绝对坐标 | 无自动布局，所有位置手动 | Mermaid 内部自动布局 | **浏览器端自动有机布局** |
| **模型负担** | 高（需理解坐标系） | N/A | 低（只写 DSL） | **低（只写语义树）** |
| **渲染依赖** | exportToSvg + morphdom | Canvas + roughjs + SVG | Playwright + Chromium | **Canvas text measure + SVG** |
| **文本测量** | Excalidraw 内部（Canvas measureText） | 可插拔 TextMetricsProvider | Mermaid 内部 | **Canvas 2D measureText** |
| **导出路径** | PNG 截图 + excalidraw.com 加密上传 | Canvas PNG + SVG + node-canvas | Playwright PNG + mermaid.ink URL | **浏览器端 Canvas PNG + SVG .omm** |
| **流式支持** | 有（partial JSON + morphdom 增量） | 无 | 无 | **无（Phase 1）** |
| **状态管理** | File/Memory/Redis 三层 Checkpoint | 无（编辑器内部 React state） | 无（每次全新渲染） | **无状态（每次 preview 独立）** |
| **迭代编辑** | 有（checkpoint + delete + restore） | 有（完整编辑器） | 无（每次从头生成） | **无（Phase 1 只读预览）** |
| **错误处理** | 容忍 partial JSON，静默降级 | 完整编辑器错误边界 | Zod safeParse + 重试 | **严格校验 + Agent 反馈循环** |
| **字体策略** | Excalifont CDN + 系统字体 | 9 种注册字体 + 子集化 | Mermaid 内部 | **系统字体栈 only** |
| **安全过滤** | CSP + CORS | N/A | 无 | **svgUrl 白名单 + 安全检查** |

---

## 4. 我们的历史决策 vs 参考项目的做法

### 4.1 移除 PreviewPayload，CLI 只做校验

**我们的决策**：CLI 是 "Validator + Service Starter"，不做语义转换、不分配 ID/颜色/种子、不选择纸张。浏览器直接接收 OrganicTree。

**参考项目的验证**：

| 项目 | 做法 | 验证结果 |
|---|---|---|
| Excalidraw MCP | Server 只做大小校验（5MB）、JSON 解析、checkpoint 解析，不转换元素数据 | ✅ 完全一致 |
| MCP Mermaid | Zod safeParse 校验后直接渲染，不转换 DSL | ✅ 完全一致 |
| Excalidraw Core | `convertToExcalidrawElements` 做骨架→完整转换，但这是 API 级别而非 CLI 级别 | ⚠️ 部分参考价值 |

**结论**：三个参考项目一致验证了我们的决策。没有任何一个 MCP 工具在 CLI/Server 层做语义转换。PreviewPayload 的移除是正确的。

### 4.2 有机种子的确定性 vs 布局快照

**我们的决策**：使用 cyrb53 内容哈希作为确定性种子。`.omm` 文件缺失种子但有布局快照时，只静默回填种子，绝不触发布局重算。

**参考项目的做法**：

| 项目 | 种子/确定性机制 |
|---|---|
| Excalidraw Core | 每个元素有 `seed` 属性，用于 roughjs 的手绘抖动确定性。`version` + `versionNonce` 跟踪变更。`ShapeCache` 以元素为 key 缓存形状。 |
| Excalidraw MCP | 流式阶段使用随机 seed（动画效果），最终渲染使用原始 seed（稳定外观）。Checkpoint 存储完整元素状态包括 seed。 |
| MCP Mermaid | 无种子概念。每次渲染都是全新的（Mermaid 内部确定性由算法保证，非外部种子）。 |

**启示**：
- Excalidraw 的 `seed` 是 per-element 的，我们的是 per-document 的（cyrb53 整体哈希）。per-document 更简洁，但如果未来需要局部更新（如迭代编辑），per-element 会更灵活。
- Excalidraw MCP 的"流式随机 seed + 最终稳定 seed"策略值得在未来流式渲染场景中参考。
- 我们的"只回填种子不重算布局"决策与 Excalidraw 的 `ShapeCache` 缓存理念一致：避免不必要的重计算。

### 4.3 系统字体策略（禁止 Web Fonts）

**我们的决策**：严格使用系统字体栈，`.omm` 文件中出现非系统字体直接拒绝。

**参考项目的做法**：

| 项目 | 字体策略 |
|---|---|
| Excalidraw Core | 9 种注册字体，SVG 导出时用 harfbuzz 子集化，`FONT_METADATA` 存储精确 metrics |
| Excalidraw MCP | Excalifont 从 CDN 加载，预加载 Assistant 字体（3 个字重），CSP 允许 esm.sh |
| MCP Mermaid | Headless Chromium 渲染，字体由系统/Mermaid 内部处理 |

**分析**：
- Excalidraw 的复杂字体系统是为了保证手绘美学和跨平台一致性。他们甚至有 `ExcalidrawFontFace` 自定义类继承浏览器 `FontFace`。
- MCP Mermaid 使用 Headless 浏览器，天然拥有完整的字体渲染能力，不需要特殊处理。
- 我们的系统字体策略是最简方案，但在 PNG 导出时可能有字体差异（不同系统的 system-ui 不同）。Excalidraw 的 `FONT_METADATA` 方案（存储精确 ascender/descender/lineHeight）值得未来参考，以确保文本测量的跨平台一致性。

### 4.4 外部 SVG 安全处理

**我们的决策**：`center.svgUrl` 白名单过滤从 CLI 移到 renderer，浏览器异步加载 + 安全检查，失败则降级到内置模板。

**参考项目的做法**：

| 项目 | 外部内容安全 |
|---|---|
| Excalidraw MCP | CSP 限制只允许 esm.sh，导出时使用 AES-GCM 加密上传，不做 SVG 安全过滤（Excalidraw 本身不加载外部 SVG） |
| MCP Mermaid | 不处理外部图片/字体。mermaid.ink URL 是公共只读服务，无安全风险 |
| Excalidraw Core | 图片元素支持，但无特殊 SVG 安全检查 |

**分析**：三个项目都不需要处理"从不可信来源加载 SVG"的场景。我们的白名单 + 异步加载 + 安全检查 + 降级回退方案比参考项目更保守，但这是正确的——因为思维导图的 center visual 可能包含任意 SVG 内容，安全风险更高。

### 4.5 Agent 输出格式约束

**我们的决策**：通过 `SKILL.md` 指令文件约束 Agent 直接输出 OrganicTree JSON。模型不输出坐标、ID、颜色、种子。

**参考项目的做法**：

| 项目 | Agent 输出约束 |
|---|---|
| Excalidraw MCP | 400 行 `read_me` cheat sheet，约束模型输出 Excalidraw 元素 JSON（**含绝对坐标**） |
| MCP Mermaid | 无特殊约束，模型直接输出 Mermaid DSL 语法 |

**关键对比**：
- Excalidraw MCP 要求模型理解坐标系并输出 `x, y, width, height`，这是高认知负担的设计。Excalidraw 的 `convertToExcalidrawElements()` 骨架 API 本可以降低负担，但 MCP 集成没有使用它。
- 我们的 OrganicTree 完全不含空间信息，模型负担最低（只输出语义层级结构）。
- MCP Mermaid 的 DSL 也是纯语义的（如 `graph TD; A-->B`），与我们的思路一致。

**结论**：我们的设计在 Agent 认知负担方面是最优的——比 Excalidraw MCP 更低（不需要坐标），与 MCP Mermaid 相当（纯语义输出），但输出的是结构化 JSON 而非 DSL。

---

## 5. 架构模式总结与未来方向

### 我们已验证的正确决策

1. **CLI = Validator + Service Starter**：三个参考项目一致验证。
2. **消除 PreviewPayload 中间层**：没有任何参考项目使用类似中间层。
3. **模型只输出语义结构**：与 MCP Mermaid 一致，优于 Excalidraw MCP 的坐标输出。
4. **浏览器端自动布局**：比 Excalidraw MCP 的手动坐标更智能，比 MCP Mermaid 的黑盒布局更可控。
5. **确定性内容哈希种子**：与 Excalidraw 的 per-element seed 理念一致，我们用更简洁的 per-document 方案。
6. **严格校验 + Agent 反馈循环**：比 Excalidraw MCP 的容忍式解析更严格，适合我们的校验优先架构。

### 值得未来借鉴的模式

| 模式 | 来源 | 潜在用途 |
|---|---|---|
| morphdom 增量 SVG 渲染 | Excalidraw MCP | Phase 2 流式渲染时的 DOM 增量更新 |
| 流式 partial JSON 解析 | Excalidraw MCP | Agent 流式输出时的实时预览 |
| Checkpoint 存储系统 | Excalidraw MCP | Phase 2 迭代编辑场景 |
| 可插拔 TextMetricsProvider | Excalidraw Core | 服务端文本测量或跨平台一致性 |
| 字符宽度缓存 | Excalidraw Core | 渲染性能优化 |
| mermaid.ink 风格的 URL 编码 | MCP Mermaid | 可能的 .omm 文件分享机制 |
| 指数退避重试 | MCP Mermaid | 外部 SVG 加载失败时的重试策略 |
| per-element seed | Excalidraw | Phase 2 局部更新时的细粒度确定性 |
| FONT_METADATA 精确 metrics | Excalidraw Core | 跨平台文本测量一致性 |
| `delete`/`restoreCheckpoint` 伪元素 | Excalidraw MCP | Phase 2 迭代编辑的控制协议 |

### 我们不需要的模式

| 模式 | 来源 | 不适用的原因 |
|---|---|---|
| Headless 浏览器渲染 | MCP Mermaid | 我们用浏览器端原生渲染，不需要 Playwright |
| 绝对坐标输出 | Excalidraw MCP | 我们有自动布局引擎 |
| Web Font CDN 加载 | Excalidraw MCP | 我们严格使用系统字体 |
| 加密分享链接 | Excalidraw MCP | Phase 1 是本地预览，不需要云分享 |
| harfbuzz 字体子集化 | Excalidraw Core | 系统字体不需要子集化 |
