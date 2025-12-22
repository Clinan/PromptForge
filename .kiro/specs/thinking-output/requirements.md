# Requirements Document

## Introduction

为 TruestPrompt 的 Slot 卡片添加模型思考过程（Thinking/Reasoning）输出展示功能。部分大模型（如 Claude、DeepSeek 等）支持输出推理过程，该功能允许用户查看模型的思考链，并提供可折叠的 UI 以保持界面整洁。

## Glossary

- **Thinking Output**: 模型在生成最终回答前的推理/思考过程文本，通常由支持 reasoning 的模型返回
- **Slot Card**: 槽位卡片，展示单个模型配置及其输出结果的 UI 组件
- **Collapsible Panel**: 可折叠面板，用户可以展开或收起的 UI 区域
- **Streaming Output**: 流式输出，模型逐步返回内容的方式
- **Plugin Chunk**: 插件返回的数据块类型，包含不同类型的输出内容

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the model's thinking process in the Slot output, so that I can understand how the model reasons before generating the final answer.

#### Acceptance Criteria

1. WHEN a model returns thinking content THEN the Slot Card SHALL display the thinking output in a dedicated section above the main output
2. WHEN thinking content is received during streaming THEN the Slot Card SHALL update the thinking display in real-time
3. WHEN no thinking content is returned THEN the Slot Card SHALL hide the thinking section entirely
4. WHEN thinking content exists THEN the Slot Card SHALL visually distinguish thinking from the main output using different styling

### Requirement 2

**User Story:** As a user, I want to collapse the thinking output panel, so that I can focus on the final answer without visual clutter.

#### Acceptance Criteria

1. WHEN thinking content is displayed THEN the Slot Card SHALL provide a collapse toggle button
2. WHEN a user clicks the collapse toggle THEN the Slot Card SHALL animate the thinking panel to collapsed state
3. WHEN the thinking panel is collapsed THEN the Slot Card SHALL show a compact indicator with thinking content length
4. WHEN a user clicks the collapsed indicator THEN the Slot Card SHALL expand the thinking panel with smooth animation
5. WHEN the Slot runs again THEN the Slot Card SHALL reset the thinking panel to expanded state

### Requirement 3

**User Story:** As a user, I want the thinking collapse state to be preserved per Slot, so that my viewing preferences are maintained during the session.

#### Acceptance Criteria

1. WHEN a user collapses thinking in one Slot THEN the collapse state SHALL only affect that specific Slot
2. WHEN switching between Slots THEN each Slot SHALL maintain its own thinking collapse state
3. WHEN the page is refreshed THEN the thinking collapse state SHALL reset to default expanded state

### Requirement 4

**User Story:** As a developer, I want the plugin system to support thinking output, so that different model providers can return reasoning content.

#### Acceptance Criteria

1. WHEN a plugin receives thinking content from API THEN the plugin SHALL emit a thinking chunk type
2. WHEN parsing API responses THEN the plugin SHALL correctly extract thinking content from provider-specific formats
3. WHEN building request parameters THEN the plugin SHALL include reasoning enablement flags when supported
4. WHEN serializing thinking output THEN the plugin SHALL preserve the complete thinking text for history storage

### Requirement 5

**User Story:** As a user, I want thinking output to be included in history records, so that I can review the model's reasoning process later.

#### Acceptance Criteria

1. WHEN saving a run to history THEN the History Item SHALL include the thinking output snapshot
2. WHEN loading a history item THEN the Slot Card SHALL display the stored thinking content
3. WHEN exporting history THEN the export SHALL include thinking content in the output data
