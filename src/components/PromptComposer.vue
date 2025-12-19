<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button, Card, Col, Input, Row, Select, Space, Tag, Typography } from 'ant-design-vue';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  UnfoldOutlined
} from '@ant-design/icons-vue';
import type { UserPromptPreset } from '../types';
import { newId } from '../lib/id';

const { TextArea } = Input;
const { Paragraph: TypographyParagraph, Text: TypographyText, Title: TypographyTitle } = Typography;

const props = defineProps<{
  messages: UserPromptPreset[];
}>();

const emit = defineEmits<{
  'update:messages': [UserPromptPreset[]];
}>();

const collapsedMap = ref<Record<string, boolean>>({});

const messagesProxy = computed({
  get: () => props.messages,
  set: (next) => emit('update:messages', next)
});

const roleLabels: Record<UserPromptPreset['role'], string> = {
  system: 'System',
  user: 'User',
  assistant: 'Assistant'
};

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({
  label,
  value
}));

function addMessage(role: UserPromptPreset['role'] = 'user') {
  messagesProxy.value = [
    ...messagesProxy.value,
    {
      id: newId(),
      role,
      text: role === 'system' ? 'You are a helpful orchestrator.' : ''
    }
  ];
}

function duplicateMessage(message: UserPromptPreset) {
  const idx = messagesProxy.value.findIndex((m) => m.id === message.id);
  const copy: UserPromptPreset = {
    id: newId(),
    role: message.role,
    text: message.text
  };
  if (idx < 0) {
    messagesProxy.value = [...messagesProxy.value, copy];
    return;
  }
  const next = [...messagesProxy.value];
  next.splice(idx + 1, 0, copy);
  messagesProxy.value = next;
}

function removeMessage(id: string) {
  if (messagesProxy.value.length <= 1) return;
  messagesProxy.value = messagesProxy.value.filter((m) => m.id !== id);
  const map = { ...collapsedMap.value };
  delete map[id];
  collapsedMap.value = map;
}

function moveMessage(id: string, dir: 'up' | 'down') {
  const idx = messagesProxy.value.findIndex((m) => m.id === id);
  if (idx < 0) return;
  const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= messagesProxy.value.length) return;
  const next = [...messagesProxy.value];
  const [item] = next.splice(idx, 1);
  next.splice(targetIdx, 0, item);
  messagesProxy.value = next;
}

function updateMessage(id: string, patch: Partial<UserPromptPreset>) {
  messagesProxy.value = messagesProxy.value.map((message) => (message.id === id ? { ...message, ...patch } : message));
}

function toggleCollapse(id: string) {
  collapsedMap.value = { ...collapsedMap.value, [id]: !collapsedMap.value[id] };
}

function isCollapsed(message: UserPromptPreset) {
  if (!message.text.trim()) return false;
  return collapsedMap.value[message.id] ?? (message.text.split('\n').length > 3);
}

function previewText(text: string) {
  const [firstLine] = text.split('\n');
  return firstLine.length > 140 ? `${firstLine.slice(0, 140)}...` : firstLine;
}
</script>

<template>
  <Space direction="vertical" size="middle" style="width: 100%">
    <Row align="middle" justify="space-between">
      <Col flex="auto">
        <TypographyTitle level="4" style="margin-bottom: 0">Prompt Composer</TypographyTitle>
      </Col>
      <Col flex="0 0 auto">
        <Space size="small" wrap>
          <Button @click="addMessage('system')">
            <template #icon>
              <PlusOutlined />
            </template>
            System
          </Button>
          <Button @click="addMessage('user')">
            <template #icon>
              <PlusOutlined />
            </template>
            User
          </Button>
          <Button @click="addMessage('assistant')">
            <template #icon>
              <PlusOutlined />
            </template>
            Assistant
          </Button>
        </Space>
      </Col>
    </Row>

    <Space direction="vertical" size="middle" style="width: 100%">
      <Card v-for="(message, index) in props.messages" :key="message.id" size="small">
        <template #title>
          <Space align="center" size="middle">
            <Select
              :value="message.role"
              :options="roleOptions"
              style="min-width: 120px"
              @change="(value) => updateMessage(message.id, { role: value as UserPromptPreset['role'] })"
            />
            <Tag>#{{ index + 1 }}</Tag>
            <TypographyText type="secondary">{{ message.text.length }} 字</TypographyText>
          </Space>
        </template>
        <template #extra>
          <Space size="small">
            <Button size="small" @click="duplicateMessage(message)" :title="'复制此消息'">
              <template #icon>
                <CopyOutlined />
              </template>
            </Button>
            <Button size="small" :disabled="index === 0" @click="moveMessage(message.id, 'up')" :title="'上移'">
              <template #icon>
                <ArrowUpOutlined />
              </template>
            </Button>
            <Button
              size="small"
              :disabled="index === props.messages.length - 1"
              @click="moveMessage(message.id, 'down')"
              :title="'下移'"
            >
              <template #icon>
                <ArrowDownOutlined />
              </template>
            </Button>
            <Button
              size="small"
              danger
              :disabled="props.messages.length === 1"
              @click="removeMessage(message.id)"
            >
              <template #icon>
                <DeleteOutlined />
              </template>
            </Button>
          </Space>
        </template>

        <div v-if="isCollapsed(message)">
          <TypographyParagraph type="secondary" style="margin-bottom: 8px">
            {{ previewText(message.text) }}
          </TypographyParagraph>
          <Button type="link" @click="toggleCollapse(message.id)">
            <template #icon>
              <UnfoldOutlined />
            </template>
            展开
          </Button>
        </div>
        <div v-else>
          <TextArea
            :value="message.text"
            :auto-size="{ minRows: 4 }"
            :placeholder="message.role === 'system' ? 'System 指令...' : '输入消息内容'"
            @update:value="(value) => updateMessage(message.id, { text: value })"
          />
          <Button type="link" @click="toggleCollapse(message.id)">收起</Button>
        </div>
      </Card>
    </Space>
  </Space>
</template>
