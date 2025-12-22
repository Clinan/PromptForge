# Design Document

## Overview

本设计文档描述了 TruestPrompt Slot 卡片中模型思考过程（Thinking Output）展示功能的实现方案。该功能允许用户查看支持推理的模型（如 Claude、DeepSeek）在生成最终答案前的思考链，并提供可折叠的 UI 以保持界面整洁。

设计遵循以下原则：
- **渐进增强**：不影响不支持 thinking 的模型的正常使用
- **UI 美学**：思考内容与主输出视觉区分，折叠动画流畅
- **数据完整性**：thinking 内容完整保存到历史记录
- **代码质量**：扩展现有类型系统，保持向后兼容

## Architecture

### 数据流架构

```
API Response (with thinking)
       ↓
Plugin (parse & emit chunks)
       ↓
PluginChunk { type: 'thinking', text: string }
       ↓
App.vue (accumulate thinking)
       ↓
Slot.thinking (reactive state)
       ↓
SlotCard.vue (render with collapse)
       ↓
HistoryItem (persist thinking snapshot)
```

### 组件层次

```
SlotCard.vue
├── slot-card__head (标题栏)
├── slot-form (配置表单)
├── param-chips (参数标签)
├── slot-collapse (参数覆盖)
├── system-field (System Prompt)
├── slot-thinking (新增 - 思考输出区)
│   ├── thinking-header (标题 + 折叠按钮)
│   └── thinking-content (可折叠内容)
├── slot-output (主输出区)
└── slot-toolcalls (工具调用区)
```

## Components and Interfaces

### 1. 扩展 PluginChunk 类型

```typescript
// src/types.ts
export type PluginChunk =
  | { type: 'content'; text: string }
  | { type: 'thinking'; text: string }  // 新增
  | { type: 'tool_calls'; toolCalls: ToolCall[] }
  | { type: 'usage'; tokens: SlotMetrics['tokens'] };
```

### 2. 扩展 Slot 类型

```typescript
// src/types.ts
export type Slot = {
  // ... existing fields
  thinking: string;  // 新增：思考输出内容
};
```

### 3. 扩展 HistoryItem 类型

```typescript
// src/types.ts
export type HistoryItem = {
  // ... existing fields
  responseSnapshot: {
    outputText: string;
    thinking?: string;  // 新增：思考输出快照
    toolCalls?: ToolCall[];
    usage?: SlotMetrics['tokens'];
    metrics: { ttfbMs: number | null; totalMs: number | null };
  };
};
```

### 4. SlotCard 组件扩展

**新增 Props**:
```typescript
interface SlotCardProps {
  // ... existing props
  slot: Slot;  // slot.thinking 字段
}
```

**新增内部状态**:
```typescript
// 每个 SlotCard 实例独立的折叠状态
const thinkingCollapsed = ref(false);

// 当 slot 重新运行时重置折叠状态
watch(() => props.slot.status, (status) => {
  if (status === 'running') {
    thinkingCollapsed.value = false;
  }
});
```

**计算属性**:
```typescript
const shouldShowThinking = computed(() => 
  props.slot.status === 'running' || (props.slot.thinking?.length || 0) > 0
);

const thinkingPreview = computed(() => {
  const text = props.slot.thinking || '';
  return `${text.length} 字符`;
});
```

### 5. Plugin 扩展（以 OpenAI 兼容插件为例）

```typescript
// 解析 API 响应中的 thinking 内容
function* parseStreamChunk(chunk: any): Generator<PluginChunk> {
  // 处理 thinking 内容（不同 provider 格式不同）
  if (chunk.choices?.[0]?.delta?.reasoning_content) {
    yield { type: 'thinking', text: chunk.choices[0].delta.reasoning_content };
  }
  // 处理常规内容
  if (chunk.choices?.[0]?.delta?.content) {
    yield { type: 'content', text: chunk.choices[0].delta.content };
  }
  // ... tool_calls, usage 处理
}
```

## Data Models

### ThinkingState

```typescript
// SlotCard 内部状态
interface ThinkingState {
  collapsed: boolean;  // 是否折叠
}
```

### 扩展后的 Slot

```typescript
interface Slot {
  id: string;
  providerProfileId: string | null;
  pluginId: string;
  modelId: string;
  systemPrompt: string;
  paramOverride: Record<string, unknown> | null;
  selected: boolean;
  status: 'idle' | 'running' | 'done' | 'error' | 'canceled';
  output: string;
  thinking: string;  // 新增
  toolCalls: ToolCall[] | null;
  metrics: SlotMetrics;
  historyId?: string;
  isExporting?: boolean;
}
```

### 扩展后的 HistoryItem.responseSnapshot

