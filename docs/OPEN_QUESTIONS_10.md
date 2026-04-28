# 开放性问题 (Readonly SVG Renderer 设计)

本文件记录对 `@openspec/changes/readonly-svg-renderer/**` 提案与设计进行审查后发现的架构设计缺陷、前后矛盾及待决策点。

---

## 1. 过期的中心图网络加载逻辑 (Outdated Center Visual Logic) [已作废/已澄清]

### 发现的问题
在 `readonly-svg-renderer/design.md`、`spec.md` 和 `tasks.md` 中，仍在大篇幅描述：“browser-loaded controlled SVG supplied by `PreviewPayload.centerVisual.svgUrl`... If `svgUrl` is present... the browser may fetch it asynchronously...”。

### 苏格拉底式问题
* 这是在我提出问题前产生的一个假想矛盾。因为在前面 `ai-svg-center-visual` 的决策（问题 9 的最终定调）中，我们最终决定了**CLI 仅负责透传受控白名单的 URL Link**，由**前端浏览器负责异步网络加载及失败降级 (Fallback)**。
* 因此，渲染器模块的设计文档中保留的“由浏览器发起 Fetch”的逻辑实际上是**完全准确**且符合最新架构决策的。

### 决策记录
* **决策结果**: 此问题作废。`readonly-svg-renderer` 目前对于中心图加载职责的划分（浏览器端处理 Fetch、跨域及兜底）被确认为最终架构。
* **决策理由**: （见问题 9 的探讨）因为图片来源已经是安全的受控白名单，浏览器拥有比 CLI 更完善的异步网络处理与无缝降级体验（Fallback），将其直接作为 Link 渲染是兼顾体验与 CLI 轻量化的最佳方案。
* **后续修改文档**: 无需针对此问题修改渲染器模块的说明。

---

## 2. 启发式布局与防重叠的过度简化风险 (Heuristic Layout vs Collision Detection) [已决策]

### 发现的问题
`design.md` 的 Layout Strategy 提到：“MVP layout can be deterministic and heuristic... The MVP does not need perfect global optimization. It must avoid obvious overlap for representative fixtures...”。

### 苏格拉底式问题
* 博赞有机导图的视觉难点就在于“非线性的锥形曲线+沿曲线排版的文字极易发生交叉”。仅仅依赖“分配扇形区间（branch sector）”这种极其简单的启发式规则，真的能解决节点稍微多一点时的拥挤问题吗？
* 如果我们在渲染引擎中为了赶 MVP 进度而过度简化，直接砍掉了 `TECH_DESIGN.md` 曾严肃规划过的“局部拉开与碰撞检测（Collision Detection）”阶段，生成的导图是不是会经常出现线条穿透文字的灾难性画面，从而让用户对“极致复刻手绘有机美学”的核心愿景失去信心？

### 决策记录
* **决策结果**: 坚决摒弃仅靠“启发式扇形分配”的过度简化方案，**MVP 必须加一层基础的包围盒防碰撞算法 (Bounding Box Collision Detection)**。
* **决策理由**: 博赞法则的视觉核心是“有机与优美”。锥形曲线和文本的非线性特征决定了，一旦层级加深，简单的扇形角度分配（Heuristic Layout）根本压不住“文字与线条交织穿模”的灾难性画面。如果第一版 MVP 生成的图到处都是遮挡和穿刺，那“AI 赋能思维导图”的惊艳感将荡然无存。因此，即使是 MVP，排版引擎也必须计算每个带有随机扰动（曲率、角度）节点的基础包围盒，并实现基础的防重叠推演（如局部边界推挤），这是保住“视觉尊严”的绝对底线。
* **后续修改文档**: 在 `readonly-svg-renderer` 的设计和任务规范中，删去“The MVP does not need perfect global optimization”这种为妥协铺路的措辞，明确增加“实现基于包围盒（Bounding Box）的基础防碰撞与交叉检测”的核心子任务。

---

## 3. DOM 文本测量的性能陷阱 (DOM Text Measurement Thrashing) [已决策]

### 发现的问题
规范要求使用 “Browser DOM/SVG text measurement adapter” 来作为排版系统真实长度的数据来源，但并未指明技术细节。

