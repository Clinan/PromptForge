<script setup lang="ts">
import type { ProviderProfile, Slot } from '../types';
import SlotCard from './SlotCard.vue';

const props = defineProps<{
  slots: Slot[];
  providerProfiles: ProviderProfile[];
  streamOutput: boolean;
  refreshingModelsBySlotId: Record<string, boolean>;
  modelOptions: (slot: Slot) => { id: string; label: string }[];
}>();

const emit = defineEmits<{
  copy: [slot: Slot];
  remove: [slotId: string];
  run: [slot: Slot];
  exportCurl: [slot: Slot];
  providerChange: [slot: Slot];
  refreshModels: [slot: Slot];
}>();
</script>

<template>
  <section>
    <div class="section-head">
      <div>
        <div class="section-title">Slots</div>
        <div class="section-subtitle">每个 Slot 独立 System Prompt，用于对比输出差异。</div>
      </div>
    </div>
    <div class="slot-grid">
      <SlotCard
        v-for="slot in props.slots"
        :key="slot.id"
        :slot="slot"
        :providerProfiles="props.providerProfiles"
        :modelOptions="props.modelOptions(slot)"
        :refreshingModels="!!props.refreshingModelsBySlotId[slot.id]"
        :streamOutput="props.streamOutput"
        :disableRemove="props.slots.length === 1"
        @copy="emit('copy', $event)"
        @remove="emit('remove', $event)"
        @run="emit('run', $event)"
        @export-curl="emit('exportCurl', $event)"
        @provider-change="emit('providerChange', $event)"
        @refresh-models="emit('refreshModels', $event)"
      />
    </div>
  </section>
</template>

