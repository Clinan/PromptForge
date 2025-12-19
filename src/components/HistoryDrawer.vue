<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Collapse, Drawer, Empty, Input, Space, Tag, Tooltip, Typography } from 'ant-design-vue';
import { StarFilled, StarOutlined } from '@ant-design/icons-vue';
import type { HistoryItem } from '../types';

const { Search: InputSearch } = Input;
const { Paragraph: TypographyParagraph } = Typography;
const CollapsePanel = Collapse.Panel;

const props = defineProps<{
  items: HistoryItem[];
}>();

const emit = defineEmits<{
  close: [];
  load: [item: HistoryItem];
  toggleStar: [id: string];
}>();

const query = ref('');
const activeId = ref<string | undefined>();

function displayMessages(item: HistoryItem) {
  const legacyUserPrompt = (item.requestSnapshot as unknown as { userPrompt?: string }).userPrompt || '';
  if (Array.isArray(item.requestSnapshot.messages) && item.requestSnapshot.messages.length) {
    return item.requestSnapshot.messages
      .map((msg) => `[${(msg as { role?: string }).role || 'user'}] ${(msg as { content?: string }).content || ''}`)
      .join('\n\n');
  }
  if (Array.isArray(item.requestSnapshot.userPrompts) && item.requestSnapshot.userPrompts.length) {
    return item.requestSnapshot.userPrompts.join('\n\n');
  }
  return legacyUserPrompt;
}

function matchesQuery(item: HistoryItem) {
  const q = query.value.toLowerCase();
  if (!q) return true;
  const userJoined = displayMessages(item);
  return (
    item.title.toLowerCase().includes(q) ||
    userJoined.toLowerCase().includes(q) ||
    item.requestSnapshot.systemPrompt.toLowerCase().includes(q)
  );
}

const filtered = computed(() => props.items.filter(matchesQuery));

watch(
  filtered,
  (list) => {
    if (!list.length) {
      activeId.value = undefined;
      return;
    }
    if (!activeId.value || !list.some((item) => item.id === activeId.value)) {
      activeId.value = list[0]!.id;
    }
  },
  { immediate: true }
);
</script>

<template>
  <Drawer
    :open="true"
    title="历史记录"
    placement="right"
    :width="720"
    @close="emit('close')"
    :body-style="{ paddingBottom: '24px' }"
  >
    <Space direction="vertical" style="width: 100%" size="large">
      <InputSearch v-model:value="query" placeholder="搜索 system/user prompt" allow-clear />

      <Collapse
        v-if="filtered.length"
        v-model:activeKey="activeId"
        accordion
        bordered
        style="background: transparent"
      >
        <CollapsePanel v-for="item in filtered" :key="item.id">
          <template #header>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%">
              <div>
                <div style="font-weight: 600; margin-bottom: 6px">{{ item.title }}</div>
                <div style="font-size: 12px; color: var(--text-muted); display: flex; gap: 12px; flex-wrap: wrap">
                  <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
                  <span>模型：{{ item.requestSnapshot.modelId }}</span>
                  <span>温度：{{ item.requestSnapshot.params?.temperature ?? '默认' }}</span>
                </div>
              </div>
              <Tooltip :title="item.star ? '取消收藏' : '收藏'">
                <Button
                  type="text"
                  shape="circle"
                  @click.stop="emit('toggleStar', item.id)"
                  :aria-label="item.star ? '取消收藏' : '收藏'"
                >
                  <template #icon>
                    <StarFilled v-if="item.star" />
                    <StarOutlined v-else />
                  </template>
                </Button>
              </Tooltip>
            </div>
          </template>

          <Space direction="vertical" style="width: 100%" size="small">
            <Space wrap size="small">
              <Tag>首包 {{ item.responseSnapshot.metrics.ttfbMs?.toFixed(0) ?? '-' }} ms</Tag>
              <Tag>总耗时 {{ item.responseSnapshot.metrics.totalMs?.toFixed(0) ?? '-' }} ms</Tag>
              <Tag>Tokens {{ item.responseSnapshot.usage?.total ?? '-' }}</Tag>
              <Tag v-if="(item.responseSnapshot.toolCalls?.length || 0) > 0">
                Tool Calls {{ item.responseSnapshot.toolCalls?.length || 0 }}
              </Tag>
            </Space>
            <Space>
              <Button size="small" type="primary" @click="emit('load', item)">载入</Button>
            </Space>
            <TypographyParagraph style="margin-bottom: 0; white-space: pre-wrap">
              {{ displayMessages(item) }}
            </TypographyParagraph>
            <TypographyParagraph type="secondary" style="margin-bottom: 0; white-space: pre-wrap">
              System Prompt: {{ item.requestSnapshot.systemPrompt || '未设置' }}
            </TypographyParagraph>
            <TypographyParagraph code style="white-space: pre-wrap">{{ item.responseSnapshot.outputText }}</TypographyParagraph>
          </Space>
        </CollapsePanel>
      </Collapse>
      <Empty v-else description="暂无历史记录" />
    </Space>
  </Drawer>
</template>
