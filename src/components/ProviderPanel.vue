<script setup lang="ts">
import { computed } from 'vue';
import {
  Alert,
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from 'ant-design-vue';
import type { UploadProps } from 'ant-design-vue';
import type { Plugin, ProviderProfile, ProviderProfileDraft } from '../types';

const { Password: InputPassword } = Input;
const { Title: TypographyTitle } = Typography;
const FormItem = Form.Item;

const props = defineProps<{
  plugins: Plugin[];
  providerProfiles: ProviderProfile[];
  newProfile: ProviderProfileDraft;
  defaultProviderTemplate: string;
  onResetNewProfile: () => void;
  onAddProfile: () => void;
  onRemoveProfile: (id: string) => void;
  onExportProviders: () => void;
  onImportProviders: (file: File) => void;
  onClearKeys: () => void;
}>();

const emit = defineEmits<{
  close: [];
}>();

const pluginOptions = computed(() =>
  props.plugins.map((plugin) => ({
    label: plugin.name,
    value: plugin.id,
  }))
);

const pluginLookup = computed(() =>
  props.plugins.reduce<Record<string, string>>((acc, plugin) => {
    acc[plugin.id] = plugin.name;
    return acc;
  }, {})
);

const tableColumns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '模型协议',
    dataIndex: 'pluginId',
    key: 'plugin',
  },
  {
    title: 'Base URL',
    dataIndex: 'baseUrl',
    key: 'baseUrl',
  },
  {
    title: '操作',
    key: 'actions',
  },
];

const tableLocale = {
  emptyText: '暂无 Provider，请先添加。',
};

const handleImportBeforeUpload: UploadProps['beforeUpload'] = (file) => {
  const realFile = file.originFileObj ?? (file as unknown as File);
  if (realFile) {
    props.onImportProviders(realFile);
  }
  return false;
};
</script>

<template>
  <Drawer
    :open="true"
    title="Provider 管理"
    placement="right"
    :width="640"
    :maskClosable="true"
    @close="emit('close')"
    :footer-style="{ textAlign: 'right' }"
  >
    <template #extra>
      <Space>
        <Upload accept=".zip" :show-upload-list="false" :before-upload="handleImportBeforeUpload">
          <Button type="link">导入（加密 zip）</Button>
        </Upload>
        <Button type="link" @click="props.onExportProviders">导出（加密 zip）</Button>
        <Button type="link" danger @click="props.onClearKeys">清空所有密钥</Button>
      </Space>
    </template>

    <Alert
      type="info"
      show-icon
      description="APIKey会以明文形式保存在本机浏览器的中"
      style="margin-bottom: 16px"
    />

    <Form layout="vertical">
      <Row :gutter="[16, 0]">
        <Col :span="12">
          <FormItem label="名称">
            <Input v-model:value="props.newProfile.name" placeholder="如：OpenAI 生产环境" />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="模型协议">
            <Select v-model:value="props.newProfile.pluginId" :options="pluginOptions" placeholder="选择模型协议" />
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="[16, 0]">
        <Col :span="12">
          <FormItem label="Base URL">
            <Input v-model:value="props.newProfile.baseUrl" :placeholder="props.defaultProviderTemplate" title="未填写则使用默认值" />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="API Key">
            <InputPassword v-model:value="props.newProfile.apiKey" autocomplete="off" placeholder="存储在本地" />
          </FormItem>
        </Col>
      </Row>

      <FormItem>
        <Space>
          <Button @click="props.onResetNewProfile">重置</Button>
          <Button type="primary" @click="props.onAddProfile">添加 Provider</Button>
        </Space>
      </FormItem>
    </Form>

    <Table
      :columns="tableColumns"
      :data-source="props.providerProfiles"
      row-key="id"
      size="middle"
      :scroll="{ y: 280 }"
      :pagination="false"
      :locale="tableLocale"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'plugin'">
          {{ pluginLookup[record.pluginId] || '未知模型协议' }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <Button type="link" danger size="small" @click="props.onRemoveProfile(record.id)">删除</Button>
        </template>
      </template>
    </Table>

    <template #footer>
      <Button type="primary" @click="emit('close')">关闭</Button>
    </template>
  </Drawer>
</template>
