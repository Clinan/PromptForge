# Requirements Document

## Introduction

本需求文档定义了 TruestPrompt 前端 UI 重构项目的功能需求。TruestPrompt 是一个 PC Web 端的「大模型调试台」，核心价值是用同一份 User Prompt + Tools，快速对比不同模型/不同系统提示词的输出与耗时指标。

本次重构的目标是采用 LangUI（https://www.langui.dev/）的 AI 对话组件风格和 Ant Design Vue（https://www.antdv.com/）组件库，重新设计 UI 交互，使产品更人性化、更易用。核心设计理念是：**简化布局，去掉左右侧边栏，采用顶部工具栏驱动的交互模式，主页面专注于 Prompt 调试（编写和修改文案）**。

## Glossary

- **TruestPrompt**: 本项目的产品名称，一个大模型调试台应用
- **Slot**: 模型调试槽位，每个 Slot 包含独立的 Provider、Model、System Prompt 和参数配置
- **Provider Profile**: 平台厂商配置，包含 API Key、Base URL 等连接信息
- **Shared State**: 全局共享状态，包含 User Prompt、Tools 定义和默认参数
- **LangUI**: 一个专为 AI/LLM 应用设计的 UI 组件库，提供对话气泡、消息列表等组件样式
- **Ant Design Vue**: 蚂蚁金服出品的企业级 Vue 组件库
- **TTFB**: Time To First Byte，首字节响应时间
- **Tool Calls**: 模型调用的工具/函数列表
- **Toolbar**: 顶部工具栏，承载所有配置入口和操作按钮

## Requirements

### Requirement 1: 简化布局 - 工具栏驱动模式

**User Story:** 作为用户，我希望看到一个简洁的单栏布局界面，通过顶部工具栏访问各项配置，以便我能专注于 Prompt 调试工作。

#### Acceptance Criteria

1. WHEN the application loads THEN the Layout System SHALL render a single-column layout with a toolbar at the top and main content area below
2. WHEN a user views the main area THEN the Layout System SHALL display the Prompt editing workspace as the primary focus
3. WHILE the application is in use THEN the Layout System SHALL maintain consistent spacing of 16 pixels between major sections
4. WHEN a user hovers over interactive elements THEN the Layout System SHALL display visual feedback using Ant Design Vue's hover states
5. WHEN the viewport width changes THEN the Layout System SHALL adjust the main content area width responsively

### Requirement 2: 顶部工具栏设计

**User Story:** 作为用户，我希望顶部工具栏集成所有配置入口和操作按钮，以便我能快速访问各项功能而不离开主编辑区。

#### Acceptance Criteria

1. WHEN the application loads THEN the Toolbar Component SHALL display logo, project selector, and grouped action buttons in a single horizontal bar
2. WHEN a user clicks the Provider button THEN the Toolbar Component SHALL open a modal dialog for managing Provider Profiles
3. WHEN a user clicks the Parameters button THEN the Toolbar Component SHALL open a modal dialog for editing default parameters (temperature, top_p, max_tokens)
4. WHEN a user clicks the Tools button THEN the Toolbar Component SHALL open a modal dialog for editing Tools JSON definition
5. WHEN a user clicks the Variables button THEN the Toolbar Component SHALL open a modal dialog for managing template variables
6. WHEN a user clicks the History button THEN the Toolbar Component SHALL open a drawer panel showing run history
7. WHEN a user clicks the theme toggle THEN the Toolbar Component SHALL switch between light and dark themes and persist the preference to localStorage

### Requirement 3: Slot 卡片重新设计

**User Story:** 作为用户，我希望 Slot 卡片采用 LangUI 风格的现代设计，每个 Slot 独立运行，以便我能更直观地查看和管理每个调试槽位。

#### Acceptance Criteria

1. WHEN a Slot card renders THEN the Slot Card Component SHALL display provider selector, model selector, system prompt editor, and action buttons in a compact card layout
2. WHEN a user selects a provider THEN the Slot Card Component SHALL update the model dropdown options within 500 milliseconds
3. WHEN a user clicks the Run button on a Slot THEN the Slot Card Component SHALL execute that specific Slot independently and display a loading spinner
4. WHEN the model is running THEN the Slot Card Component SHALL display a progress indicator at the top of the card and a Stop button
5. WHEN the run completes THEN the Slot Card Component SHALL display output in a chat bubble style with metrics badges
6. WHEN a user clicks the Add Slot button THEN the Slot Card Component SHALL create a new Slot card with default configuration
7. WHEN a user clicks the Copy button on a Slot THEN the Slot Card Component SHALL duplicate the Slot with all its configuration
8. WHEN a user clicks the Delete button on a Slot THEN the Slot Card Component SHALL remove the Slot after confirmation if more than one Slot exists

