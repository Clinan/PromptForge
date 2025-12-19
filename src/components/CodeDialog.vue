<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import JsonEditor from './JsonEditor.vue';

const props = defineProps<{
  open: boolean;
  title: string;
  code: string;
  usePlaceholder: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'update:usePlaceholder': [boolean];
}>();

const copied = ref(false);
let copiedTimer: number | null = null;
const placeholderProxy = computed({
  get: () => props.usePlaceholder,
  set: (val: boolean) => emit('update:usePlaceholder', val)
});

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code || '');
    copied.value = true;
    if (copiedTimer !== null) window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => (copied.value = false), 1200);
  } catch (err) {
    alert('复制失败，请检查浏览器权限。');
    console.warn(err);
  }
}

watch(
  () => props.open,
  (v) => {
    if (!v) {
      copied.value = false;
      if (copiedTimer !== null) window.clearTimeout(copiedTimer);
      copiedTimer = null;
    }
  }
);
</script>

<template>
  <teleport to="body">
    <div v-if="props.open" class="modal-mask" @click.self="emit('close')">
      <div class="modal code-dialog" role="dialog" aria-modal="true">
        <div class="code-dialog__header">
          <div class="code-dialog__title">{{ props.title }}</div>
          <button class="ghost" type="button" @click="emit('close')">关闭</button>
        </div>
        <div class="code-dialog__toolbar">
          <label class="inline-toggle code-dialog__toggle">
            <input type="checkbox" v-model="placeholderProxy" />
            <span>API Key 使用占位符</span>
          </label>
          <div class="code-dialog__toolbar-actions">
            <div v-if="copied" class="code-dialog__copied">已复制</div>
            <button class="ghost icon-button" type="button" title="复制" aria-label="复制" @click="copy">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M8 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V7zm2 0v12h9V7h-9zM5 3h11v2H5v12H3V5a2 2 0 0 1 2-2z"
                />
              </svg>
            </button>
          </div>
        </div>
        <JsonEditor class="code-dialog__editor" :modelValue="props.code" readonly language="javascript" />
      </div>
    </div>
  </teleport>
</template>
