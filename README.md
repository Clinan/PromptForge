# 项目名称
**PromptForge**

## 1. 项目定位与目标

**定位**：PC Web 端的「大模型调试台」，支持**多模型并行对比**、**系统提示词快速迭代**、**工具调用可视化**、**一键导出 curl**、**本地历史追溯**。
**核心价值**：用同一份 *User Prompt + Tools*，快速对比不同模型/不同系统提示词的输出与耗时指标。

**非目标**（明确边界，避免膨胀）：账号体系、云端存储、多人协作、服务端代理（除非未来加可选轻后端）。

---

## 2. 页面结构（建议的信息架构）

> 💡 想要接入新的模型厂商？请参考《[插件接入指南](docs/PLUGIN_INTEGRATION.md)》，包含统一插件接口说明和阿里云 DashScope 示例。
> 已预置的插件：OpenAI 兼容、阿里云 DashScope、Kimi（Moonshot）、方舟 Ark，直接在 Slot 中选择即可使用。

### 2.1 调试页（主页面）

* 顶部工具栏：

  * Provider 选择（平台厂商）
  * Run（运行所选模型）、Run All（全部运行）、Stop（中止流式）
  * 历史（History 抽屉/页面入口）
  * 设置（插件管理、参数默认值、存储与清理）
* 中间编辑区（Prompt Studio）：

  * **System Prompt 区：可增删的“模型卡片/槽位（Slot）”列表**

    * 每个 Slot = {Provider、Model、System Prompt(大输入框)、参数覆盖、运行按钮、导出 curl}
  * **Shared 区：统一的 User Prompt（大输入框）+ Tools 定义（JSON/TS Schema）**
* 右侧输出区（Output Console）：

  * 按 Slot 分 Tab 或分卡片展示
  * 支持流式输出 + 指标 + 工具调用记录 + 原始请求/响应

### 2.2 历史页/抽屉（History）

* 列表：时间、标题/备注、Provider、Model、Star、耗时、tokens、是否有 tool call
* 搜索/筛选：关键字、Star、平台、模型、时间范围
* 详情：一次调试的完整输入（system/user/tools/params）+ 输出（流式拼接后的最终文本、tool calls、metrics）

---

## 3. 功能需求细化（对应你的 5 条）

### 需求1：系统提示词调试（多 Slot）

**功能点**

1. 支持创建多个“模型调试槽位 Slot”

   * 每个 Slot 有一个**更大的 System Prompt 输入框**
   * Slot 可新增/删除/复制（复制当前 Slot 方便改一点点做 A/B）
2. Shared：所有 Slot 共用

   * 同一份 **User Prompt**
   * 同一份 **Tools 定义**（function calling / tool schema）
3. 运行方式

   * Run：运行当前 Slot
   * Run Selected：勾选多个 Slot 后一键并发运行
   * Run All：全部 Slot 并发运行
4. 中止：Stop 可中断流式（AbortController）

**交互建议**

* Slot 头部展示：Provider 下拉、Model 下拉、运行按钮、导出 curl、删除/复制
* System Prompt 编辑器建议用带行号/JSON 高亮的编辑器（monaco / codemirror），体验会差很多就靠它兜底。

---

### 需求2：多平台接入 + 插件化 + 指标展示

**2.1 插件化接入（纯前端可落地）**

* 内置插件（预置）：

  * `OpenAI-Compatible (Chat Completions)`（强烈建议先做这个，覆盖面大）
  * 可选第二个：`OpenAI Responses API`（如果你们后续要跟进新接口）
* 自定义插件（建议做成“配置型插件”，别让用户写 JS 执行代码，安全/维护成本会爆）

  * 用户用 UI 填：请求 URL、鉴权方式、模型列表获取方式、请求体映射、流式解析方式（SSE/Chunk/Non-stream）
  * 保存为 JSON（本地），注册到插件列表里

**2.2 平台能力要求（插件统一接口）**
每个插件最少提供：

* `listModels(config) -> ModelInfo[]`
* `invokeChat(config, request, {stream}) -> Stream | Promise`
* `buildCurl(config, request) -> string`

其中 request 为统一结构（你们内部标准），插件负责转换为平台格式。

**2.3 常用模型参数**

* 全局默认参数（Shared Defaults）：

  * temperature、top_p、max_tokens、stop、presence_penalty、frequency_penalty、seed（可选）
* Slot 覆盖参数（Override）：

  * 允许某个 Slot 覆盖默认参数（更利于对比）

**2.4 输出与指标**

* 流式输出展示（逐 token / chunk）
* 指标（至少）：

  * 首包耗时 TTFB（从点击 Run 到首个 chunk 到达）
  * 总耗时（request start -> stream done）
  * tokens（prompt / completion / total，如平台返回）
  * tool 调用列表（调用了哪些 tools、参数、结果摘要）
