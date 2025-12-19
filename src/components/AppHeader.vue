<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  projectOptions: { id: string; label: string }[];
  selectedProject: string;
  theme: 'light' | 'dark';
}>();

const emit = defineEmits<{
  toggleTheme: [];
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
      <button
        class="icon-button theme-toggle"
        :title="props.theme === 'light' ? '切换为暗色' : '切换为浅色'"
        :aria-label="props.theme === 'light' ? '切换为暗色' : '切换为浅色'"
        @click="emit('toggleTheme')"
      >
        <svg v-if="props.theme === 'light'" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm0-16h1v3h-1V2zm0 19h1v3h-1v-3zM4.22 5.64l.7-.7 2.12 2.12-.7.7L4.22 5.64zm12.74 12.74.7-.7 2.12 2.12-.7.7-2.12-2.12zM2 11h3v1H2v-1zm19 0h3v1h-3v-1zM4.22 18.36l2.12-2.12.7.7-2.12 2.12-.7-.7zM16.96 7.06l2.12-2.12.7.7-2.12 2.12-.7-.7z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M21 14.3A8 8 0 0 1 9.7 3a7 7 0 1 0 11.3 11.3z"
          />
        </svg>
      </button>
      <div class="avatar">LC</div>
    </div>
  </header>
</template>
