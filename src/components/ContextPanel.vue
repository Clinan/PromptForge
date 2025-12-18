<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { SharedState } from '../types';
import { newId } from '../lib/id';
import JsonEditor from './JsonEditor.vue';

const props = defineProps<{
  shared: SharedState;
  activeTab: 'parameters' | 'tools' | 'variables';
  showDiffOnly: boolean;
}>();

const emit = defineEmits<{
  'update:activeTab': ['parameters' | 'tools' | 'variables'];
  'update:showDiffOnly': [boolean];
}>();

const tabProxy = computed({
  get: () => props.activeTab,
  set: (val: 'parameters' | 'tools' | 'variables') => emit('update:activeTab', val)
});

const showDiffProxy = computed({
  get: () => props.showDiffOnly,
  set: (val: boolean) => emit('update:showDiffOnly', val)
});

const toolsError = ref<string | null>(null);
const toolsSuccess = ref<string | null>(null);
const selectedToolIndex = ref(0);
const showToolsModal = ref(false);
const lastNonToolsTab = ref<'parameters' | 'variables'>('parameters');
const selectedToolForm = reactive({
  name: '',
  description: ''
});
const selectedToolSchemaText = ref('');
const toolSchemaError = ref<string | null>(null);

watch(
  () => props.activeTab,
  (tab) => {
    if (tab === 'tools') {
      showToolsModal.value = true;
    } else {
      lastNonToolsTab.value = tab;
      showToolsModal.value = false;
    }
  },
  { immediate: true }
);

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
    toolSchemaError.value = null;
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
  const list = getToolsListForMutation();
  if (!list) return;
  const draft = {
    name: `tool_${(list as unknown[]).length + 1}`,
    description: 'Describe usage',
    schema: defaultToolSchema()
  };
  const next = Array.isArray(list) ? [...list, draft] : [draft];
  props.shared.toolsDefinition = JSON.stringify(next, null, 2);
  toolsError.value = null;
  toolsSuccess.value = '已追加新的 Tool 模板';
  selectedToolIndex.value = next.length - 1;
}

const activeToolLabel = computed(() => {
  if (!parsedTools.value.length) return 'Tool 详情';
  return getToolName(parsedTools.value[selectedToolIndex.value]) || `工具 ${selectedToolIndex.value + 1}`;
});

watch(
  [parsedTools, selectedToolIndex],
  () => {
    syncSelectedToolForm();
  },
  { immediate: true }
);

function defaultToolSchema() {
  return {
    type: 'object',
    properties: {},
    additionalProperties: true
  };
}

function getToolName(tool: unknown) {
  if (!tool || typeof tool !== 'object') return '';
  const record = tool as Record<string, any>;
  if (typeof record.name === 'string') return record.name;
  if (record.function && typeof record.function === 'object' && typeof record.function.name === 'string') {
    return record.function.name;
  }
  return '';
}

function getToolDescription(tool: unknown) {
  if (!tool || typeof tool !== 'object') return '';
  const record = tool as Record<string, any>;
  if (typeof record.description === 'string') return record.description;
  if (record.function && typeof record.function === 'object' && typeof record.function.description === 'string') {
    return record.function.description;
  }
  return '';
}

function getToolSchema(tool: unknown) {
  if (!tool || typeof tool !== 'object') return defaultToolSchema();
  const record = tool as Record<string, any>;
  const schema =
    (record.schema && typeof record.schema === 'object' && record.schema !== null && record.schema) ||
    (record.parameters && typeof record.parameters === 'object' && record.parameters !== null && record.parameters) ||
    (record.function &&
      typeof record.function === 'object' &&
      record.function !== null &&
      record.function.parameters &&
      typeof record.function.parameters === 'object' &&
      record.function.parameters !== null &&
      record.function.parameters) ||
    null;
  return schema ? schema : defaultToolSchema();
}

function cloneTool(tool: unknown) {
  if (!tool || typeof tool !== 'object') return {};
  return JSON.parse(JSON.stringify(tool)) as Record<string, any>;
}

