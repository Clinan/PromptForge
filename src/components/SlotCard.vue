<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ProviderProfile, Slot, SharedState, ToolCall } from '../types';
import JsonEditor from './JsonEditor.vue';

const props = defineProps<{
  slot: Slot;
  providerProfiles: ProviderProfile[];
  modelOptions: { id: string; label: string }[];
  refreshingModels: boolean;
  streamOutput: boolean;
  disableRemove: boolean;
  defaultParams: SharedState['defaultParams'];
  showParamDiffOnly: boolean;
  viewMode: 'side-by-side' | 'diff' | 'score';
  diffSelected: boolean;
  diffSelectable: boolean;
}>();

const emit = defineEmits<{
  copy: [slot: Slot];
  remove: [slotId: string];
  run: [slot: Slot];
  stop: [slotId: string];
  exportCurl: [slot: Slot];
  providerChange: [slot: Slot];
  refreshModels: [slot: Slot];
  toggleDiff: [slotId: string];
}>();

const showModelSuggestions = ref(false);
let hideModelSuggestionsTimer: number | null = null;

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

function openModelSuggestions() {
  if (hideModelSuggestionsTimer !== null) {
    window.clearTimeout(hideModelSuggestionsTimer);
    hideModelSuggestionsTimer = null;
  }
  showModelSuggestions.value = true;
}

function closeModelSuggestionsLater() {
  hideModelSuggestionsTimer = window.setTimeout(() => {
    showModelSuggestions.value = false;
  }, 120);
}

function chooseModel(id: string) {
  props.slot.modelId = id;
  showModelSuggestions.value = false;
}

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

