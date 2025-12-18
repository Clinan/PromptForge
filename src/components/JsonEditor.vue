<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const scrollTop = ref(0);
const scrollLeft = ref(0);

const highlighted = computed(() => highlightJSON(props.modelValue ?? ''));

function handleInput(event: Event) {
  if (props.readonly) return;
  const value = (event.target as HTMLTextAreaElement).value;
  emit('update:modelValue', value);
  syncScroll();
}

function syncScroll() {
  const el = textareaRef.value;
  if (!el) return;
  scrollTop.value = el.scrollTop;
  scrollLeft.value = el.scrollLeft;
}

function highlightJSON(source: string) {
  if (!source) return '';
  const pattern =
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let html = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const start = match.index;
    html += escapeHtml(source.slice(lastIndex, start));
    const token = match[0];
    html += `<span class="${classForToken(token)}">${escapeHtml(token)}</span>`;
    lastIndex = pattern.lastIndex;
  }
  html += escapeHtml(source.slice(lastIndex));
  return html || '&nbsp;';
}

function classForToken(token: string) {
  if (token.startsWith('"')) {
    return token.trimEnd().endsWith(':') ? 'json-key' : 'json-string';
  }
  if (token === 'true' || token === 'false') return 'json-boolean';
  if (token === 'null') return 'json-null';
  return 'json-number';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
</script>

<template>
  <div class="json-editor" :class="{ readonly: props.readonly }">
    <template v-if="props.readonly">
      <pre class="json-editor__highlight json-editor__highlight--static"><code v-html="highlighted"></code></pre>
    </template>
    <template v-else>
      <pre
        class="json-editor__highlight"
        aria-hidden="true"
        :style="{ transform: `translate(${-scrollLeft}px, ${-scrollTop}px)` }"
      ><code v-html="highlighted"></code></pre>
      <textarea
        ref="textareaRef"
        class="json-editor__textarea"
        :value="modelValue"
        :placeholder="placeholder"
        spellcheck="false"
        @input="handleInput"
        @scroll="syncScroll"
      ></textarea>
      <div v-if="!modelValue && placeholder" class="json-editor__placeholder">{{ placeholder }}</div>
    </template>
  </div>
</template>
