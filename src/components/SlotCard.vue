<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  AutoComplete,
  Badge,
  Button,
  Card,
  Checkbox,
  Collapse,
  Divider,
  Empty,
  Input,
  InputNumber,
  Col,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography
} from 'ant-design-vue';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue';
import type { ProviderProfile, Slot, SharedState, ToolCall } from '../types';
import JsonEditor from './JsonEditor.vue';

const { TextArea } = Input;
const { Text: TypographyText } = Typography;
const CollapsePanel = Collapse.Panel;

const props = defineProps<{
  slot: Slot;
  providerProfiles: ProviderProfile[];
  modelOptions: { id: string; label: string }[];
  refreshingModels: boolean;
  streamOutput: boolean;
  disableRemove: boolean;
  defaultParams: SharedState['defaultParams'];
  showParamDiffOnly: boolean;
}>();

const emit = defineEmits<{
  copy: [slot: Slot];
  remove: [slotId: string];
  run: [slot: Slot];
  stop: [slotId: string];
  exportCurl: [slot: Slot];
  providerChange: [slot: Slot];
  refreshModels: [slot: Slot];
}>();

const statusBadge = computed(() => {
  switch (props.slot.status) {
    case 'running':
      return 'processing';
    case 'done':
      return 'success';
    case 'error':
      return 'error';
    case 'canceled':
      return 'warning';
    default:
      return 'default';
  }
});

const modelSuggestions = computed(() => {
  const rawQuery = (props.slot.modelId || '').trim().toLowerCase();
  const list = props.modelOptions || [];
  const matched = rawQuery ? list.filter((m) => m.id.toLowerCase().includes(rawQuery)) : list;
  const results = matched.slice();
  if (rawQuery) {
    const exactIdx = results.findIndex((m) => m.id.toLowerCase() === rawQuery);
    if (exactIdx > 0) {
      const [exact] = results.splice(exactIdx, 1);
      results.unshift(exact);
    }
  }
  return results;
});

const modelAutocompleteOptions = computed(() =>
  modelSuggestions.value.map((model) => ({
    value: model.id,
    label: model.label === model.id ? model.id : `${model.id} (${model.label})`
  }))
);

function setParamOverride(slot: Slot, key: string, value: unknown) {
  if (value === '' || value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    if (slot.paramOverride) {
      const { [key]: _, ...rest } = slot.paramOverride;
      slot.paramOverride = Object.keys(rest).length ? rest : null;
    }
    return;
  }
  slot.paramOverride = { ...(slot.paramOverride || {}), [key]: value };
}

const paramChipKeys: Array<keyof SharedState['defaultParams']> = ['temperature', 'top_p', 'max_tokens'];

const paramChips = computed(() =>
  paramChipKeys
    .map((key) => {
      const overrideValue = props.slot.paramOverride?.[key];
      const value = overrideValue ?? props.defaultParams[key];
      const isDiff = overrideValue !== undefined && overrideValue !== null && overrideValue !== '';
      return {
        key: key as string,
        value: value === '' ? '继承' : typeof value === 'number' ? value : String(value),
        isDiff
      };
    })
    .filter((chip) => (props.showParamDiffOnly ? chip.isDiff : true))
);

const advancedJsonValue = computed(() =>
  props.slot.paramOverride ? JSON.stringify(props.slot.paramOverride, null, 2) : ''
);

const toolCallView = ref<'json' | 'raw'>('raw');

