# 代码协作准则

> 你不是“写代码机器”，你是一个对产品负责的工程师。
> 目标：在保证**功能可用性**的前提下，把**UI 美学、交互舒适、排版讲究、模块联动顺畅**当成一等公民。
> 同时：对历史代码保持敬畏（先理解、再改动），也要敢于挑战（发现更好的结构就提出方案并小步验证）。

---

## 0. 产品契约

TruestPrompt 是 PC Web 端的「大模型调试台」，核心价值是：用同一份 **User Prompt + Tools**，快速对比不同模型/不同系统提示词的输出、耗时与指标。  
明确非目标：账号体系、云端存储、多人协作、服务端代理（除非未来加可选轻后端）。

**你做的每一次改动，都必须回到这个契约：**
- 是否更快更稳地完成“对比、迭代、可视化、可回放”？
- 是否避免把项目拖向“云端协作平台”那条非目标路线？

---

## 1. 核心信息架构（你必须先记住的页面/模块）

### 1.1 调试页（主页面）
- 顶部工具栏：Provider、Run/Run All/Stop、History、Settings
- Prompt Studio（中间）：  
  - System Prompt 区：多个 Slot（模型卡片/槽位）  
  - Shared 区：User Prompt + Tools 定义
- Output Console（右侧）：按 Slot 分组展示流式输出、指标、tool calls、raw

### 1.2 历史（History）
- 列表：时间、标题/备注、Provider/Model、Star、耗时、tokens、是否 tool call
- 详情：完整输入快照 + 输出快照 + 指标 + tool calls

---

## 2. 设计与交互：硬性规则（不达标就算“没做完”）

### 2.1 可用性优先（Functional Usability）
- 所有关键操作必须可回退：Stop、撤销/取消、清空、删除需确认（或提供“撤销”）
- 失败路径要完整：无模型列表、鉴权失败、流式中断、工具 JSON 无效、localStorage 被禁用
- 默认值必须安全、可理解、可预测：不要让用户从空白开始

### 2.2 UI 美学（Visual Aesthetics）
- 建立并遵守统一的视觉系统：间距、圆角、阴影、字号层级、颜色语义（成功/警告/错误/信息）
- 组件排列必须有“网格秩序”：对齐、留白、层级清晰；不要“能放下就行”
- 同类信息同样呈现：指标的单位/精度统一；按钮文案统一（动词开头）

### 2.3 交互舒适（Interaction Comfort）
- 流式输出要“稳定”：不要跳动布局；长输出要可折叠、可复制、可清空
- 避免阻塞：Run/Stop/切换 Slot/打开历史抽屉必须响应迅速（必要时用节流/防抖/虚拟列表）
- 键盘友好：Tab 顺序合理；输入框 Esc/Enter 行为一致；复制按钮有快捷入口
- 可访问性（A11y）：可聚焦、aria-label、对比度、禁用态清晰

### 2.4 排版讲究（Typography & Layout）
- 标题/副标题/正文/注释/代码块有明确层级与行高
- JSON/代码区域要有等宽字体、行号/格式化/校验提示
- 不允许“临时加一个 style 把它挤过去”：布局问题要用布局系统解决

---

## 3. 产品逻辑：改功能必须先过这 6 个问题

在写代码前，先回答并在实现中体现：
1) 用户的主路径是什么？失败时怎么回到主路径？  
2) Shared（User Prompt/Tools）与 Slot（System Prompt/参数覆盖）如何合并？合并顺序是否一致？  
3) 并发 Run/Run All 时，输出与指标如何归属到正确 Slot？  
4) Stop 的语义是什么？只停当前 Slot，还是停全部？UI 怎么表达？  
5) 历史记录粒度是什么？单次调用 vs 批次调用，如何保持可理解？  
6) 导出 cURL 是否“复制可用”？是否支持隐藏 key 占位符？

---

## 4. 工程设计：模块联动必须顺滑

### 4.1 数据结构（建议遵循）
- Slot：id / providerProfileId / pluginId / modelId / systemPrompt / paramOverride / lastRunId
- Shared：userPrompt / toolsDefinition / defaultParams
- HistoryItem：providerProfileSnapshot / requestSnapshot / responseSnapshot（含 metrics、usage、toolCalls、raw 可选）

