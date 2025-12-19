<script setup lang="ts">
import { computed } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  readonly?: boolean;
  language?: 'json' | 'javascript' | 'text';
}>();

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const currentValue = computed(() => props.modelValue ?? '');

const extensions = computed<Extension[]>(() => {
  const base: Extension[] = [EditorView.lineWrapping];
  switch (props.language) {
    case 'javascript':
      base.push(javascript());
      break;
    case 'text':
      break;
    default:
      base.push(json());
      break;
  }
  return base;
});

function handleUpdate(value: string) {
  if (props.readonly) return;
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="json-editor" :class="{ readonly: props.readonly }">
    <Codemirror
      :model-value="currentValue"
      :extensions="extensions"
      :disabled="props.readonly"
      :placeholder="props.placeholder"
      :indent-with-tab="true"
      :tab-size="2"
      :style="{ height: '100%' }"
      @update:modelValue="handleUpdate"
    />
  </div>
</template>
