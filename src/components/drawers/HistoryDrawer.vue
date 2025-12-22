<script setup lang="ts">
/**
 * HistoryDrawer - 历史记录抽屉组件
 * 使用 Ant Design Vue Drawer 组件，实现时间线布局
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
import { computed, ref, watch } from 'vue';
import { 
  Drawer, 
  Input, 
  Button, 
  Space, 
  Tag, 
  Timeline, 
  Typography,
  Empty,
  Tooltip,
  Collapse
} from 'ant-design-vue';
import { 
  StarOutlined, 
  StarFilled, 
  DownloadOutlined, 
  DeleteOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ExpandOutlined
} from '@ant-design/icons-vue';
import type { HistoryItem } from '../../types';

const { Search: InputSearch } = Input;
const { Text, Paragraph } = Typography;

const props = defineProps<{
  open: boolean;
  items: HistoryItem[];
}>();

const emit = defineEmits<{
  'update:open': [boolean];
  load: [item: HistoryItem];
  toggleStar: [id: string];
  delete: [id: string];
}>();

const searchQuery = ref('');
const expandedIds = ref<Set<string>>(new Set());

// 按日期分组历史记录
interface GroupedHistory {
  label: string;
  date: string;
  items: HistoryItem[];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return '今天';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDateKey(timestamp: number): string {
  return new Date(timestamp).toDateString();
}

// 搜索过滤
function matchesSearch(item: HistoryItem): boolean {
  if (!searchQuery.value.trim()) return true;
  
  const query = searchQuery.value.toLowerCase();
  const title = item.title?.toLowerCase() || '';
  const model = item.requestSnapshot.modelId?.toLowerCase() || '';
  const systemPrompt = item.requestSnapshot.systemPrompt?.toLowerCase() || '';
  const output = item.responseSnapshot.outputText?.toLowerCase() || '';
  
  // 搜索用户消息
  let userMessages = '';
  if (Array.isArray(item.requestSnapshot.messages)) {
    userMessages = item.requestSnapshot.messages
      .map(m => (m as { content?: string }).content || '')
      .join(' ')
      .toLowerCase();
  } else if (Array.isArray(item.requestSnapshot.userPrompts)) {
    userMessages = item.requestSnapshot.userPrompts.join(' ').toLowerCase();
  }
  
  return (
    title.includes(query) ||
    model.includes(query) ||
    systemPrompt.includes(query) ||
    userMessages.includes(query) ||
    output.includes(query)
  );
}

// 过滤并分组
const filteredItems = computed(() => {
  return props.items.filter(matchesSearch);
});

const groupedHistory = computed<GroupedHistory[]>(() => {
  const groups = new Map<string, HistoryItem[]>();
  
  // 按日期分组
  filteredItems.value.forEach(item => {
    const dateKey = getDateKey(item.createdAt);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  });
  
  // 转换为数组并排序
  return Array.from(groups.entries())
    .map(([dateKey, items]) => ({
      label: formatDate(items[0].createdAt),
      date: dateKey,
      items: items.sort((a, b) => b.createdAt - a.createdAt)
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
  expandedIds.value = new Set(expandedIds.value);
}

function handleClose() {
  emit('update:open', false);
}

function handleLoad(item: HistoryItem) {
  emit('load', item);
}

function handleToggleStar(id: string) {
  emit('toggleStar', id);
}

function handleDelete(id: string) {
  emit('delete', id);
}

function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getDisplayTitle(item: HistoryItem): string {
  if (item.title) return item.title;
  
  // 从用户消息中提取标题
  if (Array.isArray(item.requestSnapshot.messages) && item.requestSnapshot.messages.length) {
    const firstUserMsg = item.requestSnapshot.messages.find(
      m => (m as { role?: string }).role === 'user'
    );
    if (firstUserMsg) {
      return truncateText((firstUserMsg as { content?: string }).content || '', 50);
    }
  }
  
  if (Array.isArray(item.requestSnapshot.userPrompts) && item.requestSnapshot.userPrompts.length) {
    return truncateText(item.requestSnapshot.userPrompts[0], 50);
  }
  
  return '未命名对话';
}
</script>

<template>
  <Drawer
    :open="props.open"
    title="运行历史"
    placement="right"
    :width="480"
    class="history-drawer"
    @close="handleClose"
  >
    <div class="history-search">
      <InputSearch
        v-model:value="searchQuery"
        placeholder="搜索历史记录..."
        allow-clear
        size="large"
      />
    </div>
    
    <div class="history-content" v-if="groupedHistory.length">
      <div 
        v-for="group in groupedHistory" 
        :key="group.date"
        class="history-group"
      >
        <div class="group-header">
          <Text strong>{{ group.label }}</Text>
          <Text type="secondary" class="group-count">{{ group.items.length }} 条</Text>
        </div>
        
        <Timeline class="history-timeline">
          <Timeline.Item 
            v-for="item in group.items" 
            :key="item.id"
            :color="item.star ? 'gold' : 'blue'"
          >
            <div 
              class="history-item"
              :class="{ 'is-expanded': expandedIds.has(item.id) }"
            >
              <div class="item-header" @click="toggleExpand(item.id)">
                <div class="item-title-row">
                  <component 
                    :is="item.star ? StarFilled : StarOutlined" 
                    class="star-icon"
                    :class="{ 'is-starred': item.star }"
                    @click.stop="handleToggleStar(item.id)"
                  />
                  <Text strong class="item-title">{{ getDisplayTitle(item) }}</Text>
                </div>
                
                <div class="item-meta">
                  <Space :size="8" wrap>
                    <Tag color="blue">
                      <template #icon><RobotOutlined /></template>
                      {{ item.requestSnapshot.modelId }}
                    </Tag>
                    <Tag>
                      <template #icon><ClockCircleOutlined /></template>
                      {{ formatTime(item.createdAt) }}
                    </Tag>
                  </Space>
                </div>
                
                <div class="item-metrics">
                  <Space :size="4">
                    <Tooltip title="首字节响应时间">
                      <Tag size="small">
                        TTFB {{ item.responseSnapshot.metrics.ttfbMs?.toFixed(0) ?? '-' }}ms
                      </Tag>
                    </Tooltip>
                    <Tooltip title="总耗时">
                      <Tag size="small">
                        {{ item.responseSnapshot.metrics.totalMs?.toFixed(0) ?? '-' }}ms
                      </Tag>
                    </Tooltip>
                    <Tooltip title="Token 用量">
                      <Tag size="small">
                        {{ item.responseSnapshot.usage?.total ?? '-' }} tokens
                      </Tag>
                    </Tooltip>
                    <Tag 
                      v-if="item.responseSnapshot.toolCalls?.length" 
                      size="small"
                      color="purple"
                    >
                      <template #icon><ThunderboltOutlined /></template>
                      {{ item.responseSnapshot.toolCalls.length }} calls
                    </Tag>
                  </Space>
                </div>
              </div>
              
              <Collapse 
                :activeKey="expandedIds.has(item.id) ? [item.id] : []"
                :bordered="false"
                class="item-details"
              >
                <Collapse.Panel :key="item.id" :show-arrow="false">
                  <div class="detail-section">
                    <Text type="secondary" class="detail-label">输出预览</Text>
                    <Paragraph 
                      class="output-preview"
                      :ellipsis="{ rows: 4, expandable: true, symbol: '展开' }"
                    >
                      {{ item.responseSnapshot.outputText }}
                    </Paragraph>
                  </div>
                  
                  <div class="item-actions">
                    <Space>
                      <Button 
                        type="primary" 
                        size="small"
                        @click="handleLoad(item)"
                      >
                        <template #icon><DownloadOutlined /></template>
                        载入
                      </Button>
                      <Button 
                        size="small"
                        @click="handleToggleStar(item.id)"
                      >
                        <template #icon>
                          <component :is="item.star ? StarFilled : StarOutlined" />
                        </template>
                        {{ item.star ? '取消收藏' : '收藏' }}
                      </Button>
                      <Button 
                        size="small" 
                        danger
                        @click="handleDelete(item.id)"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Space>
                  </div>
                </Collapse.Panel>
              </Collapse>
            </div>
          </Timeline.Item>
        </Timeline>
      </div>
    </div>
    
    <Empty 
      v-else 
      :description="searchQuery ? '没有找到匹配的记录' : '暂无历史记录'"
      class="history-empty"
    />
  </Drawer>
</template>

<style scoped>
.history-search {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.history-content {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.history-group {
  margin-bottom: 24px;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.group-count {
  font-size: 12px;
}

.history-timeline {
  padding-left: 4px;
}

.history-item {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all var(--duration-normal) var(--ease-out-expo);
  cursor: pointer;
}

.history-item:hover {
  background: var(--hover-bg);
}

.history-item.is-expanded {
  background: var(--card-solid);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.item-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.star-icon {
  font-size: 14px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color var(--duration-fast);
}

.star-icon:hover {
  color: var(--warning-color);
}

.star-icon.is-starred {
  color: var(--warning-color);
}

.item-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
}

.item-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.item-details {
  margin-top: 12px;
  background: transparent !important;
}

.item-details :deep(.ant-collapse-content-box) {
  padding: 0 !important;
}

.detail-section {
  margin-bottom: 12px;
}

.detail-label {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
}

.output-preview {
  background: var(--code-bg);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.item-actions {
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.history-empty {
  margin-top: 48px;
}
</style>
