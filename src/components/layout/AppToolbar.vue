<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { Button, Select, Space, Tooltip, Divider } from 'ant-design-vue';
import {
  ApiOutlined,
  SettingOutlined,
  ToolOutlined,
  FieldStringOutlined,
  HistoryOutlined,
  BulbOutlined,
  BulbFilled,
  PlusOutlined,
  AppstoreAddOutlined,
  MessageOutlined,
  ImportOutlined
} from '@ant-design/icons-vue';

const props = defineProps<{
  projectOptions: { id: string; label: string }[];
  selectedProject: string;
  theme: 'light' | 'dark';
}>();

const emit = defineEmits<{
  'update:selectedProject': [string];
  openProvider: [];
  openParams: [];
  openTools: [];
  openVars: [];
  openHistory: [];
  toggleTheme: [];
  addSlot: [];
  addMessage: [];
  importCurl: [];
}>();

const slots = useSlots();
const hasProjectSelector = computed(() => !!slots['project-selector']);

const themeIcon = computed(() => props.theme === 'light' ? BulbOutlined : BulbFilled);
const themeTooltip = computed(() => props.theme === 'light' ? '切换为暗色主题' : '切换为浅色主题');
</script>

<template>
  <header class="app-toolbar">
    <div class="toolbar-left">
      <div class="logo">
        <span class="logo-icon">🔷</span>
        <span class="logo-text">TruestPrompt</span>
      </div>
      <!-- 使用自定义 ProjectSelector 或默认 Select -->
      <slot name="project-selector">
        <Select
          :value="props.selectedProject"
          :options="props.projectOptions.map(p => ({ value: p.id, label: p.label }))"
          class="project-select"
          @change="(val: string) => emit('update:selectedProject', val)"
        />
      </slot>
    </div>
    
    <div class="toolbar-center">
      <Space :size="8">
        <Tooltip title="添加 Slot">
          <Button type="primary" class="btn-interactive" @click="emit('addSlot')">
            <template #icon><AppstoreAddOutlined /></template>
            添加 Slot
          </Button>
        </Tooltip>
        
        <Tooltip title="添加消息">
          <Button type="primary" class="btn-interactive" @click="emit('addMessage')">
            <template #icon><MessageOutlined /></template>
            添加消息
          </Button>
        </Tooltip>
        
        <Divider type="vertical" />
        
        <Tooltip title="Provider 管理">
          <Button class="btn-interactive" @click="emit('openProvider')">
            <template #icon><ApiOutlined /></template>
            Provider
          </Button>
        </Tooltip>

        <Tooltip title="默认参数">
          <Button class="btn-interactive" @click="emit('openParams')">
            <template #icon><SettingOutlined /></template>
            参数
          </Button>
        </Tooltip>
        
        <Tooltip title="Tools 定义">
          <Button class="btn-interactive" @click="emit('openTools')">
            <template #icon><ToolOutlined /></template>
            Tools
          </Button>
        </Tooltip>
        
        <Tooltip title="模板变量">
          <Button class="btn-interactive" @click="emit('openVars')">
            <template #icon><FieldStringOutlined /></template>
            变量
          </Button>
        </Tooltip>
        
        <Divider type="vertical" />
        
        <Tooltip title="运行历史">
          <Button class="btn-interactive" @click="emit('openHistory')">
            <template #icon><HistoryOutlined /></template>
            历史
          </Button>
        </Tooltip>
        
        <Tooltip title="导入 cURL">
          <Button class="btn-interactive" @click="emit('importCurl')">
            <template #icon><ImportOutlined /></template>
            导入 cURL
          </Button>
        </Tooltip>
      </Space>
    </div>
    
    <div class="toolbar-right">
      <Tooltip :title="themeTooltip">
        <Button 
          class="btn-interactive theme-toggle-btn" 
          shape="circle"
          @click="emit('toggleTheme')"
        >
          <template #icon><component :is="themeIcon" /></template>
        </Button>
      </Tooltip>
    </div>
  </header>
</template>

<style scoped>
.app-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: var(--card-solid);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.logo-icon {
  font-size: 16px;
}

.project-select {
  min-width: 120px;
}

.project-select :deep(.ant-select-selector) {
  font-size: 12px;
  height: 26px !important;
}

.project-select :deep(.ant-select-selection-item) {
  line-height: 24px !important;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.toolbar-center :deep(.ant-btn) {
  font-size: 12px;
  height: 26px;
  padding: 0 8px;
}

.toolbar-center :deep(.ant-space-item) {
  line-height: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px !important;
  height: 26px !important;
}
</style>
