<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  projectOptions: { id: string; label: string }[];
  selectedProject: string;
  providersCount: number;
  sidebarCollapsed: boolean;
}>();

const emit = defineEmits<{
  openProviders: [];
  toggleSidebar: [];
  'update:selectedProject': [string];
}>();

const searchValue = ref('');

watch(
  () => props.selectedProject,
  (val) => {
    if (!props.projectOptions.some((option) => option.id === val)) {
      emit('update:selectedProject', props.projectOptions[0]?.id || '');
    }
  },
  { immediate: true }
);
</script>

<template>
  <header class="top-bar card">
    <div class="top-bar__left">
      <button class="sidebar-trigger" @click="emit('toggleSidebar')" :title="props.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'">
        ☰
      </button>
      <div class="logo">TruestPrompt</div>
      <select
        class="project-select"
        :value="props.selectedProject"
        @change="emit('update:selectedProject', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="project in props.projectOptions" :key="project.id" :value="project.id">
          {{ project.label }}
        </option>
      </select>
    </div>
    <div class="top-bar__center">
      <input class="top-bar__search" v-model="searchValue" placeholder="搜索 Prompt / Runs / Variables" />
    </div>
    <div class="top-bar__right">
      <button class="status-chip ghost pill" @click="emit('openProviders')">
        <span class="dot dot--success"></span>
        {{ props.providersCount }} Providers
      </button>
      <button class="ghost pill" @click="emit('openProviders')">Providers 面板</button>
      <div class="avatar">LC</div>
    </div>
  </header>
</template>
