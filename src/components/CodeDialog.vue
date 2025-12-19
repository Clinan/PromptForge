<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Col, Modal, Row, Space, Switch, Typography, message } from 'ant-design-vue';
import { CopyOutlined } from '@ant-design/icons-vue';
import JsonEditor from './JsonEditor.vue';

const { Text: TypographyText } = Typography;

const props = defineProps<{
  open: boolean;
  title: string;
  code: string;
  usePlaceholder: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'update:usePlaceholder': [boolean];
}>();

const copied = ref(false);
let copiedTimer: number | null = null;
const placeholderProxy = computed({
  get: () => props.usePlaceholder,
  set: (val: boolean) => emit('update:usePlaceholder', val)
});

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code || '');
    copied.value = true;
    message.success('已复制到剪贴板');
    if (copiedTimer !== null) window.clearTimeout(copiedTimer);
    copiedTimer = window.setTimeout(() => (copied.value = false), 1200);
  } catch (err) {
    message.error('复制失败，请检查浏览器权限。');
    console.warn(err);
  }
}

watch(
  () => props.open,
  (v) => {
    if (!v) {
      copied.value = false;
      if (copiedTimer !== null) window.clearTimeout(copiedTimer);
      copiedTimer = null;
    }
  }
);
</script>

<template>
  <Modal :open="props.open" :title="props.title" :width="960" :footer="null" @cancel="emit('close')">
    <Space direction="vertical" size="middle" style="width: 100%">
      <Row align="middle" justify="space-between">
        <Col flex="auto">
          <Space align="center">
            <Switch v-model:checked="placeholderProxy" />
            <TypographyText>API Key 使用占位符</TypographyText>
          </Space>
        </Col>
        <Col flex="0 0 auto">
          <Space>
            <TypographyText v-if="copied" type="success">已复制</TypographyText>
            <Button @click="copy">
              <template #icon>
                <CopyOutlined />
              </template>
              复制
            </Button>
            <Button @click="emit('close')">关闭</Button>
          </Space>
        </Col>
      </Row>
      <JsonEditor class="code-dialog__editor" :modelValue="props.code" readonly language="javascript" />
    </Space>
  </Modal>
</template>