### Requirement 4: 输出展示区采用 LangUI 对话风格

**User Story:** 作为用户，我希望模型输出以对话气泡的形式展示，以便我能更自然地阅读和理解模型响应。

#### Acceptance Criteria

1. WHEN model output is received THEN the Output Display Component SHALL render the response in a chat bubble style with rounded corners and appropriate background color
2. WHEN streaming output is enabled THEN the Output Display Component SHALL append text incrementally with a typing cursor animation
3. WHEN tool calls are present THEN the Output Display Component SHALL display them in collapsible code blocks with syntax highlighting
4. WHEN a user clicks the copy button THEN the Output Display Component SHALL copy the output text to clipboard and display a success toast notification
5. WHEN metrics are available THEN the Output Display Component SHALL display TTFB, total time, and token counts in pill-shaped badges below the output

### Requirement 5: Prompt Composer 编辑器 - 主编辑区

**User Story:** 作为用户，我希望主编辑区专注于 Prompt 编写，支持多消息编辑和变量插入，以便我能高效地构建和调试对话场景。

#### Acceptance Criteria

1. WHEN the main area loads THEN the Prompt Composer Component SHALL display a message list editor as the primary workspace
2. WHEN a user clicks the Add Message button THEN the Prompt Composer Component SHALL append a new message entry with role selector (user/system/assistant)
3. WHEN a user types double curly braces THEN the Prompt Composer Component SHALL display a variable autocomplete dropdown within 100 milliseconds
4. WHEN a user drags a message THEN the Prompt Composer Component SHALL allow reordering messages via drag-and-drop
5. WHEN a user clicks the delete button on a message THEN the Prompt Composer Component SHALL remove the message after confirmation if more than one message exists
6. WHEN a user edits message content THEN the Prompt Composer Component SHALL auto-save changes to localStorage within 1 second

### Requirement 6: 参数配置模态框

**User Story:** 作为用户，我希望通过模态框快速配置默认参数，以便我能在不离开主编辑区的情况下调整模型参数。

#### Acceptance Criteria

1. WHEN the Parameters Modal opens THEN the Parameters Modal Component SHALL display input fields for temperature, top_p, and max_tokens with current values
2. WHEN a user edits a parameter THEN the Parameters Modal Component SHALL validate numeric inputs and display error messages for invalid values
3. WHEN a user clicks Save THEN the Parameters Modal Component SHALL persist changes and close the modal
4. WHEN a user clicks Cancel THEN the Parameters Modal Component SHALL discard changes and close the modal
5. WHEN a user clicks Reset to Defaults THEN the Parameters Modal Component SHALL restore default parameter values

### Requirement 7: Tools 配置模态框

**User Story:** 作为用户，我希望通过模态框编辑 Tools JSON 定义，以便我能方便地配置函数调用工具。

#### Acceptance Criteria

1. WHEN the Tools Modal opens THEN the Tools Modal Component SHALL display a JSON editor with syntax highlighting and current tools definition
2. WHEN a user edits the JSON THEN the Tools Modal Component SHALL validate JSON syntax in real-time and highlight errors inline
3. WHEN a user clicks Format THEN the Tools Modal Component SHALL auto-format the JSON with proper indentation
4. WHEN a user clicks Save THEN the Tools Modal Component SHALL validate and persist the tools definition
5. IF the JSON is invalid THEN the Tools Modal Component SHALL display an error message and prevent saving

### Requirement 8: Variables 配置模态框

**User Story:** 作为用户，我希望通过模态框管理模板变量，以便我能在 Prompt 中使用动态值。

#### Acceptance Criteria

1. WHEN the Variables Modal opens THEN the Variables Modal Component SHALL display a list of key-value pairs for all defined variables
2. WHEN a user clicks Add Variable THEN the Variables Modal Component SHALL create a new empty key-value pair
3. WHEN a user edits a variable key or value THEN the Variables Modal Component SHALL update the variable in real-time
4. WHEN a user clicks Delete on a variable THEN the Variables Modal Component SHALL remove the variable from the list
5. WHEN a user clicks Save THEN the Variables Modal Component SHALL persist all variable changes

### Requirement 9: 历史记录抽屉