function getToolsListForMutation() {
  try {
    return parseToolsDefinition();
  } catch (err) {
    toolsError.value = err instanceof Error ? err.message : 'JSON 解析失败';
    return null;
  }
}

function writeToolsDefinition(list: unknown[]) {
  props.shared.toolsDefinition = list.length ? JSON.stringify(list, null, 2) : '[]';
}

function updateToolAt(index: number, mutator: (tool: Record<string, any>) => void) {
  const list = getToolsListForMutation();
  if (!list || !Array.isArray(list) || !list[index]) return;
  const nextList = [...list];
  const current = cloneTool(nextList[index]);
  mutator(current);
  nextList[index] = current;
  writeToolsDefinition(nextList);
}

type ToolPatch = {
  name?: string;
  description?: string;
  schema?: unknown;
};

function applyToolPatch(index: number, patch: ToolPatch) {
  updateToolAt(index, (tool) => {
    const fn = tool.function && typeof tool.function === 'object' ? tool.function : null;
    if (patch.name !== undefined) {
      tool.name = patch.name;
      if (fn) {
        fn.name = patch.name;
      }
    }
    if (patch.description !== undefined) {
      tool.description = patch.description;
      if (fn) {
        fn.description = patch.description;
      }
    }
    if (patch.schema !== undefined) {
      tool.schema = patch.schema;
      if (tool.parameters && typeof tool.parameters === 'object') {
        tool.parameters = patch.schema;
      }
      if (fn) {
        fn.parameters = patch.schema;
      }
    }
  });
}

function syncSelectedToolForm() {
  const tool = parsedTools.value[selectedToolIndex.value];
  if (!tool) {
    selectedToolForm.name = '';
    selectedToolForm.description = '';
    selectedToolSchemaText.value = JSON.stringify(defaultToolSchema(), null, 2);
    toolSchemaError.value = null;
    return;
  }
  selectedToolForm.name = getToolName(tool);
  selectedToolForm.description = getToolDescription(tool);
  selectedToolSchemaText.value = JSON.stringify(getToolSchema(tool), null, 2);
  toolSchemaError.value = null;
}

function handleSelectedToolNameInput(event: Event) {
  if (!parsedTools.value.length) return;
  const value = (event.target as HTMLInputElement).value;
  selectedToolForm.name = value;
  applyToolPatch(selectedToolIndex.value, { name: value });
}

function handleSelectedToolDescriptionInput(event: Event) {
  if (!parsedTools.value.length) return;
  const value = (event.target as HTMLTextAreaElement).value;
  selectedToolForm.description = value;
  applyToolPatch(selectedToolIndex.value, { description: value });
}

function updateSelectedToolSchema(value: string) {
  if (!parsedTools.value.length) return;
  selectedToolSchemaText.value = value;
  const source = value.trim() ? value : JSON.stringify(defaultToolSchema());
  try {
    const parsed = JSON.parse(source);
    toolSchemaError.value = null;
    applyToolPatch(selectedToolIndex.value, { schema: parsed });
  } catch (err) {
    toolSchemaError.value = err instanceof Error ? err.message : 'JSON 解析失败';
  }
}

function removeTool(index: number) {
  const list = getToolsListForMutation();
  if (!list || !list.length) return;
  const next = list.filter((_, idx) => idx !== index);
  writeToolsDefinition(next);
  toolsError.value = null;
  toolsSuccess.value = '已删除 1 个 Tool';
  if (selectedToolIndex.value >= next.length) {
    selectedToolIndex.value = Math.max(0, next.length - 1);
  }
  if (!next.length) {
    selectedToolSchemaText.value = JSON.stringify(defaultToolSchema(), null, 2);
  }
}

watch(
  () => props.shared.variables,
  (list) => {
    const isBlank = (item: { key: string; value: string }) => !item.key.trim() && !item.value.trim();
    const source = Array.isArray(list) ? list : [];
    const cleaned = source.filter((item, idx) => !isBlank(item) || idx === source.length - 1);
    if (!cleaned.length) {
      props.shared.variables = [createVariable()];
      return;
    }
    const last = cleaned[cleaned.length - 1]!;
    if (!isBlank(last)) {
      props.shared.variables = [...cleaned, createVariable()];
      return;
    }
    if (cleaned.length !== source.length) {
      props.shared.variables = cleaned;
    }
  },
  { deep: true, immediate: true }
);