```typescript
interface ResponseSnapshot {
  outputText: string;
  thinking?: string;  // 新增
  toolCalls?: ToolCall[];
  usage?: SlotMetrics['tokens'];
  metrics: { ttfbMs: number | null; totalMs: number | null };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Thinking visibility consistency
*For any* Slot with non-empty thinking content, the thinking section should be visible; for any Slot with empty/null thinking, the thinking section should be hidden.
**Validates: Requirements 1.1, 1.3**

### Property 2: Thinking accumulation correctness
*For any* sequence of thinking chunks received during streaming, the accumulated thinking content should equal the concatenation of all chunk texts in order.
**Validates: Requirements 1.2**

### Property 3: Collapse indicator accuracy
*For any* collapsed thinking panel, the displayed character count should equal the actual length of the thinking content string.
**Validates: Requirements 2.3**

### Property 4: Collapse state reset on run
*For any* Slot that transitions to 'running' status, the thinking collapse state should reset to expanded (collapsed = false).
**Validates: Requirements 2.5**

### Property 5: Collapse state isolation
*For any* two distinct Slots, changing the thinking collapse state of one Slot should not affect the collapse state of the other Slot.
**Validates: Requirements 3.1, 3.2**

### Property 6: Plugin thinking chunk emission
*For any* API response containing thinking/reasoning content, the plugin should emit a PluginChunk with type 'thinking' containing the extracted text.
**Validates: Requirements 4.1**

### Property 7: Thinking serialization round-trip
*For any* valid thinking content string, serializing to history format and deserializing back should produce an equivalent string.
**Validates: Requirements 4.2, 4.4**

### Property 8: History thinking preservation
*For any* Slot with thinking content saved to history, loading that history item should restore the exact same thinking content to the Slot.
**Validates: Requirements 5.1, 5.2, 5.3**

## Error Handling

### 1. 空 thinking 内容

**场景**: 模型不支持 thinking 或未返回 thinking 内容

**处理策略**:
- `slot.thinking` 初始化为空字符串 `''`
- UI 层通过 `shouldShowThinking` 计算属性判断是否显示
- 不显示任何错误提示，静默降级

### 2. 流式中断

**场景**: thinking 流式输出过程中连接中断

**处理策略**:
- 保留已接收的 thinking 内容
- 状态设为 'error' 或 'canceled'
- thinking 区域显示已接收的部分内容

### 3. 历史数据兼容

**场景**: 加载不包含 thinking 字段的旧历史记录

**处理策略**:
- 使用可选链 `responseSnapshot.thinking ?? ''`
- 旧数据自动兼容，thinking 显示为空

### 4. 超长 thinking 内容

**场景**: 模型返回非常长的 thinking 内容

**处理策略**:
- thinking 区域使用 `max-height` 和 `overflow-y: auto`
- 折叠状态下只显示字符数，不截断预览
- 展开时完整显示，用户可滚动查看

## Testing Strategy

### Unit Tests

使用 Vitest 进行单元测试：

1. **Slot 类型扩展**
   - 验证 Slot 对象包含 thinking 字段
   - 验证默认值为空字符串

2. **HistoryItem 类型扩展**
   - 验证 responseSnapshot 包含可选 thinking 字段
   - 验证旧数据兼容性

3. **Plugin chunk 解析**
   - 验证 thinking chunk 正确解析
   - 验证不同 provider 格式处理

### Property-Based Tests

使用 **fast-check** 库进行属性测试，每个测试运行至少 100 次迭代。

**测试标注格式**: 每个 PBT 测试必须包含注释：
```typescript
// Feature: thinking-output, Property N: Property description
```

**属性测试用例**:

1. **Property 1: Thinking visibility consistency**
   - 生成随机 thinking 字符串（包括空字符串）
   - 验证 `shouldShowThinking` 计算结果与 thinking 非空一致

2. **Property 2: Thinking accumulation correctness**
   - 生成随机 thinking chunk 序列
   - 验证累加结果等于所有 chunk 拼接

3. **Property 3: Collapse indicator accuracy**
   - 生成随机 thinking 字符串
   - 验证显示的字符数等于 `thinking.length`

4. **Property 4: Collapse state reset on run**
   - 生成随机初始折叠状态
   - 模拟状态变为 'running'
   - 验证折叠状态重置为 false

5. **Property 5: Collapse state isolation**
   - 生成两个随机 Slot
   - 修改一个的折叠状态
   - 验证另一个不受影响

6. **Property 6: Plugin thinking chunk emission**
   - 生成随机 API 响应格式
   - 验证包含 thinking 时正确 emit chunk

7. **Property 7: Thinking serialization round-trip**
   - 生成随机 thinking 字符串
   - 验证 serialize → deserialize 等价

8. **Property 8: History thinking preservation**
   - 生成随机 Slot 状态（含 thinking）
   - 保存到 history，再加载
   - 验证 thinking 内容一致

### Integration Tests

1. **完整流式流程**
   - 模拟 API 返回 thinking + content 混合流
   - 验证 UI 正确分离显示

2. **历史记录流程**
   - 运行带 thinking 的请求
   - 保存到历史
   - 加载历史
   - 验证 thinking 完整恢复

## Implementation Notes

### CSS 样式

```css
.slot-thinking {
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  background: var(--color-bg-thinking);  /* 区分于主输出的背景色 */
}

.slot-thinking__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  user-select: none;
}

.slot-thinking__content {
  max-height: 300px;
  overflow-y: auto;
  padding: var(--spacing-md);
  transition: max-height 0.3s ease;
}

.slot-thinking__content--collapsed {
  max-height: 0;
  padding: 0 var(--spacing-md);
  overflow: hidden;
}

.slot-thinking__indicator {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
```

### 向后兼容

1. **类型兼容**: `thinking` 字段使用空字符串默认值，不影响现有代码
2. **历史兼容**: `responseSnapshot.thinking` 为可选字段，旧数据自动兼容
3. **插件兼容**: 不支持 thinking 的插件无需修改，只是不 emit thinking chunk
