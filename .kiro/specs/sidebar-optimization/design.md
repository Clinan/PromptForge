# Design Document

## Overview

本设计文档描述了 TruestPrompt 主页面侧边栏优化方案。目标是提供流畅、直观的侧边栏交互体验，包括拖拽调整宽度、平滑折叠/展开动画、响应式适配和键盘快捷键支持。

设计遵循以下原则：
- **可用性优先**：所有交互必须响应迅速、反馈清晰
- **UI 美学**：动画流畅、视觉反馈一致
- **代码质量**：使用 Vue 3 Composition API 和响应式状态管理，避免直接 DOM 操作
- **向后兼容**：与现有 Naive UI 布局组件集成，不破坏现有功能

## Architecture

### 组件层次结构

```
App.vue (主容器)
├── NLayout (Naive UI 布局容器)
│   ├── NLayoutSider (左侧边栏)
│   │   └── workspace-sidebar (侧边栏内容)
│   ├── NLayout (内层布局)
│   │   ├── workspace-main (主工作区)
│   │   └── NLayoutSider (右侧边栏)
│   │       └── ContextPanel (上下文面板)
│   └── ResizeHandle (拖拽手柄 - 新增)
│       ├── left-resize-handle
│       └── right-resize-handle
└── CollapseToggle (折叠按钮 - 已存在，需优化)
```

### 状态管理架构

使用 Vue 3 响应式系统管理侧边栏状态：

```typescript
// 侧边栏状态
interface SidebarState {
  left: {
    width: number;
    collapsed: boolean;
    isResizing: boolean;
  };
  right: {
    width: number;
    collapsed: boolean;
    isResizing: boolean;
  };
}
```

## Components and Interfaces

### 1. ResizeHandle 组件（新增）

**职责**：提供拖拽调整侧边栏宽度的交互界面

**Props**:
```typescript
interface ResizeHandleProps {
  side: 'left' | 'right';
  minWidth: number;
  maxWidth: number;
  currentWidth: number;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}
```

**事件**:
- `resize`: 拖拽过程中持续触发，传递新宽度
- `resize-end`: 拖拽结束时触发，传递最终宽度

**实现要点**:
- 使用 `mousedown`/`mousemove`/`mouseup` 事件处理拖拽
- 使用 `touchstart`/`touchmove`/`touchend` 支持触摸设备
- 拖拽时添加全局 `user-select: none` 防止文本选择
- 提供视觉反馈（hover 状态、拖拽状态）

### 2. useSidebarResize Composable（新增）

**职责**：封装侧边栏调整逻辑的可复用组合式函数

**接口**:
```typescript
interface UseSidebarResizeOptions {
  side: 'left' | 'right';
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  collapseThreshold: number;
  storageKey: string;
}

interface UseSidebarResizeReturn {
  width: Ref<number>;
  collapsed: Ref<boolean>;
  isResizing: Ref<boolean>;
  startResize: (event: MouseEvent | TouchEvent) => void;
  toggleCollapse: () => void;
  setWidth: (width: number) => void;
}

function useSidebarResize(options: UseSidebarResizeOptions): UseSidebarResizeReturn
```

**功能**:
- 管理侧边栏宽度状态
- 处理拖拽事件
- 自动折叠/展开逻辑
- 持久化到 localStorage
- 边界值验证

### 3. useSidebarPersistence Composable（新增）

**职责**：处理侧边栏状态的持久化和恢复

**接口**:
```typescript
interface SidebarPersistedState {
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
}

interface UseSidebarPersistenceReturn {
  loadState: () => SidebarPersistedState | null;
  saveState: (state: Partial<SidebarPersistedState>) => void;
  clearState: () => void;
}

function useSidebarPersistence(storageKey: string): UseSidebarPersistenceReturn
```

### 4. 修改现有 App.vue

**需要修改的部分**:
- 移除现有的简单 `leftSidebarHidden` / `rightPanelHidden` 状态
- 集成 `useSidebarResize` composable
- 添加 ResizeHandle 组件
- 优化折叠按钮的动画和交互

## Data Models

### SidebarConfig