function createVariable() {
  return {
    id: newId(),
    key: '',
    value: ''
  };
}

function closeToolsModal() {
  showToolsModal.value = false;
  if (tabProxy.value === 'tools') {
    tabProxy.value = lastNonToolsTab.value;
  }
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
      <div class="param-banner">以下配置会同步应用到所有 Slots。</div>

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

      <div class="param-flags">
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
    </div>

    <div v-else-if="tabProxy === 'tools'" class="context-panel__body tools-tab">
      <div class="sidebar-empty">工具配置会自动在中央弹窗中打开，可在关闭后返回此处。</div>
    </div>

    <div v-else class="context-panel__body">
      <div class="variables-head">
        <div>
          <div class="panel-subtitle">Variables</div>
          <div class="small-text">用于模板中的占位符</div>
          <div class="small-text">
            在 Prompt Composer 或 Slot 文本中使用 <code v-pre>{{ VARIABLE_NAME }}</code> 即可引用对应值。
          </div>
        </div>
      </div>
      <div class="variables-list">
        <div v-for="variable in props.shared.variables" :key="variable.id" class="variable-row">
          <input type="text" v-model="variable.key" placeholder="变量名，如 USER_NAME" />
          <input type="text" v-model="variable.value" placeholder="示例值" />
        </div>
      </div>
    </div>
  </aside>

  <div v-if="showToolsModal" class="modal-mask" @click.self="closeToolsModal">
    <div class="modal tools-modal" role="dialog" aria-modal="true">
      <div class="tools-modal__head">
        <div>
          <div class="panel-title">Tools 配置</div>
          <div class="panel-subtitle">集中管理工具 JSON 定义</div>
        </div>
        <button class="ghost pill" @click="closeToolsModal">关闭</button>
      </div>
      <div class="tools-modal__body">
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
              <div>
                <div class="panel-subtitle">{{ activeToolLabel }}</div>
                <div class="small-text">定义工具名称、描述与参数</div>
              </div>
              <div class="row gap-small">
                <button class="ghost pill" @click="formatTools">Format JSON</button>
                <button class="ghost pill" @click="validateTools">Validate JSON</button>
                <button class="ghost pill danger" :disabled="!parsedTools.length" @click="removeTool(selectedToolIndex)">删除</button>
              </div>
            </div>
            <div v-if="parsedTools.length" class="tool-detail">
              <label>
                <span>名称</span>
                <input type="text" :value="selectedToolForm.name" @input="handleSelectedToolNameInput" placeholder="tool_name" />
              </label>
              <label>
                <span>描述</span>
                <textarea
                  :value="selectedToolForm.description"
                  @input="handleSelectedToolDescriptionInput"
                  placeholder="Describe usage"
                  rows="2"
                ></textarea>
              </label>
              <label>
                <span>参数 Schema（JSON）</span>
                <JsonEditor
                  class="tools-textarea tool-schema-editor"
                  :modelValue="selectedToolSchemaText"
                  @update:modelValue="updateSelectedToolSchema"
                />
              </label>
              <div v-if="toolSchemaError" class="form-hint error">{{ toolSchemaError }}</div>
            </div>
            <div v-else class="sidebar-empty">暂无工具，点击左侧 Add Tool 新增。</div>
            <div class="tool-raw-editor">
              <div class="small-text">Raw JSON（高级编辑）</div>
              <JsonEditor
                class="tools-textarea"
                v-model="props.shared.toolsDefinition"
                placeholder='[{"name":"fetchDocs","description":"..."}]'
              />
            </div>
            <div v-if="toolsError" class="form-hint error">{{ toolsError }}</div>
            <div v-else-if="toolsSuccess" class="form-hint success">{{ toolsSuccess }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
