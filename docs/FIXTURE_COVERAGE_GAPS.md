# 开放性问题 (测试用例覆盖盲区审查)

本文件基于最新的底层架构设计与 13 份 `OPEN_QUESTIONS` 的终局决策，对当前代码库中已有的 `fixtures/` 测试用例集进行了一次全局的“压力审查”，以暴露出那些**可能被遗漏、但却极有可能引发生产环境灾难的盲区**。

---

## 1. 针对渲染防重叠引擎的“碰撞压力测试”缺失 (Collision Stress Fixtures)

### 现状
目前 `fixtures/organic-tree/` 中存在 `valid-deeper-hierarchy.json` 和 `valid-chinese.json`。这些正常的结构虽然能测试渲染器是否能“画出图”，但它们太“温柔”了，无法暴露 `OPEN_QUESTIONS_10.md` 中我们刚刚决定的**包围盒防重叠算法 (Bounding Box Collision Detection)** 是否真的生效。

### 遗漏的盲区 (Gaps)
* **极端拥挤的同级兄弟节点测试 (`stress-extreme-siblings.json`)**
  我们需要构造一个让渲染引擎“感到窒息”的数据：一个父节点下，挂载了 **10~15 个极其冗长的子节点**（每个概念文本都逼近 25 个单位宽度的极限）。如果防碰撞算法没有工作，这些分支必定会像乱麻一样互相穿刺重叠。只有能通过这个压力测试，才能证明我们的 Bounding Box 算法经受住了实战考验。
* **单侧重力失衡测试 (`stress-unbalanced-tree.json`)**
  假设大模型生成的导图，右侧只有 1 个节点，而左侧有 20 个节点。这种极度不平衡的结构极易打破启发式极坐标扇形的均分规则，导致画布一边空白、一边挤爆。这同样需要专门的 Fixture 来防范。

---

## 2. 针对前端降级与安全的“毒药数据”缺失 (Poison Fixtures for Frontend Fallback)

### 现状
我们在 `cli-preview` 中有了 `svg-url-non-allowlisted.json`（测试 CLI 白名单拦截）以及新加的 `valid-unreachable-svg-url.json`（测试 404 死链降级）。

### 遗漏的盲区 (Gaps)
* **XSS / 协议注入攻击测试 (`poison-xss-protocol.json`)**
  如果在 `svgUrl` 或文本节点里被大模型或者恶意输入塞入了 `javascript:alert(1)`、`data:text/html,...` 等非法伪协议，我们的前端是否能像铁桶一样把它拦截，并安静地显示内置图，而不是触发浏览器的脚本执行？
* **超大空包攻击导致的内存溢出 (`poison-massive-whitespace.json`)**
  一个体积高达 10MB，但里面全都是空格或无效嵌套层级的 JSON 文件。我们要测试 CLI 阶段的 JSON 解析器和 `OrganicTree` 的校验器是否会直接抛出内存溢出（OOM），我们是否需要配置严格的流式 `Payload` 字节体积上限（如限制不能超过 100KB）？

---

## 3. `.omm` 导出格式校验的“运行时产物”漏网之鱼 (Runtime Artifacts in Document Export)

### 现状
`fixtures/omm/` 下有很多不错的测试，比如 `invalid-uploaded-base64-assets.json` 和 `invalid-missing-layout.json`，这证明我们禁止了巨大的位图存入文件，且要求保存布局坐标。

### 遗漏的盲区 (Gaps)
* **包含外部 Web 字体定义的违规数据 (`invalid-web-fonts-declaration.json`)**
  我们在 `OPEN_QUESTIONS_12.md` 中立下了铁律：**整个渲染系统绝对禁用任何 Web Font，必须采用系统字体**，以防止 Canvas 导出时排版崩溃穿模。那么我们就应该拥有一个 `.omm` 的反向测试用例：在这个文件的 `meta` 或文本节点样式中，试图挂载并引入谷歌字体（Google Fonts）的外部引用。前端在加载这个文件并试图渲染时，应当**极其粗暴地抹除掉这些字体定义**，强行退回系统安全字体。
* **缺少 `organicSeed` 的文件 (`invalid-missing-seed.json`)**
  既然导图形态的随机扰动全靠内容哈希派生，那么 `.omm` 在被保存的那一刻，`organicSeed` 是否被正确地序列化在了文件里？我们需要一个丢失 Seed 的错误用例，来确保这种残缺文件在被读取时能够报错，或重新计算哈希补全。

---

## 4. 目录与认知包袱的遗留 (Directory Structure Debt)

正如 `OPEN_QUESTIONS_13.md` 中所提，尽管文档中的决策已经下达，但目前的实体物理目录依然是：
* `fixtures/organic-tree/`
* 其内部依然有 `valid-deeper-hierarchy.json` 这种与 `OrganicTree` 概念割裂的文件分类。

这提醒我们，在正式切换回代码分支前，必须通过一段简单的 shell 脚本（如 `mv fixtures/organic-tree fixtures/organic-tree`）来完成实体文件的物理大清洗！

---

### 总结
目前的 Fixtures 体系整体非常健康，但依然处于“防君子不防小人”、“测连通但不测极限”的阶段。为了捍卫我们在 `OPEN_QUESTIONS` 里立下的那些铁血架构防线（防重叠、系统字体、纯本地渲染、网络死链降级），我们**强烈建议**在接下来的开发计划中，补齐上述四大类型的极限施压测试用例！