**User Story:** 作为用户，我希望通过抽屉面板查看历史记录，以便我能快速回溯之前的调试记录。

#### Acceptance Criteria

1. WHEN the History Drawer opens THEN the History Drawer Component SHALL slide in from the right side and display history items in a timeline layout
2. WHEN a user clicks a history item THEN the History Drawer Component SHALL expand to show full details including request and response snapshots
3. WHEN a user clicks the Star button THEN the History Drawer Component SHALL toggle the star status and persist the change
4. WHEN a user clicks the Load button THEN the History Drawer Component SHALL open a dialog with options to select which parts to restore
5. WHEN a user searches in the history THEN the History Drawer Component SHALL filter items by keyword, model, or provider within 200 milliseconds

### Requirement 10: Provider 管理模态框

**User Story:** 作为用户，我希望在模态框中管理所有 Provider 配置，以便我能集中管理 API 密钥和连接设置。

#### Acceptance Criteria

1. WHEN the Provider Modal opens THEN the Provider Modal Component SHALL display a list of existing providers and a form to add new providers
2. WHEN a user fills the provider form THEN the Provider Modal Component SHALL validate required fields (name, API key, base URL) before enabling the save button
3. WHEN a user clicks delete on a provider THEN the Provider Modal Component SHALL display a confirmation dialog warning about affected Slots
4. WHEN a user clicks export THEN the Provider Modal Component SHALL generate an encrypted ZIP file with password protection
5. WHEN a user imports a provider file THEN the Provider Modal Component SHALL decrypt and merge providers after password verification

### Requirement 11: 主题系统与视觉一致性

**User Story:** 作为用户，我希望应用支持浅色和深色主题，并且所有组件保持视觉一致性，以便我能在不同环境下舒适地使用。

#### Acceptance Criteria

1. WHEN the application loads THEN the Theme System SHALL apply the user's previously saved theme preference from localStorage
2. WHEN a user toggles the theme THEN the Theme System SHALL transition all colors smoothly within 300 milliseconds
3. WHILE the dark theme is active THEN the Theme System SHALL use LangUI's dark color palette with appropriate contrast ratios meeting WCAG AA standards
4. WHEN rendering any component THEN the Theme System SHALL use Ant Design Vue's design tokens for consistent spacing, typography, and colors
5. WHEN a user views the application THEN the Theme System SHALL maintain a cohesive visual language combining LangUI chat styles with Ant Design Vue components

### Requirement 12: 键盘快捷键与可访问性

**User Story:** 作为用户，我希望应用支持键盘快捷键和无障碍访问，以便我能高效地操作应用。

#### Acceptance Criteria

1. WHEN a user presses Tab THEN the Accessibility System SHALL move focus to the next interactive element in logical order
2. WHEN a user presses Ctrl+. THEN the Accessibility System SHALL stop all running Slots
3. WHEN a user presses Escape in a modal THEN the Accessibility System SHALL close the modal
4. WHEN a screen reader is active THEN the Accessibility System SHALL provide appropriate ARIA labels for all interactive elements
5. WHEN a modal is open THEN the Accessibility System SHALL trap focus within the modal until it is closed

### Requirement 13: 交互动画与微交互

**User Story:** 作为用户，我希望应用具有流畅的动画效果和微交互反馈，以便我能获得更好的使用体验。

#### Acceptance Criteria

1. WHEN a modal opens THEN the Animation System SHALL fade in the backdrop and scale up the modal content within 200 milliseconds
2. WHEN a modal closes THEN the Animation System SHALL fade out the backdrop and scale down the modal content within 150 milliseconds
3. WHEN a drawer opens THEN the Animation System SHALL slide the drawer in from the right edge within 250 milliseconds with easing
4. WHEN a user hovers over a button THEN the Animation System SHALL apply a subtle scale transform (1.02x) and shadow elevation
5. WHEN a user clicks a button THEN the Animation System SHALL apply a press-down effect (0.98x scale) for 100 milliseconds
6. WHEN a Slot starts running THEN the Animation System SHALL animate the progress bar with a smooth indeterminate animation
7. WHEN streaming output is received THEN the Animation System SHALL display a blinking cursor animation at the end of the text
8. WHEN a toast notification appears THEN the Animation System SHALL slide it in from the top with a bounce effect
9. WHEN a card is added or removed THEN the Animation System SHALL animate the layout change with a smooth transition
10. WHEN theme changes THEN the Animation System SHALL transition all colors smoothly within 300 milliseconds
