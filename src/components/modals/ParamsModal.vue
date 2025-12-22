<script setup lang="ts">
/**
 * ParamsModal - Slot 自定义参数配置弹窗
 * 允许用户为单个 Slot 覆盖默认参数（temperature, top_p, max_tokens 等）
 */
import { ref, watch, computed } from 'vue';
import { Modal, Form, InputNumber, Switch, Space, Button, Tooltip } from 'ant-design-vue';
import { InfoCircleOutlined, UndoOutlined } from '@ant-design/icons-vue';
import type { SharedState } from '../../types';

const props = defineProps<{
  open: boolean;
  paramOverride: Record<string, unknown> | null;
  defaultParams: SharedState['defaultParams'];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  save: [params: Record<string, unknown> | null];
}>();

// 本地表单状态
const localParams = ref<{
  temperature: number | undefined;
  top_p: number | undefined;
  max_tokens: number | undefined;
  useCustom: boolean;
}>({
  temperature: undefined,
  top_p: undefined,
  max_tokens: undefined,
  useCustom: false
});

// 监听 props 变化，初始化本地状态
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.paramOverride) {
      localParams.value = {
        temperature: props.paramOverride.temperature as number | undefined,
        top_p: props.paramOverride.top_p as number | undefined,
        max_tokens: props.paramOverride.max_tokens as number | undefined,
        useCustom: true
      };
    } else {
      localParams.value = {
        temperature: undefined,
        top_p: undefined,
        max_tokens: undefined,
        useCustom: false
      };
    }
  }
}, { immediate: true });

// 是否有自定义值
const hasCustomValues = computed(() => {
  return localParams.value.temperature !== undefined ||
         localParams.value.top_p !== undefined ||
         localParams.value.max_tokens !== undefined;
});

// 获取显示值（自定义值或默认值）
function getDisplayValue(key: 'temperature' | 'top_p' | 'max_tokens'): number {
  const customVal = localParams.value[key];
  if (customVal !== undefined) return customVal;
  return props.defaultParams[key];
}

// 重置单个参数为默认值
function resetParam(key: 'temperature' | 'top_p' | 'max_tokens') {
  localParams.value[key] = undefined;
}

// 重置所有参数
function resetAll() {
  localParams.value = {
    temperature: undefined,
    top_p: undefined,
    max_tokens: undefined,
    useCustom: false
  };
}

// 关闭弹窗
function handleClose() {
  emit('update:open', false);
}

// 保存参数
function handleSave() {
  if (!hasCustomValues.value) {
    // 没有自定义值，清空 paramOverride
    emit('save', null);
  } else {
    // 构建 paramOverride 对象，只包含非 undefined 的值
    const override: Record<string, unknown> = {};
    if (localParams.value.temperature !== undefined) {
      override.temperature = localParams.value.temperature;
    }
    if (localParams.value.top_p !== undefined) {
      override.top_p = localParams.value.top_p;
    }
    if (localParams.value.max_tokens !== undefined) {
      override.max_tokens = localParams.value.max_tokens;
    }
    emit('save', override);
  }
  handleClose();
}
</script>

<template>
  <Modal
    :open="props.open"
    title="Slot 参数配置"
    :width="420"
    @cancel="handleClose"
    @ok="handleSave"
  >
    <div class="params-modal-content">
      <div class="params-hint">
        <InfoCircleOutlined />
        <span>自定义参数将覆盖全局默认值。留空则使用默认值。</span>
      </div>

      <Form layout="vertical" class="params-form">
        <!-- Temperature -->
        <Form.Item>
          <template #label>
            <div class="param-label">
              <span>Temperature</span>
              <span class="default-hint">默认: {{ props.defaultParams.temperature }}</span>
            </div>
          </template>
          <div class="param-input-row">
            <InputNumber
              v-model:value="localParams.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              :placeholder="String(props.defaultParams.temperature)"
              class="param-input"
            />
            <Tooltip title="重置为默认值">
              <Button 
                type="text" 
                size="small"
                :disabled="localParams.temperature === undefined"
                @click="resetParam('temperature')"
              >
                <template #icon><UndoOutlined /></template>
              </Button>
            </Tooltip>
          </div>
        </Form.Item>

        <!-- Top P -->
        <Form.Item>
          <template #label>
            <div class="param-label">
              <span>Top P</span>
              <span class="default-hint">默认: {{ props.defaultParams.top_p }}</span>
            </div>
          </template>
          <div class="param-input-row">
            <InputNumber
              v-model:value="localParams.top_p"
              :min="0"
              :max="1"
              :step="0.05"
              :placeholder="String(props.defaultParams.top_p)"
              class="param-input"
            />
            <Tooltip title="重置为默认值">
              <Button 
                type="text" 
                size="small"
                :disabled="localParams.top_p === undefined"
                @click="resetParam('top_p')"
              >
                <template #icon><UndoOutlined /></template>
              </Button>
            </Tooltip>
          </div>
        </Form.Item>

        <!-- Max Tokens -->
        <Form.Item>
          <template #label>
            <div class="param-label">
              <span>Max Tokens</span>
              <span class="default-hint">默认: {{ props.defaultParams.max_tokens }}</span>
            </div>
          </template>
          <div class="param-input-row">
            <InputNumber
              v-model:value="localParams.max_tokens"
              :min="1"
              :max="128000"
              :step="100"
              :placeholder="String(props.defaultParams.max_tokens)"
              class="param-input"
            />
            <Tooltip title="重置为默认值">
              <Button 
                type="text" 
                size="small"
                :disabled="localParams.max_tokens === undefined"
                @click="resetParam('max_tokens')"
              >
                <template #icon><UndoOutlined /></template>
              </Button>
            </Tooltip>
          </div>
        </Form.Item>
      </Form>

      <!-- 重置所有按钮 -->
      <div class="reset-all-row">
        <Button 
          type="link" 
          size="small"
          :disabled="!hasCustomValues"
          @click="resetAll"
        >
          重置所有为默认值
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.params-modal-content {
  padding: 8px 0;
}

.params-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.params-form {
  margin-bottom: 8px;
}

.params-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.param-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.default-hint {
  font-size: 11px;
  color: var(--text-tertiary, #999);
  font-weight: normal;
}

.param-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.param-input {
  flex: 1;
}

.reset-all-row {
  text-align: right;
  padding-top: 8px;
  border-top: 1px solid var(--border-color, #e8e8e8);
}
</style>
