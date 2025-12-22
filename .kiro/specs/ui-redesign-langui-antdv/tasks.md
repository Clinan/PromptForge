# Implementation Plan

## Phase 1: 基础设施与样式系统

- [x] 1. 安装依赖并配置 Ant Design Vue
  - [x] 1.1 安装 ant-design-vue 和相关依赖
    - 运行 `pnpm add ant-design-vue @ant-design/icons-vue`
    - 配置按需引入
    - _Requirements: 11.4_
  - [x] 1.2 创建 LangUI 风格样式文件
    - 创建 `src/styles/langui.css`
    - 定义对话气泡、消息列表样式
    - _Requirements: 4.1, 11.5_
  - [x] 1.3 创建动画样式文件
    - 创建 `src/styles/animations.css`
    - 定义模态框、抽屉、按钮、卡片动画
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.9_
  - [x] 1.4 更新主题变量系统
    - 更新 `src/styles/theme.css`
    - 添加 LangUI 颜色变量和动画时间变量
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Checkpoint - 确保样式系统正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: 布局重构

- [x] 3. 创建新的工具栏组件
  - [x] 3.1 创建 AppToolbar.vue 组件
    - 实现 Logo、项目选择器、工具按钮组
    - 使用 Ant Design Vue 的 Button、Select 组件
    - _Requirements: 2.1_
  - [x] 3.2 实现工具栏按钮交互
    - Provider、Parameters、Tools、Variables、History 按钮
    - 主题切换按钮
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [x] 3.3 编写工具栏属性测试
    - **Property 2: Theme Persistence Round Trip**
    - **Validates: Requirements 2.7, 11.1**

- [x] 4. 重构主布局
  - [x] 4.1 简化 App.vue 布局结构
    - 移除左右侧边栏
    - 实现单栏布局 + 工具栏
    - _Requirements: 1.1, 1.2_
  - [x] 4.2 创建 MainWorkspace.vue 容器组件
    - 包含 PromptComposer 和 SlotsGrid
    - 实现响应式宽度调整
    - _Requirements: 1.3, 1.5_
  - [x] 4.3 编写布局响应式属性测试
    - **Property 1: Responsive Layout Adaptation**
    - **Validates: Requirements 1.5**

- [x] 5. Checkpoint - 确保布局重构正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: 模态框组件

- [x] 6. 创建 Provider 管理模态框
  - [x] 6.1 创建 ProviderModal.vue 组件
    - 使用 Ant Design Vue Modal 组件
    - 实现 Provider 列表展示和表单
    - _Requirements: 10.1_
  - [x] 6.2 实现表单验证和 CRUD 操作
    - 必填字段验证
    - 添加、编辑、删除 Provider
    - _Requirements: 10.2, 10.3_
  - [x] 6.3 实现导入导出功能
    - 加密 ZIP 导出
    - 密码验证导入
    - _Requirements: 10.4, 10.5_
  - [x] 6.4 编写 Provider 表单验证属性测试
    - **Property 21: Provider Form Validation**
    - **Validates: Requirements 10.2**

- [x] 7. 创建 Parameters 配置模态框
  - [x] 7.1 创建 ParamsModal.vue 组件
    - 使用 Ant Design Vue Modal、InputNumber、Slider 组件
    - 显示 temperature、top_p、max_tokens 配置
    - _Requirements: 6.1_
  - [x] 7.2 实现参数验证和保存
    - 数值范围验证
    - 保存、取消、重置默认操作
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [x] 7.3 编写参数验证属性测试
    - **Property 12: Parameter Validation**
    - **Validates: Requirements 6.2**

- [x] 8. 创建 Tools 配置模态框
  - [x] 8.1 创建 ToolsModal.vue 组件
    - 使用 Ant Design Vue Modal 组件
    - 集成 JsonEditor 组件
    - _Requirements: 7.1_
  - [x] 8.2 实现 JSON 验证和格式化
    - 实时语法校验
    - 格式化按钮
    - _Requirements: 7.2, 7.3, 7.4, 7.5_
  - [x] 8.3 编写 JSON 验证属性测试
    - **Property 13: JSON Syntax Validation**
    - **Property 14: JSON Format Idempotence**
    - **Property 15: Invalid JSON Prevents Save**
    - **Validates: Requirements 7.2, 7.3, 7.5**

- [x] 9. 创建 Variables 配置模态框
  - [x] 9.1 创建 VarsModal.vue 组件
    - 使用 Ant Design Vue Modal、Input、Table 组件
    - 显示变量键值对列表
    - _Requirements: 8.1_
  - [x] 9.2 实现变量 CRUD 操作
    - 添加、编辑、删除变量
    - 实时更新
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  - [x] 9.3 编写变量操作属性测试
    - **Property 16: Variable Addition Creates Empty Pair**
    - **Property 17: Variable Edit Real-Time Update**
    - **Property 18: Variable Deletion Removes Entry**
    - **Validates: Requirements 8.2, 8.3, 8.4**

- [x] 10. Checkpoint - 确保模态框组件正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: 抽屉组件

