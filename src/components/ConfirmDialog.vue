<script setup lang="ts">
import { Modal } from 'ant-design-vue';

const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <Modal
    :open="props.open"
    :title="props.title"
    :ok-text="props.confirmText || '确定'"
    :cancel-text="props.cancelText || '取消'"
    :ok-button-props="{ danger: props.tone === 'danger' }"
    :z-index="2000"
    @ok="emit('confirm')"
    @cancel="emit('close')"
  >
    <p v-if="props.description">{{ props.description }}</p>
  </Modal>
</template>
