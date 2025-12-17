<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { HistoryItem } from '../types';

const props = defineProps<{
  items: HistoryItem[];
}>();

const emit = defineEmits<{
  close: [];
  load: [item: HistoryItem];
  toggleStar: [id: string];
}>();

const query = ref('');
const activeId = ref<string | null>(null);

function matchesQuery(item: HistoryItem) {
  const q = query.value.toLowerCase();
  if (!q) return true;
  const legacyUserPrompt = (item.requestSnapshot as unknown as { userPrompt?: string }).userPrompt || '';
  const userJoined = Array.isArray(item.requestSnapshot.userPrompts)
    ? item.requestSnapshot.userPrompts.join('\n')
    : legacyUserPrompt;
  return (
    item.title.toLowerCase().includes(q) ||
    userJoined.toLowerCase().includes(q) ||
    item.requestSnapshot.systemPrompt.toLowerCase().includes(q)
  );
}

const filtered = computed(() => props.items.filter(matchesQuery));

function displayUserPrompts(item: HistoryItem) {
  const legacyUserPrompt = (item.requestSnapshot as unknown as { userPrompt?: string }).userPrompt || '';
  if (Array.isArray(item.requestSnapshot.userPrompts) && item.requestSnapshot.userPrompts.length) {
    return item.requestSnapshot.userPrompts.join('\n\n');
  }
  return legacyUserPrompt;
}

watch(
  filtered,
  (list) => {
    if (!list.length) {
      activeId.value = null;
      return;
    }
    if (!activeId.value || !list.some((item) => item.id === activeId.value)) {
      activeId.value = list[0]!.id;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="history-drawer">
    <div class="history-mask" @click="emit('close')"></div>
    <section class="history-drawer__content">
      <div class="flex-between">
        <div>
          <h3 style="margin: 0">历史记录</h3>
        </div>
        <div class="row" style="width: 420px">
          <input v-model="query" placeholder="搜索 system/user prompt" />
          <button class="ghost" @click="emit('close')">关闭</button>
        </div>
      </div>

      <div class="history-collapse-list">
        <details
          v-for="item in filtered"
          :key="item.id"
          class="collapse history-collapse"
          :open="activeId === item.id"
        >
          <summary class="history-collapse__summary" @click.prevent="activeId = item.id">
            <div class="history-meta">
              <div class="history-meta__title">{{ item.title }}</div>
              <div class="history-meta__info">
                <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
                <span>模型：{{ item.requestSnapshot.modelId }}</span>
                <span>温度：{{ item.requestSnapshot.params?.temperature ?? '默认' }}</span>
              </div>
            </div>
          </summary>
          <div class="history-collapse__body">
              <div class="row" style="flex-wrap: wrap; gap: 6px; align-items: center">
              <span class="chip">首包 {{ item.responseSnapshot.metrics.ttfbMs?.toFixed(0) ?? '-' }} ms</span>
              <span class="chip">总耗时 {{ item.responseSnapshot.metrics.totalMs?.toFixed(0) ?? '-' }} ms</span>
              <button class="ghost" style="flex: 0 0 auto" @click="emit('load', item)">载入</button>
              <button class="ghost" style="flex: 0 0 auto" @click="emit('toggleStar', item.id)">
                {{ item.star ? 'Unstar' : 'Star' }}
              </button>
            </div>
            <div class="small" style="margin-top: 8px; white-space: pre-wrap">
              {{ displayUserPrompts(item) }}
            </div>
            <div class="output-box" style="margin-top: 8px">{{ item.responseSnapshot.outputText }}</div>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
