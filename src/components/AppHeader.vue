<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Avatar, Button, Col, Input, Row, Select, Space, Typography } from 'ant-design-vue';
import { MoonOutlined, SunOutlined } from '@ant-design/icons-vue';

const { Search: InputSearch } = Input;
const { Text: TypographyText } = Typography;

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
const selectedProjectProxy = computed({
  get: () => props.selectedProject,
  set: (value: string) => emit('update:selectedProject', value)
});

const projectSelectOptions = computed(() =>
  props.projectOptions.map((option) => ({
    label: option.label,
    value: option.id
  }))
);

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
  <header class="app-header">
    <Row align="middle" justify="space-between" :gutter="16" wrap="false">
      <Col flex="0 0 auto">
        <Space align="center" size="middle">
          <TypographyText strong class="app-header__logo">TruestPrompt</TypographyText>
          <Select
            v-model:value="selectedProjectProxy"
            :options="projectSelectOptions"
            placeholder="选择项目"
            style="min-width: 180px"
          />
        </Space>
      </Col>
      <Col flex="auto">
        <InputSearch v-model:value="searchValue" placeholder="搜索 Prompt / Runs / Variables" allow-clear />
      </Col>
      <Col flex="0 0 auto">
        <Space align="center" size="middle">
          <Button
            shape="circle"
            :aria-label="props.theme === 'light' ? '切换为暗色' : '切换为浅色'"
            :title="props.theme === 'light' ? '切换为暗色' : '切换为浅色'"
            @click="emit('toggleTheme')"
          >
            <template #icon>
              <MoonOutlined v-if="props.theme === 'light'" />
              <SunOutlined v-else />
            </template>
          </Button>
          <Avatar>LC</Avatar>
        </Space>
      </Col>
    </Row>
  </header>
</template>
