<script setup lang="ts">
import { computed } from 'vue';
import type { ProviderProfile, Slot, SharedState } from '../types';
import SlotCard from './SlotCard.vue';

const props = defineProps<{
  slots: Slot[];
  providerProfiles: ProviderProfile[];
  streamOutput: boolean;
  refreshingModelsBySlotId: Record<string, boolean>;
  modelOptions: (slot: Slot) => { id: string; label: string }[];
  defaultParams: SharedState['defaultParams'];
  viewMode: 'side-by-side' | 'diff' | 'score';
  diffSelection: string[];
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
  runSelected: [];
  runAll: [];
  stopAll: [];
  changeViewMode: ['side-by-side' | 'diff' | 'score'];
  toggleDiff: [slotId: string];
}>();

const diffSlots = computed(() => props.slots.filter((slot) => props.diffSelection.includes(slot.id)));
const hasRunning = computed(() => props.slots.some((slot) => slot.status === 'running'));
const selectedCount = computed(() => props.slots.filter((slot) => slot.selected).length);

const diffLines = computed(() => {
  if (diffSlots.value.length < 2) return [];
  const [a, b] = diffSlots.value;
  const linesA = a.output.split('\n');
  const linesB = b.output.split('\n');
  const max = Math.max(linesA.length, linesB.length);
  const result: Array<{ type: 'same' | 'remove' | 'add'; text: string }> = [];
  for (let i = 0; i < max; i += 1) {
    const left = linesA[i];
    const right = linesB[i];
    if (left === right) {
      if (left) result.push({ type: 'same', text: left });
      continue;
    }
    if (left) result.push({ type: 'remove', text: left });
    if (right) result.push({ type: 'add', text: right });
  }
  return result;
});
</script>

<template>
  <div class="slots-lab">
    <div class="slots-lab__head">
      <div>
        <div class="panel-title">Slots Lab</div>
        <div class="panel-subtitle">多模型对比、Diff、评分模式一站式调试。</div>
      </div>
      <div class="slots-head__actions">
        <div class="view-switch">
          <button :class="{ active: props.viewMode === 'side-by-side' }" @click="emit('changeViewMode', 'side-by-side')">
            Side-by-side
          </button>
          <button :class="{ active: props.viewMode === 'diff' }" @click="emit('changeViewMode', 'diff')">Diff</button>
          <button :class="{ active: props.viewMode === 'score' }" @click="emit('changeViewMode', 'score')">Score</button>
        </div>
        <div class="row gap-small">
          <button class="ghost pill" :disabled="hasRunning || selectedCount === 0" @click="emit('runSelected')">
            运行已选 Slot
          </button>
          <button class="pill" :disabled="hasRunning" @click="emit('runAll')">运行全部</button>
          <button class="pill danger" :disabled="!hasRunning" @click="emit('stopAll')">停止全部</button>
        </div>
      </div>
    </div>

    <div v-if="props.viewMode === 'diff'" class="diff-tip">
      <div>选择 2 个 Slot 进入 Diff 模式。</div>
      <div class="diff-tip__selected">
        <span v-for="slot in diffSlots" :key="slot.id" class="chip">{{ slot.modelId || '未命名' }}</span>
        <span v-if="diffSlots.length < 2" class="chip muted">待选择...</span>
      </div>
    </div>

    <div class="slot-grid" :class="{ 'slot-grid--score': props.viewMode === 'score' }">
      <SlotCard
        v-for="slot in props.slots"
        :key="slot.id"
        :slot="slot"
        :providerProfiles="props.providerProfiles"
        :modelOptions="props.modelOptions(slot)"
        :refreshingModels="!!props.refreshingModelsBySlotId[slot.id]"
        :streamOutput="props.streamOutput"
        :disableRemove="props.slots.length === 1"
        :defaultParams="props.defaultParams"
        :showParamDiffOnly="props.showParamDiffOnly"
        :viewMode="props.viewMode"
        :diffSelected="props.diffSelection.includes(slot.id)"
        :diffSelectable="props.viewMode === 'diff'"
        @copy="emit('copy', $event)"
        @remove="emit('remove', $event)"
        @run="emit('run', $event)"
        @stop="emit('stop', $event)"
        @export-curl="emit('exportCurl', $event)"
        @provider-change="emit('providerChange', $event)"
        @refresh-models="emit('refreshModels', $event)"
        @toggle-diff="emit('toggleDiff', slot.id)"
      />
    </div>

    <div v-if="props.viewMode === 'diff'" class="diff-panel" :class="{ 'diff-panel--empty': diffSlots.length < 2 }">
      <div class="diff-panel__head">
        <div>Diff 结果</div>
        <div class="panel-subtitle">简单按行对比展示差异</div>
      </div>
      <div v-if="diffSlots.length < 2" class="diff-panel__empty">请先选择 2 个 Slot</div>
      <div v-else class="diff-panel__body">
        <div v-for="(line, idx) in diffLines" :key="idx" class="diff-line" :data-type="line.type">
          <span class="diff-line__mark">{{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : '·' }}</span>
          <pre>{{ line.text }}</pre>
        </div>
      </div>
    </div>

    <div v-if="props.viewMode === 'score'" class="diff-panel diff-panel--empty">
      <div class="diff-panel__head">
        <div>Score 模式</div>
        <div class="panel-subtitle">占位：未来可记录人工评分或自动指标。</div>
      </div>
      <div class="diff-panel__empty">即将推出评分表格，可根据自定义指标给每个 Slot 评分。</div>
    </div>
  </div>
</template>
