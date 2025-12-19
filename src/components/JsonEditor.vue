<script setup lang="ts">
import { computed } from 'vue';
import { Button, Tooltip, message } from 'ant-design-vue';
import { CopyOutlined } from '@ant-design/icons-vue';
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
  showCopy?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const currentValue = computed(() => props.modelValue ?? '');
const shouldShowCopy = computed(() => props.showCopy ?? true);

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

async function copyValue() {
  try {
    await navigator.clipboard.writeText(currentValue.value || '');
    message.success('已复制到剪贴板');
  } catch (err) {
    message.error('复制失败，请检查浏览器权限。');
    console.warn(err);
  }
}
</script>

<template>
  <div class="json-editor" :class="{ readonly: props.readonly }">
    <div v-if="shouldShowCopy" class="json-editor__toolbar">
      <Tooltip title="复制内容">
        <Button type="text" size="small" @click="copyValue">
          <template #icon>
            <CopyOutlined />
          </template>
          复制
        </Button>
      </Tooltip>
    </div>
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
