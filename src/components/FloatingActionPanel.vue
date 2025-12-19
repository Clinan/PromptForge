<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Button, Card, Space, Tooltip } from 'ant-design-vue';
import { FastForwardOutlined, HistoryOutlined, PlayCircleOutlined } from '@ant-design/icons-vue';

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
    <Card size="small" :bordered="true">
      <template #title>
        <div class="floating-panel__header" @pointerdown="startDrag">
          <span>操作</span>
          <span class="floating-panel__handle">⠿</span>
        </div>
      </template>
      <Space>
        <Tooltip title="Run Selected">
          <Button type="primary" shape="circle" @click="emit('runSelected')">
            <template #icon>
              <PlayCircleOutlined />
            </template>
          </Button>
        </Tooltip>
        <Tooltip title="Run All">
          <Button shape="circle" @click="emit('runAll')">
            <template #icon>
              <FastForwardOutlined />
            </template>
          </Button>
        </Tooltip>
        <Tooltip :title="props.showHistory ? '隐藏历史' : '打开历史'">
          <Button shape="circle" @click="emit('toggleHistory')">
            <template #icon>
              <HistoryOutlined />
            </template>
          </Button>
        </Tooltip>
      </Space>
    </Card>
  </div>
</template>
