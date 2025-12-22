<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
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
const isDark = ref(document.documentElement.getAttribute('data-theme') === 'dark');

// 监听主题变化
let observer: MutationObserver | null = null;
onMounted(() => {
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        isDark.value = document.documentElement.getAttribute('data-theme') === 'dark';
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true });
});

onUnmounted(() => {
  observer?.disconnect();
});

const extensions = computed<Extension[]>(() => {
  const base: Extension[] = [EditorView.lineWrapping];
  
  // 添加暗色主题
  if (isDark.value) {
    base.push(oneDark);
  }
  
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

<style scoped>
.json-editor {
  height: 100%;
  overflow: hidden;
}

.json-editor :deep(.cm-editor) {
  height: 100%;
}

.json-editor :deep(.cm-scroller) {
  overflow: auto !important;
}
</style>
