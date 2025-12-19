<script setup lang="ts">
import { Button, Card, Empty, List, Space, Typography } from 'ant-design-vue';
import type { HistoryItem } from '../types';

const { Text: TypographyText } = Typography;

const props = defineProps<{
  recentHistory: HistoryItem[];
}>();

const emit = defineEmits<{
  open: [];
  load: [item: HistoryItem];
}>();
</script>

<template>
  <Card size="small">
    <template #title>Runs History</template>
    <template #extra>
      <Button type="link" size="small" @click="emit('open')">全部</Button>
    </template>
    <List v-if="props.recentHistory.length" :data-source="props.recentHistory" size="small" :split="false">
      <template #renderItem="{ item }">
        <List.Item>
          <Button type="text" block @click="emit('load', item)">
            <Space direction="vertical" size="small" align="start">
              <TypographyText strong>{{ item.title }}</TypographyText>
              <Space size="small">
                <TypographyText type="secondary">
                  {{ new Date(item.createdAt).toLocaleTimeString() }}
                </TypographyText>
                <TypographyText type="secondary">{{ item.requestSnapshot.modelId }}</TypographyText>
              </Space>
            </Space>
          </Button>
        </List.Item>
      </template>
    </List>
    <Empty v-else description="暂无运行记录" />
  </Card>
</template>
