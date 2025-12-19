<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Switch, Tabs, Typography } from 'ant-design-vue';
import type { SharedState } from '../types';
import { newId } from '../lib/id';
import JsonEditor from './JsonEditor.vue';

const { Text: TypographyText, Title: TypographyTitle } = Typography;
const FormItem = Form.Item;

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
const showToolsModal = ref(false);
const lastNonToolsTab = ref<'parameters' | 'variables'>('parameters');

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

watch(
  () => props.shared.toolsDefinition,
  () => {
    toolsSuccess.value = null;
    toolsError.value = null;
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
  <Card size="small" class="context-panel">
    <Space direction="vertical" size="middle" style="width: 100%">
      <div>
        <TypographyTitle level="4" style="margin-bottom: 4px">Context Panel</TypographyTitle>
        <TypographyText type="secondary">管理参数、工具、变量上下文。</TypographyText>
      </div>

      <Tabs v-model:activeKey="tabProxy" type="card">
        <Tabs.TabPane key="parameters" tab="Parameters">
          <Space direction="vertical" size="middle" style="width: 100%">
            <TypographyText type="secondary">以下配置会同步应用到所有 Slots。</TypographyText>
            <Form layout="vertical">
              <FormItem label="temperature">
                <InputNumber v-model:value="props.shared.defaultParams.temperature" :step="0.1" style="width: 100%" />
              </FormItem>
              <FormItem label="top_p">
                <InputNumber v-model:value="props.shared.defaultParams.top_p" :step="0.1" style="width: 100%" />
              </FormItem>
              <FormItem label="max_tokens">
                <InputNumber v-model:value="props.shared.defaultParams.max_tokens" :step="1" style="width: 100%" />
              </FormItem>
            </Form>

            <Space direction="vertical" size="small">
              <Space align="center" size="middle">
                <Switch v-model:checked="props.shared.enableSuggestions" />
                <TypographyText>启用联想建议</TypographyText>
              </Space>
              <Space align="center" size="middle">
                <Switch v-model:checked="props.shared.streamOutput" />
                <TypographyText>启用流式输出</TypographyText>
              </Space>
              <Space align="center" size="middle">
                <Switch v-model:checked="showDiffProxy" />
                <TypographyText>Show only diffs（仅展示不同参数）</TypographyText>
              </Space>
            </Space>
          </Space>
        </Tabs.TabPane>

        <Tabs.TabPane key="tools" tab="Tools">
          <TypographyText type="secondary">Tools 配置在弹窗中维护 JSON 数组，关闭后可返回此处。</TypographyText>
          <div style="margin-top: 12px">
            <Button type="primary" @click="showToolsModal = true">打开 Tools 配置</Button>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane key="variables" tab="Variables">
          <Space direction="vertical" size="small" style="width: 100%">
            <TypographyText type="secondary">用于模板中的占位符</TypographyText>
            <TypographyText type="secondary">
              在 Prompt Composer 或 Slot 文本中使用 <code v-pre>{{ VARIABLE_NAME }}</code> 即可引用对应值。
            </TypographyText>
            <Space direction="vertical" size="small" style="width: 100%">
              <Space v-for="variable in props.shared.variables" :key="variable.id" style="width: 100%">
                <Input v-model:value="variable.key" placeholder="变量名，如 USER_NAME" />
                <Input v-model:value="variable.value" placeholder="示例值" />
              </Space>
            </Space>
          </Space>
        </Tabs.TabPane>
      </Tabs>
    </Space>
  </Card>

  <Modal
    v-if="showToolsModal"
    :open="showToolsModal"
    title="Tools 配置"
    :width="960"
    :footer="null"
    :mask-closable="true"
    @cancel="closeToolsModal"
  >
    <Space direction="vertical" style="width: 100%" size="middle">
      <div>
        <TypographyText type="secondary">Tools JSON 数组</TypographyText>
        <TypographyText type="secondary">
          请直接维护工具定义数组，示例：[{"name":"fetchDocs","description":"..."}]
        </TypographyText>
      </div>
      <Space>
        <Button @click="formatTools">Format JSON</Button>
        <Button @click="validateTools">Validate JSON</Button>
      </Space>
      <div style="display: flex; flex-direction: column; gap: 12px; height: 60vh; min-height: 360px">
        <div style="flex: 1 1 auto; min-height: 320px">
          <JsonEditor
            style="height: 100%"
            v-model="props.shared.toolsDefinition"
            placeholder='[{"name":"fetchDocs","description":"..."}]'
          />
        </div>
        <TypographyText v-if="toolsError" type="danger">{{ toolsError }}</TypographyText>
        <TypographyText v-else-if="toolsSuccess" type="success">{{ toolsSuccess }}</TypographyText>
      </div>
    </Space>
  </Modal>
</template>