* 额外建议：

  * 展示“请求体预览（已渲染变量）/响应 raw”，方便排查平台差异

---

### 需求3：localStorage 保存厂商配置

**存储内容（按 Provider Profile）**

* 平台名称（profile name）
* apikey
* baseUrl（OpenAI-compatible 必填）
* 选择的协议插件（pluginId）
* 额外 headers（可选）
* （可选）organization / project 等平台字段

**安全提示（前端必说清）**

* API Key 放 localStorage 有风险（被同域脚本读取）
* 提供一键“清空本地密钥/导出配置/导入配置”

---

### 需求4：本地历史 + Star + 载入回放

**4.1 何时写入历史**

* 每次点击 Run（任一 Slot）都生成一条 history item
* 多 Slot 并发 Run：建议拆成多条（更清晰），或者一条里包含多 Slot 输出（看你更偏“实验批次”还是“单次调用”）

**4.2 历史列表能力**

* 展示摘要：时间、标题、Star、Provider、Model、TTFB、total、tokens
* 支持：

  * Star/Unstar
  * 重命名（给历史加标题/备注）
  * 删除（单条/批量）
  * 搜索筛选（关键字、Star、模型、平台）

**4.3 从历史载入到当前调试页**

* 载入策略（满足你提的弹窗逻辑）：

  1. system prompt：**总是**以历史为准

     * 如果历史里有 N 个 system prompt（或该条对应某个 Slot），则在当前页面自动新增 Slot 并填充
  2. user prompt / tools：弹窗询问

     * ✅ 使用历史覆盖当前
     * ✅ 保留当前不变
* 载入后再 Run：输出作为“新历史”（不覆盖旧的）

**4.4 存储介质建议**

* 配置（profiles）用 localStorage ✅
* 历史（history）用 IndexedDB

---

### 需求5：System Prompt 一键导出 curl

**入口**

* 每个 Slot 的 system prompt 卡片右上角：`Export cURL`

**行为**

* 弹出 Modal：

  * 只读多行文本框（curl）
  * Copy 按钮
  * 可选：显示对应插件、baseUrl、模型名、参数（便于确认）

**注意**

* curl 里默认带 `Authorization: Bearer xxx`

  * 也可以提供一个开关：导出时隐藏 key（用 `{{OPENAI_API_KEY}}` 占位）

---

## 4. 统一数据结构（建议你们先定这个，后续不会乱）

### 4.1 Slot（调试槽位）

* id
* providerProfileId
* pluginId
* modelId
* systemPrompt
* paramOverride（可空）
* lastRunId（可空）

### 4.2 Shared（全局共享）

* userPrompt
* toolsDefinition（JSON string）
* defaultParams

### 4.3 HistoryItem（一次调用记录）

* id, createdAt
* star, title, note
* providerProfileSnapshot（当时的 baseUrl/平台名/插件id，避免配置变更后回放错）
* requestSnapshot：

  * systemPrompt（或 systemPrompts[]，看你存单条还是批次）
  * userPrompt
  * toolsDefinition
  * params（最终合并后的参数）
  * modelId
* responseSnapshot：

  * outputText（最终拼接）
  * toolCalls（列表，含 name/args/result 摘要）
  * usage（tokens）
  * metrics（ttfbMs / totalMs / firstChunkAt / finishedAt）
  * raw（可选，受体积限制）

---

## 5. 技术实现约束与推荐选型

* Vue3 + TS + pnpm ✅
* 组件库：

  * 你提的 iView：Vue3 建议用 **View UI Plus**（iView 的 Vue3 分支思路）
  * 或 Naive UI / Ant Design Vue（二选一也行）
* 编辑器：

  * System/User 用 Monaco/Codemirror（支持大文本与格式化）
  * Tools JSON 建议带校验（JSON schema 校验 + 格式化按钮）
* 网络：

  * fetch + ReadableStream 处理 SSE/流式
  * AbortController 实现 Stop
* 指标采集：

  * requestStart = performance.now()
  * firstChunk 到达时记录 TTFB
  * stream done 记录 total

---

## 6. 验收标准（写清楚，避免“感觉做完了”）

* 能新增/删除/复制 Slot，每个 Slot 独立 system prompt
* Shared 的 user prompt / tools 对所有 Slot 生效
* 至少支持 OpenAI-compatible：

  * 读取模型列表
  * 调用模型（流式）
  * 展示：TTFB、total、tokens（若返回）、tool calls（若发生）
* Provider Profile 可保存到 localStorage，并可切换使用
* 每次 Run 生成历史记录，可 Star、可搜索、可载入
* Slot 上可导出 curl，复制可用

