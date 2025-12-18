<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ProviderProfile, Slot, SharedState } from '../types';

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

function toggleDiffSelection() {
  if (!props.diffSelectable) return;
  emit('toggleDiff', props.slot.id);
}
</script>

<template>
  <article class="slot-card" :data-status="props.slot.status">
    <div v-if="props.slot.status === 'running'" class="slot-card__progress"></div>
    <header class="slot-card__head">
      <div class="slot-card__status">
        <label class="slot-select">
          <input type="checkbox" v-model="props.slot.selected" />
          <span>选中运行</span>
        </label>
        <span class="status-dot" :data-status="props.slot.status"></span>
        <span class="slot-title">{{ props.slot.modelId || '未选择模型' }}</span>
      </div>
      <div class="slot-card__head-actions">
        <button
          v-if="props.diffSelectable"
          class="ghost pill"
          :class="{ active: props.diffSelected }"
          @click="toggleDiffSelection"
        >
          {{ props.diffSelected ? '已选中对比' : '加入对比' }}
        </button>
        <button class="ghost icon-button" @click="emit('copy', props.slot)" title="复制 Slot">⎘</button>
        <button class="ghost icon-button" @click="emit('remove', props.slot.id)" :disabled="props.disableRemove">✕</button>
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

    <label class="system-field">
      <span>System Prompt</span>
      <textarea v-model="props.slot.systemPrompt" placeholder="为该 Slot 定义 System Prompt" />
    </label>

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

    <div class="slot-output">
      <div class="slot-output__head">
        <span>输出 ({{ props.streamOutput ? '流式' : '非流式' }})</span>
        <div class="slot-metrics">
          <span class="chip">TTFB {{ props.slot.metrics.ttfbMs ? `${props.slot.metrics.ttfbMs.toFixed(0)} ms` : '-' }}</span>
          <span class="chip">耗时 {{ props.slot.metrics.totalMs ? `${props.slot.metrics.totalMs.toFixed(0)} ms` : '-' }}</span>
        </div>
      </div>
      <pre class="slot-output__body">{{ props.slot.output || '等待运行...' }}</pre>
    </div>

    <footer class="slot-card__footer">
      <div class="row gap-small">
        <button
          class="pill"
          :disabled="props.slot.status === 'running'"
          @click="emit('run', props.slot)"
          title="运行 Slot"
        >
          运行
        </button>
        <button class="ghost pill" @click="emit('exportCurl', props.slot)">导出 cURL</button>
      </div>
      <div class="row gap-small">
        <button class="ghost pill" @click="emit('copy', props.slot)">复制 Slot</button>
        <button class="ghost pill danger" @click="emit('remove', props.slot.id)" :disabled="props.disableRemove">删除</button>
      </div>
    </footer>
  </article>
</template>
