<script setup lang="ts">
import { ref } from 'vue';
import type { Plugin, ProviderProfile, ProviderProfileDraft } from '../types';

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

const importInputEl = ref<HTMLInputElement | null>(null);

function triggerImport() {
  importInputEl.value?.click();
}

function onImportChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  props.onImportProviders(file);
}
</script>

<template>
  <div class="provider-panel">
    <div class="provider-panel__content">
      <div class="flex-between provider-panel__head">
        <h3>Provider 管理</h3>
        <div class="row provider-panel__head-actions">
          <input ref="importInputEl" type="file" accept=".zip" style="display: none" @change="onImportChange" />
          <button class="ghost" style="flex: 0 0 auto" @click="triggerImport">导入（加密 zip）</button>
          <button class="ghost" style="flex: 0 0 auto" @click="props.onExportProviders">导出（加密 zip）</button>
          <button class="ghost" style="flex: 0 0 auto" @click="props.onClearKeys">清空所有密钥</button>
          <button class="ghost" style="flex: 0 0 auto" @click="emit('close')">关闭</button>
        </div>
      </div>

      <div class="provider-panel__hint small-text">
        提示：API Key 会以明文形式保存在本机浏览器的 localStorage 中；请避免在不可信环境使用，并建议定期清空。
      </div>

      <div class="provider-form">
        <div class="row">
          <div>
            <label>名称</label>
            <input v-model="props.newProfile.name" placeholder="如：OpenAI 生产环境" />
          </div>
          <div>
            <label>模型协议</label>
            <select v-model="props.newProfile.pluginId">
              <option v-for="plugin in props.plugins" :key="plugin.id" :value="plugin.id">
                {{ plugin.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="row">
          <div>
            <label>Base URL</label>
            <input v-model="props.newProfile.baseUrl" :placeholder="props.defaultProviderTemplate" title="未填写则使用默认值" />
          </div>
          <div>
            <label>API Key</label>
            <input v-model="props.newProfile.apiKey" type="password" autocomplete="off" placeholder="存储在本地" />
          </div>
        </div>

        <div class="flex-between" style="margin-top: 8px">
          <div class="row" style="width: 240px">
            <button class="ghost" @click="props.onResetNewProfile">重置</button>
            <button @click="props.onAddProfile">添加 Provider</button>
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>模型协议</th>
              <th>Base URL</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!props.providerProfiles.length">
              <td colspan="4">暂无 Provider，请先添加。</td>
            </tr>
            <tr v-for="profile in props.providerProfiles" :key="profile.id">
              <td>{{ profile.name }}</td>
              <td>{{ props.plugins.find((p) => p.id === profile.pluginId)?.name || '未知模型协议' }}</td>
              <td>{{ profile.baseUrl }}</td>
              <td>
                <button class="ghost" @click="props.onRemoveProfile(profile.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
