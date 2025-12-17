<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import localforage from 'localforage';
import type {
  HistoryItem,
  PluginRequest,
  ProviderProfile,
  ProviderProfileDraft,
  SharedState,
  Slot,
  UserPromptPreset
} from './types';
import { plugins } from './lib/plugins';
import { newId } from './lib/id';
import { decryptBytes, encryptBytes, unzipSingleFile, zipSingleFile } from './lib/secureZip';
import FloatingActionPanel from './components/FloatingActionPanel.vue';
import ProviderPanel from './components/ProviderPanel.vue';
import SharedPanel from './components/SharedPanel.vue';
import SlotCard from './components/SlotCard.vue';
import HistoryDrawer from './components/HistoryDrawer.vue';
import CodeDialog from './components/CodeDialog.vue';

const localStorageKey = 'promptforge-profiles';
const editorStorageKey = 'promptforge-editor-state-v1';
const historyStore = localforage.createInstance({ name: 'promptforge-history' });
const modelCacheStore = localforage.createInstance({ name: 'promptforge-model-cache' });
const modelCacheTtlMs = 24 * 60 * 60 * 1000;

const providerProfiles = ref<ProviderProfile[]>([]);
const historyItems = ref<HistoryItem[]>([]);
const showHistory = ref(false);
const showProviderManager = ref(false);

const codeDialogOpen = ref(false);
const codeDialogTitle = ref('');
const codeDialogCode = ref('');

const initialUserPrompt: UserPromptPreset = {
  id: newId(),
  text: 'Compare how each slot reacts to this message.'
};

const shared = reactive<SharedState>({
  userPrompts: [initialUserPrompt],
  toolsDefinition: '[{"name":"fetchDocs","description":"Query project docs"}]',
  defaultParams: {
    temperature: 0.7,
    top_p: 1,
    max_tokens: 256,
    stop: '',
    presence_penalty: 0,
    frequency_penalty: 0
  },
  enableSuggestions: true,
  streamOutput: true
});

type PersistedEditorState = {
  version: 2;
  shared: SharedState;
  slots: Array<Pick<Slot, 'id' | 'providerProfileId' | 'pluginId' | 'modelId' | 'systemPrompt' | 'paramOverride'>>;
};

function serializeEditorState(): PersistedEditorState {
  return {
    version: 2,
    shared: {
      userPrompts: shared.userPrompts.map((p) => ({ id: p.id, text: p.text })),
      toolsDefinition: shared.toolsDefinition,
      defaultParams: { ...shared.defaultParams },
      enableSuggestions: shared.enableSuggestions,
      streamOutput: shared.streamOutput
    },
    slots: slots.value.map((slot) => ({
      id: slot.id,
      providerProfileId: slot.providerProfileId,
      pluginId: slot.pluginId,
      modelId: slot.modelId,
      systemPrompt: slot.systemPrompt,
      paramOverride: slot.paramOverride
    }))
  };
}

function loadEditorState() {
  const raw = localStorage.getItem(editorStorageKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEditorState>;
    if (![1, 2].includes((parsed as PersistedEditorState).version) || !parsed.shared) return;

    const restoredUserPrompts = Array.isArray(parsed.shared.userPrompts)
      ? parsed.shared.userPrompts
          .filter((p): p is UserPromptPreset => Boolean(p && typeof (p as UserPromptPreset).id === 'string'))
          .map((p) => ({
            id: p.id,
            text: typeof p.text === 'string' ? p.text : ''
          }))
      : [];

    shared.userPrompts = restoredUserPrompts.length ? restoredUserPrompts : [initialUserPrompt];

    if (typeof parsed.shared.toolsDefinition === 'string') shared.toolsDefinition = parsed.shared.toolsDefinition;
    if (parsed.shared.defaultParams) {
      shared.defaultParams = {
        temperature: Number(parsed.shared.defaultParams.temperature ?? shared.defaultParams.temperature),
        top_p: Number(parsed.shared.defaultParams.top_p ?? shared.defaultParams.top_p),
        max_tokens: Number(parsed.shared.defaultParams.max_tokens ?? shared.defaultParams.max_tokens),
        stop: String(parsed.shared.defaultParams.stop ?? shared.defaultParams.stop),
        presence_penalty: Number(parsed.shared.defaultParams.presence_penalty ?? shared.defaultParams.presence_penalty),
        frequency_penalty: Number(parsed.shared.defaultParams.frequency_penalty ?? shared.defaultParams.frequency_penalty)
      };
    }
    if (typeof parsed.shared.enableSuggestions === 'boolean') shared.enableSuggestions = parsed.shared.enableSuggestions;
    if (typeof parsed.shared.streamOutput === 'boolean') shared.streamOutput = parsed.shared.streamOutput;

    if (Array.isArray(parsed.slots) && parsed.slots.length) {
      const allowedProfileIds = new Set(providerProfiles.value.map((p) => p.id));
      slots.value = parsed.slots.map((slot) => ({
        ...createSlot(),
        id: typeof slot.id === 'string' ? slot.id : newId(),
        providerProfileId:
          typeof slot.providerProfileId === 'string' && allowedProfileIds.has(slot.providerProfileId)
            ? slot.providerProfileId
            : null,
        pluginId: typeof slot.pluginId === 'string' ? slot.pluginId : plugins[0].id,
        modelId: typeof slot.modelId === 'string' ? slot.modelId : 'gpt-4o-mini',
        systemPrompt: typeof slot.systemPrompt === 'string' ? slot.systemPrompt : '',
        paramOverride: (slot.paramOverride as Record<string, unknown> | null) ?? null
      }));
    }
  } catch (err) {
    console.warn('加载本地编辑器状态失败，将忽略并使用默认值。', err);
  }
}