**规则：**
- UI 层不要散落“半套状态”；状态要么在统一 store，要么在明确的容器组件中集中管理
- “请求快照”必须可复现：历史回放不能依赖当前配置的可变值

### 4.2 插件化（安全第一）
- 插件是“配置型”，禁止让用户写可执行 JS（避免安全/维护爆炸）
- 每个插件至少实现：
  - listModels(config) -> ModelInfo[]
  - invokeChat(config, request, { stream })
  - buildCurl(config, request) -> string
- request 必须是统一结构；插件只负责映射与解析

### 4.3 localStorage（必须明确风险）
- API Key 存 localStorage 有风险：UI 必须提示
- 必须提供：一键清空密钥 / 导出配置 / 导入配置

---

## 5. 代码风格：以《可读代码的艺术》与《Clean Code》为目标

### 5.1 命名与可读性
- 名字表达意图：函数名回答“做什么”，变量名回答“是什么”
- 复杂逻辑拆小：每个函数只做一件事，避免深层嵌套
- 注释写“为什么”，不写“是什么”（代码本身要能说明是什么）

### 5.2 结构与边界
- UI 组件：展示逻辑与业务逻辑分离（容器/展示或 composable/hooks 分层）
- 统一错误处理策略：不要到处 try/catch + toast
- 禁止复制粘贴：抽公共组件/工具函数/类型定义

### 5.3 类型与契约
- TypeScript 类型优先：不要用 any 糊过去
- 输入输出有明确类型：插件 request/response、history snapshot、metrics 等必须稳定

---

## 6. 修改历史代码：敬畏 + 勇气（你必须遵循的流程）

1) **先读再改**：找到现有实现与抽象边界，写下“现状理解”
2) **先保正确再求优雅**：修 bug 先写复现步骤与最小修复；重构必须有等价性保障
3) **加护栏**：给关键逻辑补测试或“特征化测试”（characterization test）
4) **小步提交**：结构重排与行为修改分开提交，方便 review 与回滚
5) **敢于挑战**：如果发现抽象不合理，提出替代方案 + 迁移路径（不要“一把梭哈”）

---

## 7. 本地开发与质量闸门（以仓库 scripts 为准）

优先使用 pnpm（仓库有 pnpm-lock）。常见流程：
- 安装依赖：`pnpm install`
- 本地开发：`pnpm dev`
- 构建检查：`pnpm build`

**提交前最低要求：**
- 关键路径手测通过：Run / Stop / History / Export cURL / Profile 切换
- 无明显 UI 抖动、无 console error、无类型报错
- 新增/修改逻辑必须配套测试或等价性验证说明

---

## 8. PR / 提交说明（写给“未来的你”和 review 的人）

### 8.1 PR 描述必须包含
- 变更目的（对齐项目契约）
- 用户路径（主路径 + 失败路径）
- 模块联动影响评估（Slot/Shared/History/Plugin/Profile）
- UI/交互截图或动图（如果有界面改动）
- 风险与回滚方式

### 8.2 Definition of Done（验收对齐）
- 可新增/删除/复制 Slot；每个 Slot 独立 system prompt
- Shared 的 user prompt/tools 对所有 Slot 生效
- 至少支持 OpenAI-compatible：拉模型列表、流式调用、展示 TTFB/total/tokens/tool calls
- Provider Profile 可保存并切换
- Run 生成历史，可 Star、搜索、载入
- Slot 可导出 cURL，复制可用

---

## 9. 禁止事项（踩了就是回退重做）
- 为了“看起来能用”而破坏可维护性：到处塞条件分支、魔法常量、重复代码
- UI 用大量临时样式硬凑布局，导致全局不一致
- 不理解历史代码就大改结构，且没有迁移/测试护栏
- 让用户输入可执行脚本（插件/配置）进入运行时
- 导出 cURL 不可直接使用（缺字段/格式错/鉴权不对）

---

## 10. 最后一句
把每一次修改都当成“要长期维护的产品功能”。
