<script setup lang="ts">
import { Button, Card, Col, Collapse, Input, InputNumber, Row, Space, Switch, Typography } from 'ant-design-vue';
import type { SharedState, UserPromptPreset } from '../types';
import { newId } from '../lib/id';
import JsonEditor from './JsonEditor.vue';

const { TextArea } = Input;
const { Text: TypographyText, Title: TypographyTitle } = Typography;
const CollapsePanel = Collapse.Panel;

const props = defineProps<{
  shared: SharedState;
}>();

function addUserPrompt() {
  const prompt: UserPromptPreset = {
    id: newId(),
    text: ''
  };
  props.shared.userPrompts.push(prompt);
}

function removeUserPrompt(id: string) {
  if (props.shared.userPrompts.length <= 1) return;
  const idx = props.shared.userPrompts.findIndex((p) => p.id === id);
  if (idx < 0) return;
  props.shared.userPrompts.splice(idx, 1);
}
</script>

<template>
  <Card size="small">
    <Space direction="vertical" size="middle" style="width: 100%">
      <div>
        <TypographyTitle level="4" style="margin-bottom: 4px">全局设置</TypographyTitle>
        <TypographyText type="secondary">User Prompts 将按顺序提交到 messages（位于 System Prompt 后）。</TypographyText>
      </div>

      <Space direction="vertical" size="small" style="width: 100%">
        <Row align="middle" justify="space-between">
          <Col flex="auto">
            <TypographyText strong>User Prompts（按顺序追加）</TypographyText>
          </Col>
          <Col flex="0 0 auto">
            <Button type="primary" @click="addUserPrompt">新增</Button>
          </Col>
        </Row>
        <Collapse accordion>
          <CollapsePanel v-for="(prompt, index) in props.shared.userPrompts" :key="prompt.id">
            <template #header>
              <Space align="center">
                <TypographyText>消息 {{ index + 1 }}</TypographyText>
                <TypographyText type="secondary">{{ prompt.text.length }} 字</TypographyText>
              </Space>
            </template>
            <Space direction="vertical" size="small" style="width: 100%">
              <TextArea v-model:value="prompt.text" placeholder="输入用户消息（User Prompt）" :auto-size="{ minRows: 3 }" />
              <Button danger :disabled="props.shared.userPrompts.length === 1" @click="removeUserPrompt(prompt.id)">
                删除
              </Button>
            </Space>
          </CollapsePanel>
        </Collapse>
      </Space>

      <Space direction="vertical" size="small" style="width: 100%">
        <TypographyText strong>Tools 定义（JSON）</TypographyText>
        <JsonEditor
          id="tools"
          class="tools-inline-editor"
          v-model="props.shared.toolsDefinition"
          placeholder='[{"name":"fetchDocs","description":"..."}]'
        />
      </Space>

      <Space direction="vertical" size="small" style="width: 100%">
        <TypographyText strong>默认参数</TypographyText>
        <Space wrap>
          <Space direction="vertical" size="small">
            <TypographyText type="secondary">temperature</TypographyText>
            <InputNumber v-model:value="props.shared.defaultParams.temperature" :step="0.1" />
          </Space>
          <Space direction="vertical" size="small">
            <TypographyText type="secondary">top_p</TypographyText>
            <InputNumber v-model:value="props.shared.defaultParams.top_p" :step="0.1" />
          </Space>
          <Space direction="vertical" size="small">
            <TypographyText type="secondary">max_tokens</TypographyText>
            <InputNumber v-model:value="props.shared.defaultParams.max_tokens" :step="1" />
          </Space>
        </Space>
      </Space>

      <Space direction="vertical" size="small">
        <Space align="center" size="middle">
          <Switch v-model:checked="props.shared.enableSuggestions" />
          <TypographyText>启用联想</TypographyText>
        </Space>
        <Space align="center" size="middle">
          <Switch v-model:checked="props.shared.streamOutput" />
          <TypographyText>启用流式输出</TypographyText>
        </Space>
        <TypographyText type="secondary">
          关闭流式输出时，将在完整响应返回后一次性展示内容，cURL 也会同步更新。
        </TypographyText>
      </Space>
    </Space>
  </Card>
</template>
