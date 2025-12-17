<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  title: string;
  code: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const copied = ref(false);
let copiedTimer: number | null = null;

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
        <div class="flex-between" style="margin-bottom: 10px">
          <div style="font-weight: 700">{{ props.title }}</div>
          <div class="row" style="flex: 0 0 auto; gap: 8px">
            <button class="ghost icon-button" title="复制" aria-label="复制" @click="copy">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M8 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V7zm2 0v12h9V7h-9zM5 3h11v2H5v12H3V5a2 2 0 0 1 2-2z"
                />
              </svg>
            </button>
            <button class="ghost" style="flex: 0 0 auto" @click="emit('close')">关闭</button>
          </div>
        </div>
        <div v-if="copied" class="small" style="margin-bottom: 8px">已复制</div>
        <pre class="code-block"><code>{{ props.code }}</code></pre>
      </div>
    </div>
  </teleport>
</template>

