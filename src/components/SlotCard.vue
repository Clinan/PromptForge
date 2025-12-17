<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ProviderProfile, Slot } from '../types';

const props = defineProps<{
  slot: Slot;
  providerProfiles: ProviderProfile[];
  modelOptions: { id: string; label: string }[];
  refreshingModels: boolean;
  streamOutput: boolean;
  disableRemove: boolean;
}>();

const emit = defineEmits<{
  copy: [slot: Slot];
  remove: [slotId: string];
  run: [slot: Slot];
  exportCurl: [slot: Slot];
  providerChange: [slot: Slot];
  refreshModels: [slot: Slot];
}>();

const showModelSuggestions = ref(false);
let hideModelSuggestionsTimer: number | null = null;

const modelSuggestions = computed(() => {
  const rawQuery = (props.slot.modelId || '').trim().toLowerCase();
  const list = props.modelOptions || [];
  const matched = rawQuery ? list.filter((m) => m.id.toLowerCase().startsWith(rawQuery)) : list;
  const top = matched.slice(0, 5);
  if (rawQuery) {
    const exactIdx = top.findIndex((m) => m.id.toLowerCase() === rawQuery);
    if (exactIdx > 0) {
      const [exact] = top.splice(exactIdx, 1);
      top.unshift(exact);
    }
  }
  return top;
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
</script>

<template>
  <div class="slot-card" :data-status="props.slot.status">
    <div class="flex-between" style="margin-bottom: 8px">
      <div class="row">
        <input type="checkbox" v-model="props.slot.selected" />
        <span class="badge" :data-status="props.slot.status">{{ props.slot.status }}</span>
      </div>
      <div class="row slot-actions">
        <button
          class="success icon-button"
          title="Run"
          aria-label="Run"
          @click="emit('run', props.slot)"
          :disabled="props.slot.status === 'running'"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button class="ghost icon-button" title="Export cURL" aria-label="Export cURL" @click="emit('exportCurl', props.slot)">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 8L5 12l4 4 1.4-1.4L7.8 12l2.6-2.6L9 8zm6 0l-1.4 1.4 2.6 2.6-2.6 2.6L15 16l4-4-4-4z"
            />
          </svg>
        </button>
        <button class="ghost" @click="emit('copy', props.slot)">复制</button>
        <button class="ghost" @click="emit('remove', props.slot.id)" :disabled="props.disableRemove">删除</button>
      </div>
    </div>

    <div class="row">
      <div>
        <label>Provider</label>
        <select v-model="props.slot.providerProfileId" @change="emit('providerChange', props.slot)">
          <option :value="null">未选择</option>
          <option v-for="profile in props.providerProfiles" :key="profile.id" :value="profile.id">
            {{ profile.name }}
          </option>
        </select>
      </div>
      <div>
        <label>Model</label>
        <div class="row model-picker">
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
      </div>
    </div>

    <div>
      <label>System Prompt</label>
      <textarea class="system-prompt" v-model="props.slot.systemPrompt" placeholder="为该 Slot 定义 System Prompt" />
    </div>

    <details class="collapse">
      <summary>参数覆盖（JSON，可选）</summary>
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
        <div class="small">留空即沿用默认参数；上方控件与 JSON 均会合并覆盖。</div>
      </div>
    </details>

    <div class="metrics">
      <span class="chip">首包：{{ props.slot.metrics.ttfbMs ? `${props.slot.metrics.ttfbMs.toFixed(0)} ms` : '-' }}</span>
      <span class="chip">总耗时：{{ props.slot.metrics.totalMs ? `${props.slot.metrics.totalMs.toFixed(0)} ms` : '-' }}</span>
    </div>
    <div>
      <label>输出 ({{ props.streamOutput ? '流式' : '非流式' }})</label>
      <div class="output-box">{{ props.slot.output || '等待运行...' }}</div>
    </div>
  </div>
</template>
