<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';

const props = defineProps<{
  showHistory: boolean;
  storageKey?: string;
}>();

const emit = defineEmits<{
  runSelected: [];
  runAll: [];
  toggleHistory: [];
}>();

const resolvedStorageKey = props.storageKey || 'truestprompt-floating-panel-pos-v1';
const panelEl = ref<HTMLElement | null>(null);
const pos = reactive({ left: 0, top: 0 });
const dragging = ref(false);
const dragOffset = reactive({ x: 0, y: 0 });
let pointerId: number | null = null;

function clampPosition(left: number, top: number) {
  const rect = panelEl.value?.getBoundingClientRect();
  const width = rect?.width ?? 240;
  const height = rect?.height ?? 120;
  const margin = 12;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);
  return {
    left: Math.min(Math.max(left, margin), maxLeft),
    top: Math.min(Math.max(top, margin), maxTop)
  };
}

function loadPosition() {
  try {
    const raw = localStorage.getItem(resolvedStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { left: number; top: number };
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePosition() {
  try {
    localStorage.setItem(resolvedStorageKey, JSON.stringify({ left: pos.left, top: pos.top }));
  } catch {
    // ignore
  }
}

function startDrag(e: PointerEvent) {
  const rect = panelEl.value?.getBoundingClientRect();
  if (!rect) return;
  pointerId = e.pointerId;
  dragging.value = true;
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  (e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
  e.preventDefault();
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return;
  if (pointerId !== null && e.pointerId !== pointerId) return;
  const clamped = clampPosition(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
  pos.left = clamped.left;
  pos.top = clamped.top;
}

function stopDrag() {
  if (!dragging.value) return;
  dragging.value = false;
  pointerId = null;
  savePosition();
}

function handleResize() {
  const clamped = clampPosition(pos.left, pos.top);
  pos.left = clamped.left;
  pos.top = clamped.top;
}

onMounted(async () => {
  await nextTick();
  const stored = loadPosition();
  if (stored) {
    const clamped = clampPosition(stored.left, stored.top);
    pos.left = clamped.left;
    pos.top = clamped.top;
    return;
  }
  const rect = panelEl.value?.getBoundingClientRect();
  const width = rect?.width ?? 240;
  const height = rect?.height ?? 120;
  const margin = 12;
  pos.left = Math.max(margin, window.innerWidth - width - margin);
  pos.top = Math.max(margin, window.innerHeight - height - margin);
});

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', stopDrag);
  window.removeEventListener('pointercancel', stopDrag);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div
    ref="panelEl"
    class="floating-panel"
    :class="{ 'floating-panel--dragging': dragging }"
    :style="{ left: `${pos.left}px`, top: `${pos.top}px` }"
  >
    <div class="floating-panel__header" @pointerdown="startDrag">
      <div class="floating-panel__title">操作</div>
      <div class="floating-panel__handle" title="拖动">⠿</div>
    </div>
    <div class="floating-panel__body">
      <button class="floating-action success" title="Run Selected" aria-label="Run Selected" @click="emit('runSelected')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
      <button class="floating-action ghost" title="Run All" aria-label="Run All" @click="emit('runAll')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5v14l8-7zm8 0v14l8-7z" />
        </svg>
      </button>
      <button
        class="floating-action ghost"
        :title="props.showHistory ? '隐藏历史' : '打开历史'"
        :aria-label="props.showHistory ? '隐藏历史' : '打开历史'"
        @click="emit('toggleHistory')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13 3a9 9 0 1 0 8.485 6H19v-2h5v5h-2V9.357A11 11 0 1 1 13 1v2zm-1 5h2v6l4 2-.9 1.8L12 15V8z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