function toggleDiffSelection() {
  if (!props.diffSelectable) return;
  emit('toggleDiff', props.slot.id);
}

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
  <article class="slot-card" :data-status="props.slot.status">
    <div v-if="props.slot.status === 'running'" class="slot-card__progress"></div>
    <header class="slot-card__head">
      <div class="slot-card__status">
        <label class="slot-select">
          <input type="checkbox" v-model="props.slot.selected" />
        </label>
        <span class="status-dot" :data-status="props.slot.status"></span>
        <span class="slot-title">{{ props.slot.modelId || '未选择模型' }}</span>
      </div>
      <div class="slot-card__head-actions">
        <div class="slot-head-actions__group">
          <button
            v-if="props.slot.status === 'running'"
            class="pill danger"
            type="button"
            @click="emit('stop', props.slot.id)"
            title="停止运行"
          >
            停止
          </button>
          <button
            v-else
            class="pill"
            type="button"
            @click="emit('run', props.slot)"
            title="运行 Slot"
          >
            运行
          </button>
          <button class="ghost pill" type="button" @click="emit('exportCurl', props.slot)">导出 cURL</button>
        </div>
        <div class="slot-head-actions__group">
          <button
            v-if="props.diffSelectable"
            class="ghost pill"
            :class="{ active: props.diffSelected }"
            @click="toggleDiffSelection"
          >
            {{ props.diffSelected ? '已选中对比' : '加入对比' }}
          </button>
          <button class="ghost pill" type="button" @click="emit('copy', props.slot)">复制 Slot</button>
          <button
            class="ghost pill danger"
            type="button"
            @click="emit('remove', props.slot.id)"
            :disabled="props.disableRemove"
          >
            删除
          </button>
        </div>
      </div>
    </header>

    <div class="slot-form">
      <label>
        <span>Provider</span>
        <select v-model="props.slot.providerProfileId" @change="emit('providerChange', props.slot)">
          <option :value="null">未选择</option>
          <option v-for="profile in props.providerProfiles" :key="profile.id" :value="profile.id">
            {{ profile.name }}
          </option>
        </select>
      </label>
      <label>
        <span>Model</span>
        <div class="model-picker">
          <div class="model-suggest-wrap">
            <input
              v-model="props.slot.modelId"
              placeholder="前缀搜索 / 输入模型 ID"
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              @focus="openModelSuggestions"
              @input="openModelSuggestions"
              @blur="closeModelSuggestionsLater"
            />
            <div v-if="showModelSuggestions && modelSuggestions.length" class="model-suggest">
              <button
                v-for="model in modelSuggestions"
                :key="model.id"
                type="button"
                class="model-suggest__item"
                @mousedown.prevent
                @click="chooseModel(model.id)"
              >
                <span class="model-suggest__id">{{ model.id }}</span>
                <span v-if="model.label !== model.id" class="model-suggest__label">{{ model.label }}</span>
              </button>
            </div>
          </div>
          <button
            class="ghost icon-button"
            :disabled="props.refreshingModels"
            :title="props.refreshingModels ? '刷新中...' : '刷新模型缓存（缓存 1 天）'"
            @click="emit('refreshModels', props.slot)"
          >
            ⟳
          </button>
        </div>
      </label>
    </div>

    <div class="param-chips">
      <span v-for="chip in paramChips" :key="chip.key" class="chip" :class="{ muted: !chip.isDiff }">
        {{ chip.key }}: {{ chip.value }}
      </span>
      <span v-if="!paramChips.length" class="chip muted">继承默认参数</span>
    </div>

    <details class="slot-collapse">
      <summary>参数覆盖</summary>
      <div class="param-editor">
        <div class="param-grid">
          <label class="param-field">
            <span>temperature</span>
            <input
              type="number"
              step="0.1"
              :value="props.slot.paramOverride?.temperature ?? ''"
              placeholder="继承默认"
              @input="(e: Event) => setParamOverride(props.slot, 'temperature', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
            />
          </label>
          <label class="param-field">
            <span>top_p</span>
            <input
              type="number"
              step="0.1"
              :value="props.slot.paramOverride?.top_p ?? ''"
              placeholder="继承默认"
              @input="(e: Event) => setParamOverride(props.slot, 'top_p', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
            />
          </label>
          <label class="param-field">
            <span>max_tokens</span>
            <input
              type="number"
              step="1"
              :value="props.slot.paramOverride?.max_tokens ?? ''"
              placeholder="继承默认"
              @input="(e: Event) => setParamOverride(props.slot, 'max_tokens', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
            />
          </label>
          <label class="param-field">
            <span>stop</span>
            <input
              type="text"
              :value="(props.slot.paramOverride?.stop as string | undefined) ?? ''"
              placeholder="继承默认"
              @input="(e: Event) => setParamOverride(props.slot, 'stop', (e.target as HTMLInputElement).value)"
            />
          </label>
          <label class="param-field">
            <span>presence_penalty</span>
            <input
              type="number"
              step="0.1"
              :value="props.slot.paramOverride?.presence_penalty ?? ''"
              placeholder="继承默认"
              @input="(e: Event) => setParamOverride(props.slot, 'presence_penalty', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
            />
          </label>
          <label class="param-field">
            <span>frequency_penalty</span>
            <input
              type="number"
              step="0.1"
              :value="props.slot.paramOverride?.frequency_penalty ?? ''"
              placeholder="继承默认"
              @input="(e: Event) => setParamOverride(props.slot, 'frequency_penalty', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
            />
          </label>
        </div>
        <label>高级 JSON（补充/覆盖其他参数）</label>
        <textarea
          :value="props.slot.paramOverride ? JSON.stringify(props.slot.paramOverride, null, 2) : ''"
          placeholder='{\"temperature\":0.2}'
          @input="(e: Event) => {
            const value = (e.target as HTMLTextAreaElement).value;
            if (!value.trim()) {
              props.slot.paramOverride = null;
              return;
            }
            try {
              props.slot.paramOverride = JSON.parse(value);
            } catch (err) {
              alert('JSON 解析失败，请检查格式');
            }
          }"
        />
      </div>
    </details>
    
    <label class="system-field">
      <span>System Prompt</span>
      <textarea v-model="props.slot.systemPrompt" placeholder="为该 Slot 定义 System Prompt" />
    </label>


    <div class="slot-output">
      <div class="slot-output__head">
        <span>输出 ({{ props.streamOutput ? '流式' : '非流式' }})</span>
        <div class="slot-metrics">
          <span class="chip">TTFB {{ props.slot.metrics.ttfbMs ? `${props.slot.metrics.ttfbMs.toFixed(0)} ms` : '-' }}</span>
          <span class="chip">耗时 {{ props.slot.metrics.totalMs ? `${props.slot.metrics.totalMs.toFixed(0)} ms` : '-' }}</span>
          <span v-if="tokensSummary" class="chip">Tokens {{ tokensSummary }}</span>
        </div>
      </div>
      <pre class="slot-output__body">{{ props.slot.output || '等待运行...' }}</pre>
    </div>

    <div v-if="shouldShowToolCalls" class="slot-toolcalls">
      <div class="slot-output__head">
        <span>Tool Calls</span>
        <div class="slot-toolcalls__toggle">
          <button :class="{ active: toolCallView === 'json' }" :disabled="!parsedToolCalls.length" @click="toolCallView = 'json'">
            JSON
          </button>
          <button :class="{ active: toolCallView === 'raw' }" @click="toolCallView = 'raw'">Raw Text</button>
        </div>
      </div>
      <JsonEditor
        v-if="toolCallView === 'json' && parsedToolCalls.length"
        class="slot-toolcalls__editor"
        :modelValue="toolCallsJson"
        readonly
      />
      <div v-else-if="toolCallView === 'json'" class="slot-toolcalls__empty">暂无工具调用数据</div>
      <pre v-else class="slot-toolcalls__raw">{{ toolCallsRawText || '等待工具调用流...' }}</pre>
    </div>

    <footer class="slot-card__footer"></footer>
  </article>
</template>
