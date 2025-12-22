# Requirements Document

## Introduction

本功能为 TruestPrompt 添加 Project（项目）管理能力。用户可以创建、切换、重命名和删除多个独立的项目，每个项目拥有完全隔离的数据空间，包括 Provider 配置、编辑器状态、历史记录等。这使得用户可以针对不同的调试场景（如不同客户、不同产品线、不同实验）维护独立的工作环境，避免数据混淆。

## Glossary

- **Project（项目）**: 一个独立的数据隔离单元，包含该项目专属的所有配置和状态
- **Project Selector（项目选择器）**: 位于 AppToolbar 中 TruestPrompt logo 旁边的下拉组件，用于切换和管理项目
- **Storage Namespace（存储命名空间）**: 基于 projectId 的 localStorage/IndexedDB key 前缀，实现数据隔离
- **Default Project（默认项目）**: 系统预置的项目，ID 为 `default`，不可删除
- **Project Metadata（项目元数据）**: 项目的基本信息，包括 id、name、createdAt、updatedAt

## Requirements

### Requirement 1

**User Story:** As a user, I want to create new projects, so that I can organize my prompt debugging work into separate isolated environments.

#### Acceptance Criteria

1. WHEN a user clicks the "New Project" option in the project selector dropdown THEN the Project_Selector SHALL display a modal dialog for entering the new project name
2. WHEN a user submits a valid project name (non-empty, trimmed, max 50 characters) THEN the Project_Selector SHALL create a new project with a unique ID and switch to it
3. WHEN a user attempts to create a project with an empty or whitespace-only name THEN the Project_Selector SHALL display an inline validation error and prevent creation
4. WHEN a new project is created THEN the System SHALL initialize it with empty state (no providers, default editor state, no history)

### Requirement 2

**User Story:** As a user, I want to switch between projects, so that I can work on different debugging contexts without data interference.

#### Acceptance Criteria

1. WHEN a user selects a different project from the dropdown THEN the System SHALL save the current project state and load the selected project's state
2. WHEN switching projects THEN the System SHALL update all UI components to reflect the new project's data (providers, slots, prompts, history)
3. WHEN switching projects THEN the System SHALL preserve unsaved changes in the previous project before switching
4. WHEN the application starts THEN the System SHALL restore the last active project from the previous session

### Requirement 3

**User Story:** As a user, I want to rename projects, so that I can keep my project names meaningful and organized.

#### Acceptance Criteria

1. WHEN a user right-clicks or clicks the edit icon on a project in the dropdown THEN the Project_Selector SHALL enable inline editing of the project name
2. WHEN a user submits a valid renamed project name THEN the System SHALL update the project metadata and persist the change
3. WHEN a user attempts to rename a project to an empty or whitespace-only name THEN the System SHALL reject the change and restore the original name
4. WHEN a project is renamed THEN the System SHALL update the dropdown display immediately without requiring a page refresh

### Requirement 4

**User Story:** As a user, I want to delete projects I no longer need, so that I can keep my project list clean and manageable.

#### Acceptance Criteria

1. WHEN a user clicks the delete option for a non-default project THEN the System SHALL display a confirmation dialog warning about permanent data loss
2. WHEN a user confirms project deletion THEN the System SHALL remove all project data from storage (providers, editor state, history, model cache)
3. WHEN the currently active project is deleted THEN the System SHALL automatically switch to the default project
4. WHEN a user attempts to delete the default project THEN the System SHALL prevent deletion and display an informative message
5. IF a project deletion fails due to storage errors THEN the System SHALL display an error message and preserve the project data

### Requirement 5

**User Story:** As a user, I want each project's data to be completely isolated, so that changes in one project do not affect another.

#### Acceptance Criteria

1. WHEN storing Provider configurations THEN the System SHALL use project-specific storage keys (e.g., `truestprompt-{projectId}-profiles`)
2. WHEN storing editor state THEN the System SHALL use project-specific storage keys (e.g., `truestprompt-{projectId}-editor-state`)
3. WHEN storing history records THEN the System SHALL use project-specific IndexedDB instances (e.g., `truestprompt-history-{projectId}`)
4. WHEN storing model cache THEN the System SHALL use project-specific IndexedDB instances (e.g., `truestprompt-model-cache-{projectId}`)
5. WHEN storing theme preference THEN the System SHALL use a global storage key (theme is shared across all projects)

### Requirement 6

**User Story:** As a user, I want the project selector to be easily accessible and intuitive, so that I can manage projects efficiently.

#### Acceptance Criteria

1. WHEN the application loads THEN the Project_Selector SHALL display the current project name in the dropdown trigger
2. WHEN the dropdown is opened THEN the Project_Selector SHALL display all projects sorted by last used time (most recent first)
3. WHEN hovering over a project item THEN the Project_Selector SHALL display action icons (rename, delete) for non-default projects
4. WHEN the project list exceeds 10 items THEN the Project_Selector SHALL enable scrolling within the dropdown with a maximum height constraint

### Requirement 7

**User Story:** As a developer, I want the project management system to handle storage errors gracefully, so that users don't lose data unexpectedly.

#### Acceptance Criteria

1. IF localStorage is unavailable or quota exceeded THEN the System SHALL display a warning toast and operate in memory-only mode for the session
2. IF IndexedDB operations fail THEN the System SHALL retry once and then fall back to localStorage for critical data
3. WHEN storage errors occur THEN the System SHALL log detailed error information to the console for debugging
4. WHEN recovering from storage errors THEN the System SHALL attempt to preserve as much user data as possible