function saveEditorState() {
  try {
    localStorage.setItem(editorStorageKey, JSON.stringify(serializeEditorState()));
  } catch (err) {
    console.warn('保存本地编辑器状态失败。', err);
  }
}

const newProfile = reactive<ProviderProfileDraft>({
  name: '',
  apiKey: '',
  baseUrl: '',
  pluginId: plugins[0].id
});
const modelsByKey = reactive<Record<string, { id: string; label: string }[]>>({});
const refreshingModelsBySlotId = reactive<Record<string, boolean>>({});
const defaultProviderTemplate = computed(() => {
  const plugin = plugins.find((p) => p.id === newProfile.pluginId);
  return plugin?.defaultBaseUrl || 'https://api.openai.com/v1/chat/completions';
});

function removeEmptyEntries(obj: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    cleaned[key] = value;
  });
  return cleaned;
}

const slots = ref<Slot[]>([]);

function loadProfiles() {
  const stored = localStorage.getItem(localStorageKey);
  const parsed = stored ? (JSON.parse(stored) as ProviderProfile[]) : [];
  providerProfiles.value = parsed.map((profile) => {
    const plugin = plugins.find((p) => p.id === profile.pluginId) ?? plugins[0];
    return {
      ...profile,
      pluginId: plugin.id,
      baseUrl: profile.baseUrl || plugin.defaultBaseUrl || 'https://api.openai.com/v1/chat/completions'
    };
  });
}

function saveProfiles() {
  localStorage.setItem(localStorageKey, JSON.stringify(providerProfiles.value));
}

