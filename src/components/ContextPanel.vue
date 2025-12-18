<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SharedState } from '../types';
import { newId } from '../lib/id';

const props = defineProps<{
  shared: SharedState;
  activeTab: 'parameters' | 'tools' | 'variables';
  paramApplyMode: 'all' | 'new';
  showDiffOnly: boolean;
}>();

const emit = defineEmits<{
  'update:activeTab': ['parameters' | 'tools' | 'variables'];
  'update:paramApplyMode': ['all' | 'new'];
  'update:showDiffOnly': [boolean];
}>();

const tabProxy = computed({
  get: () => props.activeTab,
  set: (val: 'parameters' | 'tools' | 'variables') => emit('update:activeTab', val)
});

const applyModeProxy = computed({
  get: () => props.paramApplyMode,
  set: (val: 'all' | 'new') => emit('update:paramApplyMode', val)
});

const showDiffProxy = computed({
  get: () => props.showDiffOnly,
  set: (val: boolean) => emit('update:showDiffOnly', val)
});

const toolsError = ref<string | null>(null);
const toolsSuccess = ref<string | null>(null);
const selectedToolIndex = ref(0);
const variables = ref<{ id: string; key: string; value: string }[]>([]);

function parseToolsDefinition() {
  const raw = props.shared.toolsDefinition?.trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray((parsed as any).tools)) {
    return (parsed as any).tools as unknown[];
  }
  throw new Error('JSON 应包含数组或 { tools: [] } 结构');
}

const parsedTools = computed(() => {
  try {
    toolsError.value = null;
    return parseToolsDefinition();
  } catch (err) {
    toolsError.value = err instanceof Error ? err.message : 'JSON 解析失败';
    return [];
  }
});

watch(
  parsedTools,
  (list) => {
    if (list.length === 0) {
      selectedToolIndex.value = 0;
    } else if (selectedToolIndex.value >= list.length) {
      selectedToolIndex.value = list.length - 1;
    }
  },
  { immediate: true }
);

watch(
  () => props.shared.toolsDefinition,
  () => {
    toolsSuccess.value = null;
  }
);

function formatTools() {
  try {
    const parsed = parseToolsDefinition();
    props.shared.toolsDefinition = JSON.stringify(parsed, null, 2);
    toolsError.value = null;
    toolsSuccess.value = `已格式化 ${parsed.length} 个工具定义`;
  } catch (err) {
    toolsError.value = err instanceof Error ? err.message : 'JSON 解析失败';
    toolsSuccess.value = null;
  }
}

function validateTools() {
  try {
    parseToolsDefinition();
    toolsError.value = null;
    toolsSuccess.value = 'JSON 校验通过';
  } catch (err) {
    toolsError.value = err instanceof Error ? err.message : 'JSON 解析失败';
    toolsSuccess.value = null;
  }
}

function addTool() {
  let list: unknown[];
  try {
    list = parseToolsDefinition();
  } catch {
    list = [];
  }
  const draft = {
    name: `tool_${(list as unknown[]).length + 1}`,
    description: 'Describe usage',
    schema: {
      type: 'object',
      properties: {},
      additionalProperties: true
    }
  };
  const next = Array.isArray(list) ? [...list, draft] : [draft];
  props.shared.toolsDefinition = JSON.stringify(next, null, 2);
  toolsError.value = null;
  toolsSuccess.value = '已追加新的 Tool 模板';
}

function addVariable() {
  variables.value = [
    ...variables.value,
    {
      id: newId(),
      key: `VAR_${variables.value.length + 1}`,
      value: ''
    }
  ];
}
</script>

