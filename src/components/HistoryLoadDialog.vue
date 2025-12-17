<script setup lang="ts">
import type { HistoryItem } from '../types';

export type HistoryLoadOptions = {
  provider: boolean;
  model: boolean;
  systemPrompt: boolean;
  params: boolean;
  userPrompts: boolean;
  tools: boolean;
  output: boolean;
  metrics: boolean;
};

const props = defineProps<{
  open: boolean;
  item: HistoryItem | null;
  options: HistoryLoadOptions;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <teleport to="body">
    <div v-if="props.open" class="modal-mask" @click.self="emit('close')">
      <div class="modal history-load-dialog" role="dialog" aria-modal="true">
        <div class="flex-between" style="margin-bottom: 10px">
          <div>
            <div style="font-weight: 900; font-size: 16px">载入历史</div>
            <div class="small" style="margin-top: 2px">
              勾选要覆盖的内容（未勾选则保留当前编辑器内容）。
            </div>
          </div>
          <button class="ghost pill" style="flex: 0 0 auto" @click="emit('close')">关闭</button>
        </div>

        <div v-if="props.item" class="history-load-meta">
          <div class="small">标题：{{ props.item.title }}</div>
          <div class="small">时间：{{ new Date(props.item.createdAt).toLocaleString() }}</div>
          <div class="small">模型：{{ props.item.requestSnapshot.modelId }}</div>
        </div>

        <div class="history-load-grid">
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.provider" />
            <span>Provider</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.model" />
            <span>Model</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.systemPrompt" />
            <span>System Prompt</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.params" />
            <span>参数（写入当前 Slot 参数）</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.userPrompts" />
            <span>User Prompts</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.tools" />
            <span>Tools</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.output" />
            <span>响应结果（输出文本）</span>
          </label>
          <label class="history-load-check">
            <input type="checkbox" v-model="props.options.metrics" />
            <span>耗时/用量</span>
          </label>
        </div>

        <div class="flex-between" style="margin-top: 14px">
          <div class="small">提示：将优先写入“已选中”的 Slot（否则写入第一个 Slot）。</div>
          <div class="row" style="flex: 0 0 auto; gap: 8px">
            <button class="ghost pill" style="flex: 0 0 auto" @click="emit('close')">取消</button>
            <button class="pill" style="flex: 0 0 auto" @click="emit('confirm')">确定载入</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