### 苏格拉底式问题
* 在计算出曲线的控制点和最终排版位置之前，引擎必须知道每一段概念文本的真实物理宽度。如果采用传统的 SVG/DOM 测量法（即：在后台偷偷把几百个不可见的 `<text>` 节点挂载进真实的 DOM 树中，再循环调用 `getBBox()`），这会高频触发浏览器的“强制同步重排（Forced Synchronous Layout / Layout Thrashing）”，使得原本毫秒级能算完的布局卡顿好几秒。
* 我们是否应该在渲染器规范中做出性能防线设计？比如：强制要求使用在内存中独立运行的 Canvas 2D API (`CanvasRenderingContext2D.measureText()`) 来预估文字的宽度，从而彻底隔离真实 DOM 树的重排性能损耗？

### 决策记录
* **决策结果**: 坚决弃用传统的 SVG/DOM 挂载测量法，**强制要求渲染引擎的文本测量适配器（Text Measurement Adapter）使用纯内存计算的 `CanvasRenderingContext2D.measureText()` API。**
* **决策理由**: 性能即体验。由于我们在问题 2 中决定了引入包围盒与防碰撞算法，这意味着需要在布局引擎的循环中对成百上千条短语进行密集的几何预估。如果在如此高频的计算环节中混入对真实 DOM 的写（挂载不可见节点）与读（`getBBox()`）操作，将引发灾难级的“强制同步重排（Layout Thrashing）”，瞬间冻结浏览器主线程。而使用离线的 Canvas 2D API 进行文本测量，不仅能极速返回高精度的宽度数据以供碰撞引擎推演，且完全不触碰渲染树，彻底消灭了性能瓶颈。其带来的极其微小的亚像素误差（Sub-pixel Difference）在容错度极高的“锥形有机手绘风”和非线性曲线下是完全不可见的，这可以说是一个完美的工程防线。
* **后续修改文档**: 在 `readonly-svg-renderer` 的设计文档（`design.md` 和 `spec.md`）中，明确指明使用 `Canvas 2D API` 作为文本物理长度的预估测量源，并在排版推演阶段严禁任何形式的真实 DOM 操作。

---

## 4. 受控随机性对合法布局的破坏 (Seed Perturbation vs Layout Legality) [已决策]

### 发现的问题
设计中提到使用 `organicSeed` 派生随机小扰动：“branch curvature, taper ratio, small control point offsets”，但同时强行规定：“The seed must not change layout legality or cause overlap”。

### 苏格拉底式问题
* 如果引擎先按照严丝合缝的数学模型算好了每个节点安全的 Bounding Box（包围盒）并完成了无碰撞排版，随后再应用 Seed 去随机扭曲分支曲线和改变控制点，我们怎么在数学上绝对保证“被扭曲和抖动后的文字与线条”不会侵入别人的安全区？
* 这个随机扰动是作为一个极小幅度的视觉滤镜（例如：扭曲的极值被严格限制在分支原始包围盒的内部边界里），还是说随机抖动必须被置入碰撞检测引擎的每次迭代计算中去？如果不界定清楚，这句“must not cause overlap”很可能变成一句无法落实的空话。

### 决策记录
* **决策结果**: 明确排版流水线的先后顺序：**先基于 Seed 扰动生成节点的几何参数（如曲线弯曲度、分支的初始出射角度、长度偏好等），然后再将这些带扰动的参数投入到碰撞检测和排版引擎中进行计算。**
* **决策理由**: 您的理解非常精确，必须是“先扰动，进而影响排版”。这其中尤为关键的是**分支的角度**：如果在排版后再去微调角度，哪怕是 1 度的偏差在长分支末端也会导致巨大的位移并引发碰撞。而如果让 Seed 首先决定这一根分支天生是“偏长、向下弯曲且出射角度偏移了 2 度”的，排版引擎在计算它的包围盒（Bounding Box）时，就会按照它这套“自带属性”的形态去分配安全扇区。这样推演出的最终布局天然就容纳了所有的有机扰动，从数学原理上彻底杜绝了“随机扰动破坏合法布局”的可能性。
* **后续修改文档**: 在 `readonly-svg-renderer` 的规范和任务中，明确排版生命周期的顺序：Seed 参数实例化（包含曲率、角度、长度扰动） -> 几何形态包围盒生成 -> 碰撞检测与全局布局。