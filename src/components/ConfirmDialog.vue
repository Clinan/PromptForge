<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';

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

const confirmButtonClass = computed(() => (props.tone === 'danger' ? 'pill danger' : 'pill'));

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', handleKeydown);
    } else {
      window.removeEventListener('keydown', handleKeydown);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <teleport to="body">
    <div v-if="props.open" class="modal-mask" @click.self="emit('close')">
      <div class="modal confirm-dialog" role="dialog" aria-modal="true" :aria-label="props.title">
        <div class="confirm-dialog__title">{{ props.title }}</div>
        <div v-if="props.description" class="confirm-dialog__desc">{{ props.description }}</div>
        <div class="confirm-dialog__actions">
          <button class="ghost pill" type="button" @click="emit('close')">
            {{ props.cancelText || '取消' }}
          </button>
          <button :class="confirmButtonClass" type="button" @click="emit('confirm')">
            {{ props.confirmText || '确定' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

