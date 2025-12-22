<script setup lang="ts">
/**
 * MainWorkspace - 主工作区容器组件
 * 包含 PromptComposer 和 SlotsGrid，实现响应式宽度调整
 */
</script>

<template>
  <main class="main-workspace">
    <div class="workspace-content">
      <slot name="composer"></slot>
      <slot name="slots"></slot>
    </div>
  </main>
</template>

<style scoped>
.main-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 6px 0;
  overflow-y: auto;
  background: var(--bg);
}

.workspace-content {
  max-width: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px;
}
</style>
