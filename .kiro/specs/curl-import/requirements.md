# Requirements Document

## Introduction

本功能为 TruestPrompt 添加"导入 cURL"能力，允许用户通过粘贴 cURL 命令快速创建或更新 Provider 配置，并自动选择对应的模型。这是对现有"导出 cURL"功能的补充，形成完整的 cURL 导入/导出闭环，提升用户从外部工具迁移配置的效率。

## Glossary

- **cURL**: 命令行工具，用于发送 HTTP 请求。本功能解析 cURL 命令中的 URL、Headers、Body 等信息。
- **Provider**: 模型服务提供商配置，包含 name、apiKey、baseUrl、pluginId。
- **Project**: 项目，用于隔离不同的工作空间配置。
- **Slot**: 模型调试槽位，包含 Provider 引用、模型选择、系统提示词等。
- **Plugin**: 插件，定义了与特定 API 格式（如 OpenAI、Anthropic）交互的逻辑。

## Requirements

### Requirement 1

**User Story:** As a user, I want to import a cURL command from the toolbar, so that I can quickly set up Provider and model configurations from external sources.

#### Acceptance Criteria

1. WHEN a user clicks the "Import cURL" button in the toolbar THEN the System SHALL display a modal dialog with a text input area for pasting cURL commands
2. WHEN the import modal is displayed THEN the System SHALL show a project selector allowing the user to choose an existing project or create a new one
3. WHEN a user selects "Create New Project" THEN the System SHALL display an input field for entering the new project name
4. WHEN a user submits a valid cURL command THEN the System SHALL parse the command and extract baseUrl, apiKey, model, and request body

### Requirement 2

**User Story:** As a user, I want the system to automatically detect the API provider type from my cURL command, so that I don't have to manually configure the plugin.

#### Acceptance Criteria

1. WHEN parsing a cURL command THEN the System SHALL detect the plugin type based on URL patterns (e.g., api.openai.com → OpenAI plugin, api.anthropic.com → Anthropic plugin)
2. WHEN the URL does not match any known provider pattern THEN the System SHALL default to the OpenAI-compatible plugin
3. WHEN the cURL command contains an Authorization header THEN the System SHALL extract the API key value

### Requirement 3

**User Story:** As a user, I want the system to create or reuse a Provider based on my imported cURL, so that I don't create duplicate configurations.

#### Acceptance Criteria

1. WHEN importing a cURL command THEN the System SHALL check if a Provider with the same baseUrl and pluginId already exists in the target project
2. WHEN a matching Provider exists THEN the System SHALL reuse the existing Provider and update its apiKey if a new one is provided
3. WHEN no matching Provider exists THEN the System SHALL create a new Provider with a generated name based on the detected plugin type
4. WHEN creating a new Provider THEN the System SHALL generate a unique name by appending a random suffix if needed

### Requirement 4

**User Story:** As a user, I want the system to intelligently configure a Slot with the imported settings, so that I can immediately start testing with minimal disruption.

#### Acceptance Criteria

1. WHEN a cURL import is successful AND only one Slot exists AND the Slot has default/empty content THEN the System SHALL overwrite the existing Slot with the imported configuration
2. WHEN a cURL import is successful AND multiple Slots exist OR the single Slot has non-default content THEN the System SHALL create a new Slot with the imported configuration
3. WHEN the cURL command contains a model identifier THEN the System SHALL set the target Slot's modelId to the extracted value
4. WHEN the import completes THEN the System SHALL refresh the model list for the target Slot
5. WHEN a Slot is configured via import THEN the System SHALL apply a highlight animation to visually indicate the imported Slot to the user
6. WHEN a new Slot is created THEN the System SHALL scroll the Slot into view if it is not visible

### Requirement 5

**User Story:** As a user, I want clear error messages when my cURL command cannot be parsed, so that I can correct the input.

#### Acceptance Criteria

1. WHEN a user submits an empty or whitespace-only input THEN the System SHALL display an error message "请输入 cURL 命令"
2. WHEN the input does not start with "curl" THEN the System SHALL display an error message "无效的 cURL 命令格式"
3. WHEN the cURL command lacks a valid URL THEN the System SHALL display an error message "未找到有效的请求 URL"
4. WHEN parsing fails for any other reason THEN the System SHALL display a descriptive error message explaining the issue

### Requirement 6

**User Story:** As a user, I want to optionally import the system prompt and user messages from the cURL body, so that I can restore a complete request configuration.

#### Acceptance Criteria

1. WHEN the cURL body contains a "messages" array THEN the System SHALL offer to import the messages into the Shared state
2. WHEN importing messages THEN the System SHALL separate system messages into the Slot's systemPrompt and user/assistant messages into the Shared userPrompts
3. WHEN the user declines message import THEN the System SHALL only configure the Provider and model without modifying prompts

