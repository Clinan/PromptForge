<script setup lang="ts">
import { Badge, Button, Card, Empty, List, Space, Typography } from 'ant-design-vue';
import type { Plugin, ProviderProfile } from '../types';

const { Text: TypographyText } = Typography;

const props = defineProps<{
  providerProfiles: ProviderProfile[];
  plugins: Plugin[];
}>();

const emit = defineEmits<{
  manage: [];
}>();
</script>

<template>
  <Card size="small">
    <template #title>Providers</template>
    <template #extra>
      <Button type="link" size="small" @click="emit('manage')">管理</Button>
    </template>
    <List v-if="props.providerProfiles.length" :data-source="props.providerProfiles" size="small" :split="false">
      <template #renderItem="{ item }">
        <List.Item>
          <Button type="text" block @click="emit('manage')">
            <Space align="start">
              <Badge status="processing" />
              <Space direction="vertical" size="small" align="start">
                <TypographyText strong>{{ item.name }}</TypographyText>
                <TypographyText type="secondary">
                  {{ props.plugins.find((p) => p.id === item.pluginId)?.name }}
                </TypographyText>
              </Space>
            </Space>
          </Button>
        </List.Item>
      </template>
    </List>
    <Empty v-else description="暂无 Provider" />
  </Card>
</template>
