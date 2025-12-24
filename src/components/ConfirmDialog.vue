<script setup lang="ts">
import { Modal, Button, Space } from 'ant-design-vue';
import { ExclamationCircleOutlined, WarningOutlined } from '@ant-design/icons-vue';

const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
}>();

const emit = defineEmits<{
  'update:open': [boolean];
  close: [];
  confirm: [];
}>();

function handleClose() {
  emit('close');
  emit('update:open', false);
}

function handleConfirm() {
  emit('confirm');
}
</script>

<template>
  <Modal
    :open="props.open"
    :title="null"
    :width="420"
    :closable="false"
    :maskClosable="true"
    centered
    @cancel="handleClose"
    class="confirm-dialog-modal"
  >
    <div class="confirm-dialog-content">
      <div class="confirm-dialog-icon" :class="{ danger: props.tone === 'danger' }">
        <WarningOutlined v-if="props.tone === 'danger'" />
        <ExclamationCircleOutlined v-else />
      </div>
      <div class="confirm-dialog-body">
        <div class="confirm-dialog-title">{{ props.title }}</div>
        <div v-if="props.description" class="confirm-dialog-desc">
          {{ props.description }}
        </div>
      </div>
    </div>
    
    <template #footer>
      <Space>
        <Button @click="handleClose">
          {{ props.cancelText || '取消' }}
        </Button>
        <Button
          :type="props.tone === 'danger' ? 'primary' : 'primary'"
          :danger="props.tone === 'danger'"
          @click="handleConfirm"
        >
          {{ props.confirmText || '确定' }}
        </Button>
      </Space>
    </template>
  </Modal>
</template>

<style scoped>
.confirm-dialog-modal :deep(.ant-modal-body) {
  padding: 24px;
}

.confirm-dialog-modal :deep(.ant-modal-footer) {
  padding: 12px 24px 24px;
  border-top: none;
  text-align: right;
}

.confirm-dialog-content {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.confirm-dialog-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-bg, rgba(22, 119, 255, 0.1));
  color: var(--primary-color, #1677ff);
  font-size: 20px;
}

.confirm-dialog-icon.danger {
  background: var(--error-bg, rgba(255, 77, 79, 0.1));
  color: var(--error-color, #ff4d4f);
}

.confirm-dialog-body {
  flex: 1;
  min-width: 0;
}

.confirm-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.confirm-dialog-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
