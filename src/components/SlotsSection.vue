<script setup lang="ts">
import { computed } from 'vue';
import { Button, Col, Row, Space, Typography } from 'ant-design-vue';
import { PauseOutlined, PlayCircleOutlined } from '@ant-design/icons-vue';
import type { ProviderProfile, Slot, SharedState } from '../types';
import SlotCard from './SlotCard.vue';

const { Text: TypographyText, Title: TypographyTitle } = Typography;

const props = defineProps<{
  slots: Slot[];
  providerProfiles: ProviderProfile[];
  streamOutput: boolean;
  refreshingModelsBySlotId: Record<string, boolean>;
  modelOptions: (slot: Slot) => { id: string; label: string }[];
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
  runSelected: [];
  runAll: [];
  stopAll: [];
}>();

const hasRunning = computed(() => props.slots.some((slot) => slot.status === 'running'));
const selectedCount = computed(() => props.slots.filter((slot) => slot.selected).length);
</script>

<template>
  <div class="slots-lab">
    <Space direction="vertical" size="middle" style="width: 100%">
      <Row align="top" justify="space-between" :gutter="[12, 12]">
        <Col flex="auto">
          <TypographyTitle level="4" style="margin-bottom: 4px">Slots Lab</TypographyTitle>
          <TypographyText type="secondary">多模型并行运行的一站式调试区。</TypographyText>
        </Col>
        <Col flex="0 0 auto">
          <Space size="small" wrap>
            <Button :disabled="hasRunning || selectedCount === 0" @click="emit('runSelected')">
              <template #icon>
                <PlayCircleOutlined />
              </template>
              运行已选 Slot
            </Button>
            <Button type="primary" :disabled="hasRunning" @click="emit('runAll')">
              <template #icon>
                <PlayCircleOutlined />
              </template>
              运行全部
            </Button>
            <Button danger :disabled="!hasRunning" @click="emit('stopAll')">
              <template #icon>
                <PauseOutlined />
              </template>
              停止全部
            </Button>
          </Space>
        </Col>
      </Row>

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
        :defaultParams="props.defaultParams"
        :showParamDiffOnly="props.showParamDiffOnly"
        @copy="emit('copy', $event)"
        @remove="emit('remove', $event)"
        @run="emit('run', $event)"
        @stop="emit('stop', $event)"
        @export-curl="emit('exportCurl', $event)"
        @provider-change="emit('providerChange', $event)"
        @refresh-models="emit('refreshModels', $event)"
      />
    </div>
    </Space>
  </div>
</template>