async function exportProvidersEncryptedZip() {
  if (!providerProfiles.value.length) {
    alert('暂无 Provider 可导出');
    return;
  }
  const password = prompt('请输入导出密码（请妥善保存，用于导入解密）');
  if (!password) return;
  const again = prompt('请再次输入密码');
  if (again !== password) {
    alert('两次密码不一致');
    return;
  }
  try {
    const json = JSON.stringify(providerProfiles.value, null, 2);
    const encrypted = await encryptBytes(json, password);
    const zip = zipSingleFile('providers.pfz', encrypted);
    const blob = new Blob([zip], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptforge-providers.zip`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error(err);
    alert('导出失败，请查看控制台错误。');
  }
}

async function importProvidersEncryptedZip(file: File) {
  const password = prompt('请输入导入密码');
  if (!password) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { data } = unzipSingleFile(bytes);
    const json = await decryptBytes(data, password);
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) throw new Error('providers 数据格式不正确');
    const valid = (parsed as any[]).every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.apiKey === 'string' &&
        typeof p.baseUrl === 'string' &&
        typeof p.pluginId === 'string'
    );
    if (!valid) throw new Error('providers 字段不完整');
    localStorage.setItem(localStorageKey, JSON.stringify(parsed));
    loadProfiles();
    resetNewProfile();
    alert('导入成功（已覆盖本地 Provider 列表）');
  } catch (err) {
    console.error(err);
    alert('导入失败：密码错误或文件损坏/格式不支持。');
  }
}

function resetNewProfile() {
  newProfile.name = '';
  newProfile.apiKey = '';
  newProfile.pluginId = plugins[0].id;
  newProfile.baseUrl = plugins[0].defaultBaseUrl || 'https://api.openai.com/v1/chat/completions';
}

function addProfile() {
  if (!newProfile.name.trim()) {
    alert('请填写 Provider 名称');
    return;
  }
  const profile: ProviderProfile = {
    id: newId(),
    name: newProfile.name.trim(),
    apiKey: newProfile.apiKey.trim(),
    baseUrl: newProfile.baseUrl.trim() || defaultProviderTemplate.value,
    pluginId: newProfile.pluginId
  };
  providerProfiles.value.push(profile);
  saveProfiles();
  resetNewProfile();
}

function removeProfile(profileId: string) {
  providerProfiles.value = providerProfiles.value.filter((p) => p.id !== profileId);
  const fallbackProvider = providerProfiles.value[0] || null;
  slots.value = slots.value.map((slot) => {
    if (slot.providerProfileId !== profileId) return slot;
    return {
      ...slot,
      providerProfileId: fallbackProvider?.id ?? null,
      pluginId: fallbackProvider?.pluginId || slot.pluginId
    };
  });
  saveProfiles();
}

function createSlot(copyFrom?: Slot): Slot {
  const defaultProvider = providerProfiles.value[0];
  const providerProfileId = copyFrom?.providerProfileId ?? defaultProvider?.id ?? null;
  const provider = providerProfiles.value.find((p) => p.id === providerProfileId);
  const pluginId = provider?.pluginId ?? copyFrom?.pluginId ?? plugins[0].id;
  return {
    id: newId(),
    providerProfileId,
    pluginId,
    modelId: copyFrom?.modelId ?? 'gpt-4o-mini',
    systemPrompt:
      copyFrom?.systemPrompt ?? 'You are a helpful assistant focused on prompt debugging insights.',
    paramOverride: copyFrom?.paramOverride ? { ...copyFrom.paramOverride } : null,
    selected: true,
    status: 'idle',
    output: '',
    metrics: { ttfbMs: null, totalMs: null }
  };
}

function addSlot(copyFrom?: Slot) {
  slots.value.push(createSlot(copyFrom));
}

function removeSlot(slotId: string) {
  slots.value = slots.value.filter((s) => s.id !== slotId);
}

const selectedSlots = computed(() => slots.value.filter((s) => s.selected));

async function refreshModelsForSlot(slot: Slot) {
  await refreshModelsForSlotWithOptions(slot, {});
}

function getModelsCacheKey(slot: Slot) {
  const pluginId = resolvePluginId(slot);
  const plugin = getPlugin(slot);
  const profile = getProfile(slot);
  const baseUrl = profile?.baseUrl || plugin.defaultBaseUrl || '';
  return `${pluginId}::${baseUrl}`;
}

async function refreshModelsForSlotWithOptions(slot: Slot, opts: { force?: boolean }) {
  const plugin = getPlugin(slot);
  const cacheKey = getModelsCacheKey(slot);
  const profile =
    getProfile(slot) ?? ({ id: '', name: '', apiKey: '', baseUrl: '', pluginId: plugin.id } as ProviderProfile);

  if (!opts.force) {
    try {
      const cached = (await modelCacheStore.getItem(cacheKey)) as
        | { savedAt: number; models: { id: string; label: string }[] }
        | null;
      if (cached?.models?.length && Date.now() - cached.savedAt < modelCacheTtlMs) {
        modelsByKey[cacheKey] = cached.models;
        return;
      }
    } catch (err) {
      console.warn('读取模型缓存失败，将重新拉取。', err);
    }
  }

  refreshingModelsBySlotId[slot.id] = true;
  try {
    const models = await plugin.listModels(profile);
    modelsByKey[cacheKey] = models;
    await modelCacheStore.setItem(cacheKey, { savedAt: Date.now(), models });
  } catch (err) {
    console.warn('加载模型列表失败', err);
  } finally {
    refreshingModelsBySlotId[slot.id] = false;
  }
}

function modelOptions(slot: Slot) {
  const key = getModelsCacheKey(slot);
  const list = modelsByKey[key];
  if (list?.length) return list;
  return slot.modelId ? [{ id: slot.modelId, label: slot.modelId }] : [];
}

function onProviderChange(slot: Slot) {
  resolvePluginId(slot);
  refreshModelsForSlot(slot);
}

async function forceRefreshModels(slot: Slot) {
  const cacheKey = getModelsCacheKey(slot);
  try {
    await modelCacheStore.removeItem(cacheKey);
  } catch (err) {
    console.warn('清理模型缓存失败，将继续尝试刷新。', err);
  }
  await refreshModelsForSlotWithOptions(slot, { force: true });
}

	async function loadHistory() {
	  const items: HistoryItem[] = (await historyStore.getItem('items')) || [];
	  historyItems.value = items.sort((a, b) => b.createdAt - a.createdAt);
	}

async function persistHistory(items: HistoryItem[]) {
  await historyStore.setItem('items', items);
}

function mergeParams(slot: Slot) {
  return removeEmptyEntries({ ...shared.defaultParams, ...(slot.paramOverride || {}) });
}

function buildRequest(slot: Slot): PluginRequest {
  return {
    systemPrompt: slot.systemPrompt,
    userPrompts: shared.userPrompts.map((p) => p.text).filter((t) => t.trim().length > 0),
    toolsDefinition: shared.toolsDefinition,
    params: mergeParams(slot),
    modelId: slot.modelId,
    enableSuggestions: shared.enableSuggestions,
    stream: shared.streamOutput
  };
}

function getProfile(slot: Slot) {
  return providerProfiles.value.find((p) => p.id === slot.providerProfileId) || null;
}

function resolvePluginId(slot: Slot) {
  const provider = getProfile(slot);
  const resolved = provider?.pluginId || slot.pluginId || plugins[0].id;
  if (slot.pluginId !== resolved) {
    slot.pluginId = resolved;
  }
  return resolved;
}

function getPlugin(slot: Slot) {
  const pluginId = resolvePluginId(slot);
  return plugins.find((p) => p.id === pluginId)!;
}

async function exportCurl(slot: Slot) {
  const plugin = getPlugin(slot);
  const profile = getProfile(slot);
  if (!profile) {
    alert('请选择 Provider Profile');
    return;
  }
  const request = buildRequest(slot);
  const curl = plugin.buildCurl(profile, request);
  codeDialogTitle.value = `cURL（${slot.modelId}）`;
  codeDialogCode.value = curl;
  codeDialogOpen.value = true;
}

async function runSlot(slot: Slot) {
  const plugin = getPlugin(slot);
  const profile = getProfile(slot);
  if (!profile) {
    alert('请选择 Provider Profile');
    return;
  }
  const request = buildRequest(slot);
  const controller = new AbortController();
  slot.status = 'running';
  slot.output = '';
  slot.metrics = { ttfbMs: null, totalMs: null };
  const start = performance.now();
  let firstChunkAt: number | null = null;
  try {
    for await (const chunk of plugin.invokeChat(profile, request, {
      stream: request.stream,
      signal: controller.signal
    })) {
      if (firstChunkAt === null) {
        firstChunkAt = performance.now();
        slot.metrics.ttfbMs = firstChunkAt - start;
      }
      slot.output += chunk;
    }
    slot.status = 'done';
  } catch (err) {
    console.error(err);
    slot.status = 'error';
  } finally {
    slot.metrics.totalMs = performance.now() - start;
    const historyItem: HistoryItem = {
      id: newId(),
      createdAt: Date.now(),
      star: false,
      title: `Run ${new Date().toLocaleString()}`,
      providerProfileSnapshot: profile,
      requestSnapshot: { ...request, systemPrompt: slot.systemPrompt },
      responseSnapshot: {
        outputText: slot.output,
        usage: slot.metrics.tokens,
        metrics: { ttfbMs: slot.metrics.ttfbMs, totalMs: slot.metrics.totalMs }
      }
    };
    historyItems.value = [historyItem, ...historyItems.value];
    await persistHistory(historyItems.value);
  }
}

async function runSelected() {
  for (const slot of selectedSlots.value) {
    // run sequentially for determinism; could be parallel in real app
    await runSlot(slot);
  }
}

async function runAll() {
  for (const slot of slots.value) {
    await runSlot(slot);
  }
}

function toggleStar(id: string) {
  historyItems.value = historyItems.value.map((item) =>
    item.id === id ? { ...item, star: !item.star } : item
  );
  persistHistory(historyItems.value);
}

function loadHistoryIntoEditor(item: HistoryItem) {
  const legacyUserPrompt = (item.requestSnapshot as unknown as { userPrompt?: string }).userPrompt;
  const restored = Array.isArray(item.requestSnapshot.userPrompts)
    ? item.requestSnapshot.userPrompts.map((text) => ({ id: newId(), text }))
    : legacyUserPrompt
        ? [{ id: newId(), text: legacyUserPrompt }]
        : [];
  shared.userPrompts = restored.length ? restored : [{ id: newId(), text: '' }];
  shared.toolsDefinition = item.requestSnapshot.toolsDefinition;
  slots.value = item.requestSnapshot.systemPrompt
    ? [
        {
          ...createSlot(),
          systemPrompt: item.requestSnapshot.systemPrompt,
          modelId: item.requestSnapshot.modelId
        }
      ]
    : slots.value;
  alert('历史已载入，System Prompt 已替换，其他输入覆盖为历史。');
}

onMounted(async () => {
  resetNewProfile();
  loadProfiles();
  loadEditorState();
  if (!slots.value.length) {
    slots.value = [createSlot()];
  }
  await Promise.all(slots.value.map((slot) => refreshModelsForSlot(slot)));
  await loadHistory();
});

const hasEditedSinceLoad = ref(false);
const loadedEditorSignature = ref<string | null>(null);
const editorSignature = computed(() => JSON.stringify(serializeEditorState()));

watch(
  editorSignature,
  (signature) => {
    if (loadedEditorSignature.value === null) {
      loadedEditorSignature.value = signature;
      saveEditorState();
      return;
    }
    if (signature !== loadedEditorSignature.value) {
      hasEditedSinceLoad.value = true;
      saveEditorState();
    }
  },
  { flush: 'post' }
);

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasEditedSinceLoad.value) return;
  event.preventDefault();
  event.returnValue = '';
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

watch(
  () => newProfile.pluginId,
  () => {
    newProfile.baseUrl = defaultProviderTemplate.value;
  },
  { immediate: true }
);

watch(
  () => slots.value.map((slot) => `${slot.id}:${slot.pluginId}:${slot.providerProfileId}`),
  () => {
    slots.value.forEach((slot) => refreshModelsForSlot(slot));
  }
);
</script>

<template>
  <div>
    <header class="app-header">
      <div class="app-brand">
        <div class="app-title">PromptForge</div>
        <div class="app-subtitle">提示词对比调试台 · 多 Slot 并行对比</div>
      </div>
      <div class="row" style="flex: 0 0 auto">
        <button class="ghost pill" style="flex: 0 0 auto" @click="showProviderManager = true">管理 Providers</button>
      </div>
    </header>

		    <ProviderPanel
		      v-if="showProviderManager"
		      :plugins="plugins"
		      :providerProfiles="providerProfiles"
		      :newProfile="newProfile"
		      :defaultProviderTemplate="defaultProviderTemplate"
		      :onResetNewProfile="resetNewProfile"
		      :onAddProfile="addProfile"
		      :onRemoveProfile="removeProfile"
		      :onExportProviders="exportProvidersEncryptedZip"
		      :onImportProviders="importProvidersEncryptedZip"
		      @close="showProviderManager = false"
		    />
	
		    <SharedPanel :shared="shared" />

			    <section>
			      <div class="section-head">
			        <div>
			          <div class="section-title">Slots</div>
			          <div class="section-subtitle">每个 Slot 独立 System Prompt，用于对比输出差异。</div>
			        </div>
			      </div>
			      <div class="slot-grid">
			        <SlotCard
			          v-for="slot in slots"
			          :key="slot.id"
			          :slot="slot"
			          :providerProfiles="providerProfiles"
			          :modelOptions="modelOptions(slot)"
			          :refreshingModels="!!refreshingModelsBySlotId[slot.id]"
			          :streamOutput="shared.streamOutput"
			          :disableRemove="slots.length === 1"
			          @copy="addSlot"
			          @remove="removeSlot"
			          @run="runSlot"
			          @export-curl="exportCurl"
			          @provider-change="onProviderChange"
			          @refresh-models="forceRefreshModels"
			        />
		      </div>
		    </section>

			    <FloatingActionPanel
			      :showHistory="showHistory"
			      @runSelected="runSelected"
			      @runAll="runAll"
			      @toggleHistory="showHistory = !showHistory"
			    />
	
		    <HistoryDrawer
		      v-if="showHistory"
		      :items="historyItems"
		      @close="showHistory = false"
		      @load="loadHistoryIntoEditor"
		      @toggle-star="toggleStar"
		    />

		    <CodeDialog
		      :open="codeDialogOpen"
		      :title="codeDialogTitle"
		      :code="codeDialogCode"
		      @close="codeDialogOpen = false"
		    />
	  </div>
	</template>
