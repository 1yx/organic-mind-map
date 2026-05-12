# 开放性问题 (Concise List JSON Input 设计)

本文件记录对 `@openspec/changes/concise-list-json-input/**` 提案与设计进行审查后发现的架构冗余风险、交互体验隐患及待决策点。

---

## 1. “内容的二级/三级列表”的终极形态：双重契约是否过度设计？ [待决策]

### 发现的问题
该提案引入了一个名为 `ConciseListJSON` 的极简格式，旨在降低大模型（LLM）生成复杂 JSON 的负担。

### 苏格拉底式问题
* 我们在 `OPEN_QUESTIONS_5.md` 和 `15.md` 中已经对 `OrganicTree` 契约进行了极限精简：强制限制为 3 层嵌套、删除了 `rawInput`、引入了简单的单位宽度校验。
* 目前的 `OrganicTree` 结构（`center`, `branches: [{concept, children: [...]}]`）已经非常接近所谓的“多层级列表”了。
* **核心抉择**：在 `OrganicTree` 已经足够精简的情况下，额外引入一个允许“混合字符串与对象数组”的 `ConciseListJSON` 格式并为此编写转换器，是真的能显著提升大模型的成功率，还是仅仅增加了代码库的维护负担（双重校验、双重类型定义）？我们是否应该让大模型直接一步到位输出 `OrganicTree`？

---

## 2. 命令行传参 (`--concise-list-json`) 的物理极限与引号地狱 [待决策]

### 发现的问题
提案计划通过 CLI 参数传递 JSON 字符串：`omm preview --concise-list-json '<json_string>'`。

### 苏格拉底式问题
* 当用户处理一篇长达万字的文章总结时，生成的 `OrganicTree` 哪怕只有 3 层，其 JSON 字符串也可能达到数 KB 甚至更大。通过 shell 参数传递如此巨大的字符串，是否会触及某些操作系统的命令行长度限制？
* 在 Windows (CMD/PowerShell) 和 Unix-like (Bash/Zsh) 之间，JSON 内部的双引号与 shell 的单引号嵌套处理极其脆弱。如果 Agent 生成的文本中带有单引号或特殊转义字符，用户敲下命令时是否会频繁遭遇“解析失败”？
* **建议**：是否应该将 `--concise-list-json` 这种“传字符串”的方式降级为调试选项，而将“读取本地 JSON 文件”或“管道输入 (stdin)”作为 Agent 调用的首选稳健方案？

---

## 3. 缺失的元数据传递通道 [待决策]

### 发现的问题
`design.md` 规定转换规则为 `OrganicTree.title = root.concept`。

### 苏格拉底式问题
* `OrganicTree` 契约中包含了 `meta.sourceTitle` 和 `meta.sourceSummary` 等有助于上下文理解的元数据字段。
* 在 `ConciseListJSON` 的定义中，似乎为了追求“极致简洁”而丢弃了这些元数据字段。
* 如果 Agent 想要在生成导图的同时，保留对源文档的简短描述或原始标题信息，目前的 `ConciseListJSON` 结构无法承载。
* **决策点**：我们是否应该为 `ConciseListJSON` 增加一个可选的 `meta` 对象？还是说，对于这种需要“复杂元数据”的场景，Agent 就必须退回到使用标准的 `OrganicTree` 契约？
