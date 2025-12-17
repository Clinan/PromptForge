<script setup lang="ts">
const emit = defineEmits<{
  openProviders: [];
}>();
</script>

<template>
  <header class="app-header">
    <div class="app-brand">
      <div class="app-title">PromptForge</div>
      <div class="app-subtitle">提示词对比调试台 · 多 Slot 并行对比</div>
    </div>
    <div class="row" style="flex: 0 0 auto">
      <button class="ghost pill" style="flex: 0 0 auto" @click="emit('openProviders')">管理 Providers</button>
    </div>
  </header>
</template>