- [x] 11. 重构 History 抽屉
  - [x] 11.1 重构 HistoryDrawer.vue 组件
    - 使用 Ant Design Vue Drawer 组件
    - 实现时间线布局
    - _Requirements: 9.1_
  - [x] 11.2 实现历史记录交互
    - 展开详情、Star 切换、载入、搜索
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  - [x] 11.3 编写历史记录属性测试
    - **Property 19: History Star Toggle**
    - **Property 20: History Search Filtering**
    - **Validates: Requirements 9.3, 9.5**

## Phase 5: Slot 卡片重构

- [x] 12. 重构 SlotCard 组件
  - [x] 12.1 更新 SlotCard.vue 样式
    - 使用 Ant Design Vue Card、Select、Button 组件
    - 移除选择功能，保留独立运行
    - _Requirements: 3.1_
  - [x] 12.2 实现 Provider/Model 选择联动
    - Provider 切换更新 Model 列表
    - _Requirements: 3.2_
  - [x] 12.3 实现运行状态和进度条
    - 运行时显示进度条和 Stop 按钮
    - 使用 Ant Design Vue Progress 组件
    - _Requirements: 3.3, 3.4_
  - [x] 12.4 实现 Slot 增删复制操作
    - Add Slot、Copy、Delete 按钮
    - _Requirements: 3.6, 3.7, 3.8_
  - [x] 12.5 编写 Slot 操作属性测试
    - **Property 3: Provider Selection Updates Model Options**
    - **Property 4: Slot Addition Preserves Existing Slots**
    - **Property 5: Slot Copy Creates Independent Duplicate**
    - **Property 6: Slot Deletion Constraint**
    - **Validates: Requirements 3.2, 3.6, 3.7, 3.8**

- [x] 13. 创建 OutputBubble 组件
  - [x] 13.1 创建 OutputBubble.vue 组件
    - 实现 LangUI 风格对话气泡
    - 支持流式输出和光标动画
    - _Requirements: 4.1, 4.2, 13.7_
  - [x] 13.2 实现指标徽章和复制功能
    - TTFB、耗时、Tokens 徽章
    - 复制按钮和 Toast 通知
    - _Requirements: 4.4, 4.5_
  - [x] 13.3 实现 Tool Calls 展示
    - 可折叠代码块
    - 语法高亮
    - _Requirements: 4.3_
  - [x] 13.4 编写流式输出属性测试
    - **Property 7: Streaming Output Incremental Append**
    - **Validates: Requirements 4.2**

- [x] 14. 重构 SlotsGrid 组件
  - [x] 14.1 更新 SlotsSection.vue 为 SlotsGrid.vue
    - 移除 Run All、Run Selected 功能
    - 实现卡片网格布局
    - _Requirements: 3.1_
  - [x] 14.2 实现卡片增删动画
    - 使用 Vue TransitionGroup
    - 应用卡片进出动画
    - _Requirements: 13.9_

- [x] 15. Checkpoint - 确保 Slot 卡片正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Prompt Composer 重构

- [x] 16. 重构 PromptComposer 组件
  - [x] 16.1 更新 PromptComposer.vue 样式
    - 使用 Ant Design Vue 组件
    - 实现消息列表编辑器
    - _Requirements: 5.1_
  - [x] 16.2 实现消息增删操作
    - Add Message 按钮
    - Delete 按钮（带确认）
    - _Requirements: 5.2, 5.5_
  - [x] 16.3 实现变量自动补全
    - 双花括号触发下拉
    - _Requirements: 5.3_
  - [x] 16.4 实现拖拽排序
    - 使用 vuedraggable 或原生拖拽
    - _Requirements: 5.4_
  - [x] 16.5 实现自动保存
    - 编辑后 1 秒内保存到 localStorage
    - _Requirements: 5.6_
  - [x] 16.6 编写 Prompt Composer 属性测试
    - **Property 8: Message Addition Preserves Order**
    - **Property 9: Message Reorder via Drag-Drop**
    - **Property 10: Message Deletion Constraint**
    - **Property 11: Auto-Save to LocalStorage**
    - **Validates: Requirements 5.2, 5.4, 5.5, 5.6**

- [x] 17. Checkpoint - 确保 Prompt Composer 正常工作
  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: 可访问性与键盘快捷键

- [x] 18. 实现键盘快捷键
  - [x] 18.1 实现 Ctrl+. 停止运行
    - 全局键盘监听
    - _Requirements: 12.2_
  - [x] 18.2 实现 Escape 关闭模态框
    - 模态框键盘事件处理
    - _Requirements: 12.3_
  - [x] 18.3 编写键盘快捷键属性测试
    - **Property 23: Escape Closes Modal**
    - **Validates: Requirements 12.3**

- [x] 19. 实现可访问性
  - [x] 19.1 添加 ARIA 标签
    - 所有交互元素添加 aria-label
    - _Requirements: 12.4_
  - [x] 19.2 实现 Tab 焦点顺序
    - 确保逻辑焦点顺序
    - _Requirements: 12.1_
  - [x] 19.3 实现模态框焦点陷阱
    - Tab 键在模态框内循环
    - _Requirements: 12.5_
  - [x] 19.4 编写可访问性属性测试
    - **Property 22: Tab Focus Order**
    - **Property 24: ARIA Labels Present**
    - **Property 25: Modal Focus Trap**
    - **Validates: Requirements 12.1, 12.4, 12.5**

- [x] 20. Final Checkpoint - 确保所有功能正常工作
  - Ensure all tests pass, ask the user if questions arise.