<template>
  <aside class="context-panel__shell card">
    <div class="context-panel__head">
      <div class="panel-title">Context Panel</div>
      <div class="panel-subtitle">管理参数、工具、变量上下文。</div>
    </div>
    <div class="context-tabs">
      <button
        v-for="tab in ['parameters', 'tools', 'variables']"
        :key="tab"
        class="context-tab"
        :class="{ active: tabProxy === tab }"
        @click="tabProxy = tab as 'parameters' | 'tools' | 'variables'"
      >
        {{ tab === 'parameters' ? 'Parameters' : tab === 'tools' ? 'Tools' : 'Variables' }}
      </button>
    </div>

    <div v-if="tabProxy === 'parameters'" class="context-panel__body">
      <div class="segmented-control">
        <button :class="{ active: applyModeProxy === 'all' }" @click="applyModeProxy = 'all'">应用至全部 Slot</button>
        <button :class="{ active: applyModeProxy === 'new' }" @click="applyModeProxy = 'new'">仅用于新建 Slot</button>
      </div>

      <div class="form-grid">
        <label>
          <span>temperature</span>
          <input type="number" step="0.1" v-model.number="props.shared.defaultParams.temperature" />
        </label>
        <label>
          <span>top_p</span>
          <input type="number" step="0.1" v-model.number="props.shared.defaultParams.top_p" />
        </label>
        <label>
          <span>max_tokens</span>
          <input type="number" v-model.number="props.shared.defaultParams.max_tokens" />
        </label>
        <label>
          <span>stop</span>
          <input type="text" v-model="props.shared.defaultParams.stop" />
        </label>
        <label>
          <span>presence_penalty</span>
          <input type="number" step="0.1" v-model.number="props.shared.defaultParams.presence_penalty" />
        </label>
        <label>
          <span>frequency_penalty</span>
          <input type="number" step="0.1" v-model.number="props.shared.defaultParams.frequency_penalty" />
        </label>
      </div>

      <label class="switch-row">
        <input type="checkbox" v-model="props.shared.enableSuggestions" />
        <span>启用联想建议</span>
      </label>
      <label class="switch-row">
        <input type="checkbox" v-model="props.shared.streamOutput" />
        <span>启用流式输出</span>
      </label>
      <label class="switch-row">
        <input type="checkbox" v-model="showDiffProxy" />
        <span>Show only diffs（仅展示不同参数）</span>
      </label>
    </div>

    <div v-else-if="tabProxy === 'tools'" class="context-panel__body tools-tab">
      <div class="tools-layout">
        <div class="tools-list">
          <div class="tools-list__head">
            <div class="panel-subtitle">Tools 列表</div>
            <button class="text-button" @click="addTool">Add Tool</button>
          </div>
          <div class="tools-list__items">
            <button
              v-for="(tool, index) in parsedTools"
              :key="index"
              class="tool-row"
              :class="{ active: selectedToolIndex === index }"
              @click="selectedToolIndex = index"
            >
              <div class="tool-row__name">{{ (tool as any).name || `工具 ${index + 1}` }}</div>
              <div class="tool-row__desc">{{ (tool as any).description || '未填写描述' }}</div>
            </button>
            <div v-if="!parsedTools.length" class="sidebar-empty">暂无工具，点击右侧按钮新增。</div>
          </div>
        </div>
        <div class="tools-editor">
          <div class="tools-editor__head">
            <div class="panel-subtitle">JSON Editor</div>
            <div class="row gap-small">
              <button class="ghost pill" @click="formatTools">Format JSON</button>
              <button class="ghost pill" @click="validateTools">Validate JSON</button>
            </div>
          </div>
          <textarea
            class="tools-textarea"
            v-model="props.shared.toolsDefinition"
            placeholder='[{"name":"fetchDocs","description":"..."}]'
          />
          <div v-if="toolsError" class="form-hint error">{{ toolsError }}</div>
          <div v-else-if="toolsSuccess" class="form-hint success">{{ toolsSuccess }}</div>
        </div>
      </div>
    </div>

    <div v-else class="context-panel__body">
      <div class="variables-head">
        <div>
          <div class="panel-subtitle">Variables</div>
          <div class="small-text">用于模板中的占位符</div>
        </div>
        <button class="ghost pill" @click="addVariable">Add Variable</button>
      </div>
      <div v-if="!variables.length" class="sidebar-empty">
        暂无变量，点击 “Add Variable” 创建占位。
      </div>
      <div v-else class="variables-list">
        <div v-for="variable in variables" :key="variable.id" class="variable-row">
          <input type="text" v-model="variable.key" placeholder="变量名，如 USER_NAME" />
          <input type="text" v-model="variable.value" placeholder="示例值" />
        </div>
      </div>
    </div>
  </aside>
</template>