```typescript
interface SidebarConfig {
  // 宽度配置
  minWidth: number;        // 最小宽度（px）
  maxWidth: number;        // 最大宽度（px）
  defaultWidth: number;    // 默认宽度（px）
  
  // 折叠配置
  collapseThreshold: number;  // 自动折叠阈值（px）
  collapsedWidth: number;     // 折叠后宽度（px）
  
  // 动画配置
  transitionDuration: number; // 动画时长（ms）
  
  // 持久化配置
  storageKey: string;         // localStorage 键名
}

// 默认配置
const DEFAULT_LEFT_SIDEBAR_CONFIG: SidebarConfig = {
  minWidth: 200,
  maxWidth: 600,
  defaultWidth: 240,
  collapseThreshold: 100,
  collapsedWidth: 0,
  transitionDuration: 300,
  storageKey: 'truestprompt-left-sidebar'
};

const DEFAULT_RIGHT_SIDEBAR_CONFIG: SidebarConfig = {
  minWidth: 280,
  maxWidth: 800,
  defaultWidth: 360,
  collapseThreshold: 150,
  collapsedWidth: 0,
  transitionDuration: 300,
  storageKey: 'truestprompt-right-sidebar'
};
```

### ResizeState

```typescript
interface ResizeState {
  isResizing: boolean;      // 是否正在拖拽
  startX: number;           // 拖拽起始 X 坐标
  startWidth: number;       // 拖拽起始宽度
  currentWidth: number;     // 当前宽度
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection**: After analyzing all acceptance criteria, I identified several areas where properties could be consolidated to eliminate redundancy and provide more comprehensive validation:

- Properties 1.4 and 1.5 (boundary enforcement) are combined into a single comprehensive width constraint property
- Properties 2.1, 2.3, and 4.4 (animation consistency) are consolidated into one animation behavior property  
- Properties 5.1, 5.2, and 5.3 (persistence) are unified into a comprehensive round-trip property
- Properties 3.1 and 3.2 (responsive behavior) are combined into a single responsive state property
- Properties 4.1 and 4.2 (keyboard shortcuts) are merged into one keyboard interaction property

### Property 1: Width constraint enforcement
*For any* sidebar resize operation (drag, programmatic, or restoration), the resulting width should always be within the configured minimum and maximum bounds, and widths below the collapse threshold should trigger automatic collapse.
**Validates: Requirements 1.4, 1.5**

### Property 2: Real-time drag responsiveness
*For any* drag operation on a resize handle, the sidebar width should update in real-time during the drag, with visual feedback indicating the interactive state.
**Validates: Requirements 1.1, 1.2**

### Property 3: Persistence round-trip integrity
*For any* sidebar state changes (width adjustments, visibility toggles), the state should be immediately persisted to localStorage and correctly restored on application load, with invalid stored values falling back to safe defaults.
**Validates: Requirements 1.3, 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 4: Animation and state consistency
*For any* sidebar state change (collapse/expand via button or keyboard), the animation should complete smoothly and the final state should match the intended target, with keyboard shortcuts producing identical results to mouse interactions.
**Validates: Requirements 2.1, 2.3, 2.5, 4.4**

### Property 5: Keyboard interaction completeness
*For any* keyboard shortcut (Ctrl/Cmd + [ for left, Ctrl/Cmd + ] for right, Escape during drag), the system should respond with the correct sidebar action and maintain proper accessibility states.
**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 6: Responsive breakpoint behavior
*For any* viewport width change, when below tablet breakpoint (768px) both sidebars should collapse, and when above breakpoint they should restore previous states while maintaining appropriate proportions.
**Validates: Requirements 3.1, 3.2, 3.4**

### Property 7: Touch and accessibility support
*For any* touch interaction or accessibility requirement, the system should provide touch-friendly resize handles, proper ARIA attributes, and correct overflow handling.
**Validates: Requirements 2.2, 2.4, 3.3, 3.5**

## Error Handling

### 1. localStorage 不可用

**场景**: 用户浏览器禁用了 localStorage 或处于隐私模式

**处理策略**:
- 使用 try-catch 包裹所有 localStorage 操作
- 失败时使用内存状态，不影响功能
- 在控制台输出警告信息
- 不向用户显示错误提示（降级体验）

```typescript
function safeLocalStorageGet(key: string, fallback: any) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (err) {
    console.warn(`localStorage read failed for key "${key}":`, err);
    return fallback;
  }
}
```

### 2. 拖拽事件异常

**场景**: 拖拽过程中鼠标移出窗口、页面失焦等

**处理策略**:
- 监听 `mouseleave` 和 `blur` 事件
- 自动结束拖拽操作
- 保存当前宽度状态
- 清理全局事件监听器

### 3. 无效的持久化数据

**场景**: localStorage 中存储的数据格式错误或超出范围

**处理策略**:
- 验证加载的数据类型和范围
- 使用 Zod 或类似库进行运行时验证
- 无效数据时使用默认值
- 清除无效的 localStorage 条目

### 4. 动画性能问题

**场景**: 低性能设备上动画卡顿

**处理策略**:
- 使用 CSS transitions 而非 JavaScript 动画
- 使用 `will-change` 提示浏览器优化
- 提供 `prefers-reduced-motion` 媒体查询支持
- 拖拽时禁用过渡动画，提升响应速度

## Testing Strategy

### Unit Tests

使用 Vitest 进行单元测试，覆盖以下场景：

1. **useSidebarResize composable**
   - 初始化状态正确
   - 宽度边界验证
   - 折叠/展开逻辑
   - 事件处理函数

2. **useSidebarPersistence composable**
   - 保存和加载状态
   - 无效数据处理
   - localStorage 不可用降级

3. **ResizeHandle 组件**
   - Props 传递正确
   - 事件触发正确
   - 视觉状态切换

### Property-Based Tests

使用 **fast-check** 库进行属性测试，每个测试运行至少 100 次迭代。

**测试库选择**: fast-check（TypeScript/JavaScript 的 PBT 库）

**测试标注格式**: 每个 PBT 测试必须包含注释：
```typescript
// Feature: sidebar-optimization, Property 1: Width boundary enforcement
```

**属性测试用例**:

1. **Property 1: Width boundary enforcement**
   - 生成随机宽度值（包括负数、超大值、小数）
   - 验证 `setWidth` 函数总是返回在 [minWidth, maxWidth] 范围内的值

2. **Property 2: Collapse threshold consistency**
   - 生成随机宽度序列
   - 验证宽度低于阈值时自动折叠，展开时恢复到至少 minWidth

3. **Property 3: State persistence round-trip**
   - 生成随机侧边栏状态
   - 验证 save → load 后状态等价

4. **Property 4: Animation completion integrity**
   - 模拟动画完成事件
   - 验证最终宽度与目标宽度一致

5. **Property 5: Keyboard shortcut equivalence**
   - 对比键盘快捷键和按钮点击的状态变化
   - 验证两者产生相同结果

6. **Property 6: Responsive breakpoint behavior**
   - 生成随机视口宽度
   - 验证断点前后的折叠状态正确

7. **Property 7: Drag cancellation idempotence**
   - 生成随机拖拽序列
   - 验证 Escape 取消后宽度恢复到初始值

8. **Property 8: Storage validation safety**
   - 生成随机无效数据（null、undefined、字符串、超范围数字）
   - 验证加载函数总是返回有效默认值，不抛出异常

### Integration Tests

1. **完整拖拽流程**
   - 模拟用户拖拽调整宽度
   - 验证视觉反馈和状态更新
   - 验证持久化成功

2. **键盘快捷键集成**
   - 模拟键盘事件
   - 验证侧边栏响应
   - 验证焦点管理

3. **响应式布局切换**
   - 模拟视口大小变化
   - 验证布局自动调整
   - 验证状态恢复

## Implementation Notes

### 性能优化

1. **防抖和节流**
   - 拖拽时使用 `requestAnimationFrame` 优化更新频率
   - localStorage 保存使用防抖（300ms）

2. **CSS 优化**
   - 使用 `transform` 而非 `width` 进行动画（GPU 加速）
   - 拖拽时添加 `will-change: width` 提示

3. **事件监听器管理**
   - 使用 `onMounted` 和 `onUnmounted` 正确清理
   - 避免内存泄漏

### 可访问性

1. **ARIA 属性**
   - 折叠按钮添加 `aria-expanded` 和 `aria-controls`
   - 拖拽手柄添加 `role="separator"` 和 `aria-orientation`

2. **键盘导航**
   - 拖拽手柄可通过 Tab 聚焦
   - 支持方向键微调宽度（可选增强）

3. **屏幕阅读器**
   - 提供状态变化的语音反馈
   - 使用 `aria-live` 区域通知宽度变化

### 浏览器兼容性

- 目标浏览器：Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- 使用 Vite 的自动 polyfill
- 触摸事件需要 passive 监听器优化滚动性能