function parseArguments(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function updateAdvancedJson(value: string) {
  if (!value.trim()) {
    props.slot.paramOverride = null;
    return;
  }
  try {
    props.slot.paramOverride = JSON.parse(value);
  } catch (err) {
    alert('JSON 解析失败，请检查格式');
  }
}

const parsedToolCalls = computed(() =>
  (props.slot.toolCalls || []).map((call: ToolCall) => {
    if (!call.function) return call;
    const parsed = parseArguments(call.function.arguments);
    return {
      ...call,
      function: {
        ...call.function,
        arguments: parsed
      }
    };
  })
);

const toolCallsJson = computed(() =>
  parsedToolCalls.value.length ? JSON.stringify(parsedToolCalls.value, null, 2) : ''
);

const toolCallsRawText = computed(() =>
  props.slot.toolCalls && props.slot.toolCalls.length ? JSON.stringify(props.slot.toolCalls, null, 2) : ''
);

const shouldShowToolCalls = computed(() => props.slot.status === 'running' || (props.slot.toolCalls?.length || 0) > 0);

const tokensSummary = computed(() => {
  const tokens = props.slot.metrics.tokens;
  if (!tokens) return '';
  const prompt = tokens.prompt ?? '-';
  const completion = tokens.completion ?? '-';
  const total = tokens.total ?? '-';
  if (prompt === '-' && completion === '-' && total === '-') return '';
  return `${prompt}/${completion}/${total}`;
});

watch(
  () => props.slot.status,
  (status) => {
    if (status === 'running') {
      toolCallView.value = 'raw';
    } else if (status !== 'running' && toolCallView.value === 'raw' && (props.slot.toolCalls?.length || 0) > 0) {
      toolCallView.value = 'json';
    }
  }
);

watch(
  () => props.slot.toolCalls?.length || 0,
  (len) => {
    if (len > 0 && props.slot.status !== 'running' && toolCallView.value === 'raw') {
      toolCallView.value = 'json';
    }
  }
);
</script>

<template>
  <Card size="small" class="slot-card" :bordered="true">
    <template #title>
      <Space align="center" size="middle">
        <Checkbox v-model:checked="props.slot.selected" />
        <Badge :status="statusBadge" />
        <TypographyText strong>{{ props.slot.modelId || '未选择模型' }}</TypographyText>
      </Space>
    </template>
    <template #extra>
      <Space size="small" wrap>
        <Button
          v-if="props.slot.status === 'running'"
          danger
          size="small"
          @click="emit('stop', props.slot.id)"
        >
          <template #icon>
            <PauseCircleOutlined />
          </template>
          停止
        </Button>
        <Button v-else type="primary" size="small" @click="emit('run', props.slot)">
          <template #icon>
            <PlayCircleOutlined />
          </template>
          运行
        </Button>
        <Button size="small" @click="emit('exportCurl', props.slot)">
          <template #icon>
            <DownloadOutlined />
          </template>
          导出 cURL
        </Button>
        <Button size="small" @click="emit('copy', props.slot)">
          <template #icon>
            <CopyOutlined />
          </template>
          复制
        </Button>
        <Button size="small" danger :disabled="props.disableRemove" @click="emit('remove', props.slot.id)">
          <template #icon>
            <DeleteOutlined />
          </template>
          删除
        </Button>
      </Space>
    </template>

    <Space direction="vertical" size="middle" style="width: 100%">
      <Space direction="vertical" size="small" style="width: 100%">
        <TypographyText type="secondary">Provider</TypographyText>
        <Select
          v-model:value="props.slot.providerProfileId"
          placeholder="选择 Provider"
          @change="emit('providerChange', props.slot)"
          :options="[
            { label: '未选择', value: null },
            ...props.providerProfiles.map((profile) => ({ label: profile.name, value: profile.id }))
          ]"
        />
      </Space>

      <Space direction="vertical" size="small" style="width: 100%">
        <Row align="middle" justify="space-between">
          <Col flex="auto">
            <TypographyText type="secondary">Model</TypographyText>
          </Col>
          <Col flex="0 0 auto">
            <Button
              size="small"
              :loading="props.refreshingModels"
              @click="emit('refreshModels', props.slot)"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              刷新模型
            </Button>
          </Col>
        </Row>
        <AutoComplete
          v-model:value="props.slot.modelId"
          :options="modelAutocompleteOptions"
          placeholder="前缀搜索 / 输入模型 ID"
        />
      </Space>

      <Space wrap>
        <Tag v-for="chip in paramChips" :key="chip.key" :color="chip.isDiff ? 'blue' : undefined">
          {{ chip.key }}: {{ chip.value }}
        </Tag>
        <Tag v-if="!paramChips.length">继承默认参数</Tag>
      </Space>

      <Collapse>
        <CollapsePanel key="params" header="参数覆盖">
          <Space direction="vertical" size="small" style="width: 100%">
            <Space wrap>
              <Space direction="vertical" size="small">
                <TypographyText type="secondary">temperature</TypographyText>
                <InputNumber
                  :value="props.slot.paramOverride?.temperature ?? ''"
                  :step="0.1"
                  placeholder="继承默认"
                  @update:value="(val) => setParamOverride(props.slot, 'temperature', val)"
                />
              </Space>
              <Space direction="vertical" size="small">
                <TypographyText type="secondary">top_p</TypographyText>
                <InputNumber
                  :value="props.slot.paramOverride?.top_p ?? ''"
                  :step="0.1"
                  placeholder="继承默认"
                  @update:value="(val) => setParamOverride(props.slot, 'top_p', val)"
                />
              </Space>
              <Space direction="vertical" size="small">
                <TypographyText type="secondary">max_tokens</TypographyText>
                <InputNumber
                  :value="props.slot.paramOverride?.max_tokens ?? ''"
                  :step="1"
                  placeholder="继承默认"
                  @update:value="(val) => setParamOverride(props.slot, 'max_tokens', val)"
                />
              </Space>
            </Space>
            <TypographyText type="secondary">高级 JSON（补充/覆盖其他参数）</TypographyText>
            <JsonEditor
              class="slot-advanced-json"
              :modelValue="advancedJsonValue"
              placeholder='{"temperature":0.2}'
              @update:modelValue="updateAdvancedJson"
            />
          </Space>
        </CollapsePanel>
      </Collapse>

      <Space direction="vertical" size="small" style="width: 100%">
        <TypographyText type="secondary">System Prompt</TypographyText>
        <TextArea v-model:value="props.slot.systemPrompt" placeholder="为该 Slot 定义 System Prompt" auto-size />
      </Space>

      <Divider style="margin: 8px 0" />

      <Card size="small" class="slot-output-card">
        <template #title>
          <Space align="center" size="middle">
            <TypographyText>输出 ({{ props.streamOutput ? '流式' : '非流式' }})</TypographyText>
            <Space size="small">
              <Tag>TTFB {{ props.slot.metrics.ttfbMs ? `${props.slot.metrics.ttfbMs.toFixed(0)} ms` : '-' }}</Tag>
              <Tag>耗时 {{ props.slot.metrics.totalMs ? `${props.slot.metrics.totalMs.toFixed(0)} ms` : '-' }}</Tag>
              <Tag v-if="tokensSummary">Tokens {{ tokensSummary }}</Tag>
            </Space>
          </Space>
        </template>
        <pre class="slot-output__body">{{ props.slot.output || '等待运行...' }}</pre>
      </Card>

      <Card v-if="shouldShowToolCalls" size="small">
        <template #title>
          <Space align="center" size="middle">
            <TypographyText>Tool Calls</TypographyText>
            <Radio.Group v-model:value="toolCallView" option-type="button" button-style="solid">
              <Radio.Button value="json" :disabled="!parsedToolCalls.length">JSON</Radio.Button>
              <Radio.Button value="raw">Raw Text</Radio.Button>
            </Radio.Group>
          </Space>
        </template>

        <JsonEditor
          v-if="toolCallView === 'json' && parsedToolCalls.length"
          class="slot-toolcalls__editor"
          :modelValue="toolCallsJson"
          readonly
        />
        <Empty v-else-if="toolCallView === 'json'" description="暂无工具调用数据" />
        <pre v-else class="slot-toolcalls__raw">{{ toolCallsRawText || '等待工具调用流...' }}</pre>
      </Card>
    </Space>
  </Card>
</template>
