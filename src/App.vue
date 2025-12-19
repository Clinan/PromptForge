<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
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
import { buildProvidersExportZip, downloadBlob, parseProvidersImportZip } from './lib/providerTransfer';
import ProviderPanel from './components/ProviderPanel.vue';
import AppHeader from './components/AppHeader.vue';
import SlotsSection from './components/SlotsSection.vue';
import HistoryDrawer from './components/HistoryDrawer.vue';
import CodeDialog from './components/CodeDialog.vue';
import HistoryLoadDialog from './components/HistoryLoadDialog.vue';
import PromptComposer from './components/PromptComposer.vue';
import ContextPanel from './components/ContextPanel.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { NLayout, NLayoutSider } from 'naive-ui';

const localStorageKey = 'truestprompt-profiles';
const editorStorageKey = 'truestprompt-editor-state-v1';
const historyStore = localforage.createInstance({ name: 'truestprompt-history' });
const modelCacheStore = localforage.createInstance({ name: 'truestprompt-model-cache' });
const modelCacheTtlMs = 24 * 60 * 60 * 1000;
const defaultSharedParams = {
  temperature: 0.7,
  top_p: 1,
  max_tokens: 8192
};

const providerProfiles = ref<ProviderProfile[]>([]);
const historyItems = ref<HistoryItem[]>([]);
const showHistory = ref(false);
const showProviderManager = ref(false);
const contextPanelTab = ref<'parameters' | 'tools' | 'variables'>('parameters');
const showParamDiffOnly = ref(false);
const themeStorageKey = 'truestprompt-theme';
const theme = ref<'light' | 'dark'>('light');
const useCurlPlaceholder = ref(true);
const leftSidebarHidden = ref(false);
const rightPanelHidden = ref(false);
const workspaceGapPx = 6;
const leftSidebarWidthPx = 240;
const rightPanelWidthPx = 360;
const workspaceRef = ref<HTMLElement | null>(null);
const workspaceRect = reactive<{ top: number; left: number; right: number; height: number }>({
  top: 0,
  left: 0,
  right: 0,
  height: 0
});
const viewportWidth = ref(0);

function updateWorkspaceRect() {
  if (typeof window === 'undefined') return;
  viewportWidth.value = window.innerWidth;
  const el = workspaceRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  workspaceRect.top = rect.top;
  workspaceRect.left = rect.left;
  workspaceRect.right = rect.right;
  workspaceRect.height = rect.height;
}

const handleVerticalPosition = computed(() => {
  if (workspaceRect.height > 0) {
    return `${workspaceRect.top + workspaceRect.height / 2}px`;
  }
  if (typeof window !== 'undefined') {
    return `${window.innerHeight / 2}px`;
  }
  return '50%';
});

const leftPanelToggleStyle = computed(() => {
  const offset = (leftSidebarHidden.value ? 0 : leftSidebarWidthPx) + workspaceGapPx / 2;
  const baseLeft = workspaceRect.left || 0;
  return {
    left: `${baseLeft + offset}px`,
    top: handleVerticalPosition.value
  };
});

const rightPanelToggleStyle = computed(() => {
  const viewport = viewportWidth.value || (typeof window !== 'undefined' ? window.innerWidth : 0);
  const baseRight =
    workspaceRect.right && viewport ? Math.max(viewport - workspaceRect.right, 0) : 0;
  const offset = (rightPanelHidden.value ? 0 : rightPanelWidthPx) + workspaceGapPx / 2;
  return {
    right: `${baseRight + offset}px`,
    top: handleVerticalPosition.value
  };
});

watch(
  () => [leftSidebarHidden.value, rightPanelHidden.value],
  () => {
    nextTick(() => updateWorkspaceRect());
  }
);

watch(
  workspaceRef,
  (el) => {
    if (!el) return;
    nextTick(() => updateWorkspaceRect());
  },
  { immediate: true }
);

const codeDialogOpen = ref(false);
const codeDialogTitle = ref('');
const codeDialogCode = ref('');
const codeDialogSlotId = ref<string | null>(null);

const confirmDialogOpen = ref(false);
const confirmDialogTitle = ref('');
const confirmDialogDescription = ref('');
const confirmDialogTone = ref<'default' | 'danger'>('default');
const confirmDialogConfirmText = ref('确定');
let confirmDialogAction: null | (() => void | Promise<void>) = null;

function openConfirmDialog(options: {
  title: string;
  description?: string;
  tone?: 'default' | 'danger';
  confirmText?: string;
  action: () => void | Promise<void>;
}) {
  confirmDialogTitle.value = options.title;
  confirmDialogDescription.value = options.description || '';
  confirmDialogTone.value = options.tone || 'default';
  confirmDialogConfirmText.value = options.confirmText || '确定';
  confirmDialogAction = options.action;
  confirmDialogOpen.value = true;
}

function closeConfirmDialog() {
  confirmDialogOpen.value = false;
  confirmDialogAction = null;
}

async function confirmDialogConfirm() {
  const action = confirmDialogAction;
  closeConfirmDialog();
  await action?.();
}

const historyLoadOpen = ref(false);
const historyLoadItem = ref<HistoryItem | null>(null);
const historyLoadOptions = reactive({
  provider: true,
  model: true,
  systemPrompt: true,
  params: true,
  userPrompts: true,
  tools: true,
  output: true,
  metrics: true
});

function applyTheme(mode: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', mode);
  try {
    localStorage.setItem(themeStorageKey, mode);
  } catch (err) {
    console.warn('无法保存主题偏好：', err);
  }
}

if (typeof window !== 'undefined') {
  let storedTheme: 'light' | 'dark' | null = null;
  try {
    storedTheme = localStorage.getItem(themeStorageKey) as 'light' | 'dark' | null;
  } catch (err) {
    console.warn('无法读取主题偏好（localStorage 不可用）。', err);
  }
  theme.value = storedTheme === 'dark' ? 'dark' : 'light';
  applyTheme(theme.value);
}

watch(theme, (mode) => applyTheme(mode));

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
}

function closeCodeDialog() {
  codeDialogOpen.value = false;
  codeDialogSlotId.value = null;
}

const initialUserPrompt: UserPromptPreset = {
  id: newId(),
  role: 'user',
  text: 'hello'
};

const shared = reactive<SharedState>({
  userPrompts: [initialUserPrompt],
  toolsDefinition: '[{"name":"fetchDocs","description":"Query project docs"}]',
  variables: [{ id: newId(), key: '', value: '' }],
  defaultParams: { ...defaultSharedParams },
  enableSuggestions: true,
  streamOutput: true
});

const projectOptions = [
  { id: 'core-playground', label: 'Core Playground' },
  { id: 'evaluation-lab', label: 'Evaluation Lab' },
  { id: 'creative-suite', label: 'Creative Suite' }
];
const selectedProjectId = ref(projectOptions[0].id);
type PersistedEditorState = {
  version: 3;
  shared: SharedState;
  slots: Array<Pick<Slot, 'id' | 'providerProfileId' | 'pluginId' | 'modelId' | 'systemPrompt' | 'paramOverride'>>;
};

function serializeEditorState(): PersistedEditorState {
  return {
    version: 3,
    shared: {
      userPrompts: shared.userPrompts.map((p) => ({ id: p.id, role: p.role, text: p.text })),
      toolsDefinition: shared.toolsDefinition,
      variables: shared.variables.map((v) => ({ id: v.id, key: v.key, value: v.value })),
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
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(editorStorageKey);
  } catch (err) {
    console.warn('无法读取本地编辑器状态（localStorage 不可用）。', err);
    return;
  }
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEditorState>;
    if (![1, 2, 3].includes((parsed as PersistedEditorState).version) || !parsed.shared) return;

    const restoredUserPrompts = Array.isArray(parsed.shared.userPrompts)
      ? parsed.shared.userPrompts
          .filter((p): p is UserPromptPreset => Boolean(p && typeof (p as UserPromptPreset).id === 'string'))
          .map((p) => ({
            id: p.id,
            role: p.role === 'system' || p.role === 'assistant' ? p.role : 'user',
            text: typeof p.text === 'string' ? p.text : ''
          }))
      : [];

    shared.userPrompts = restoredUserPrompts.length ? restoredUserPrompts : [initialUserPrompt];

    if (typeof parsed.shared.toolsDefinition === 'string') shared.toolsDefinition = parsed.shared.toolsDefinition;
    if (Array.isArray((parsed.shared as Partial<SharedState>).variables)) {
      const restoredVariables = (parsed.shared as Partial<SharedState>).variables!
        .filter((v) => v && typeof v.id === 'string')
        .map((v, index) => ({
          id: v.id,
          key: typeof v.key === 'string' ? v.key : `VAR_${index + 1}`,
          value: typeof v.value === 'string' ? v.value : ''
        }));
      if (restoredVariables.length) {
        shared.variables = restoredVariables;
      }
    }
    if (parsed.shared.defaultParams) {
      shared.defaultParams = {
        temperature: coerceNumber(parsed.shared.defaultParams.temperature, defaultSharedParams.temperature),
        top_p: coerceNumber(parsed.shared.defaultParams.top_p, defaultSharedParams.top_p),
        max_tokens: coerceNumber(parsed.shared.defaultParams.max_tokens, defaultSharedParams.max_tokens)
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

function coerceNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const slots = ref<Slot[]>([]);
const abortControllersBySlotId = new Map<string, AbortController>();

watch(useCurlPlaceholder, () => {
  if (!codeDialogOpen.value || !codeDialogSlotId.value) return;
  const slot = slots.value.find((item) => item.id === codeDialogSlotId.value);
  if (!slot) return;
  const snippet = buildCurlSnippet(slot);
  if (!snippet) return;
  codeDialogTitle.value = snippet.title;
  codeDialogCode.value = snippet.code;
});

const hasRunningSlots = computed(() => slots.value.some((slot) => slot.status === 'running'));

function stopSlot(slotId: string) {
  abortControllersBySlotId.get(slotId)?.abort();
}

function stopAllSlots() {
  Array.from(abortControllersBySlotId.values()).forEach((controller) => controller.abort());
}

function handleGlobalKeydown(event: KeyboardEvent) {
  const wantsStop = (event.ctrlKey || event.metaKey) && (event.key === '.' || event.code === 'Period');
  if (!wantsStop) return;
  if (!hasRunningSlots.value) return;
  event.preventDefault();
  stopAllSlots();
}

function loadProfiles() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(localStorageKey);
  } catch (err) {
    console.warn('无法读取 Provider 配置（localStorage 不可用）。', err);
    providerProfiles.value = [];
    return;
  }
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
  try {
    localStorage.setItem(localStorageKey, JSON.stringify(providerProfiles.value));
  } catch (err) {
    console.warn('保存 Provider 配置失败（localStorage 不可用）。', err);
    alert('保存 Provider 配置失败：浏览器禁用了本地存储。');
  }
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
    const blob = await buildProvidersExportZip(providerProfiles.value, password);
    downloadBlob(blob, 'truestprompt-providers.zip');
  } catch (err) {
    console.error(err);
    alert(`导出失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

async function importProvidersEncryptedZip(file: File) {
  const password = prompt('请输入导入密码');
  if (!password) return;
  try {
    const parsed = await parseProvidersImportZip(file, password);
    localStorage.setItem(localStorageKey, JSON.stringify(parsed));
    loadProfiles();
    resetNewProfile();
    alert('导入成功（已覆盖本地 Provider 列表）');
  } catch (err) {
    console.error(err);
    alert(`导入失败：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

function requestImportProvidersEncryptedZip(file: File) {
  openConfirmDialog({
    title: '导入 Provider 配置？',
    description: '导入会覆盖本地 Provider 列表（包括已保存的 API Key）。请确认你信任该文件来源。',
    tone: 'danger',
    confirmText: '继续导入',
    action: () => importProvidersEncryptedZip(file)
  });
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

function requestRemoveProfile(profileId: string) {
  const profile = providerProfiles.value.find((p) => p.id === profileId);
  openConfirmDialog({
    title: '删除 Provider？',
    description: profile
      ? `将删除「${profile.name}」，并把引用它的 Slot 自动切换到第一个可用 Provider。`
      : '将删除该 Provider，并把引用它的 Slot 自动切换到第一个可用 Provider。',
    tone: 'danger',
    confirmText: '删除',
    action: () => removeProfile(profileId)
  });
}

function clearProviderApiKeys() {
  providerProfiles.value = providerProfiles.value.map((profile) => ({ ...profile, apiKey: '' }));
  saveProfiles();
}

function requestClearProviderApiKeys() {
  if (!providerProfiles.value.some((profile) => profile.apiKey.trim().length > 0)) {
    alert('当前没有已保存的 API Key。');
    return;
  }
  openConfirmDialog({
    title: '清空所有 Provider API Key？',
    description: '此操作会将本地保存的所有 API Key 置空（不会删除 Provider 条目）。',
    tone: 'danger',
    confirmText: '清空',
    action: clearProviderApiKeys
  });
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
    toolCalls: null,
    metrics: { ttfbMs: null, totalMs: null }
  };
}

function addSlot(copyFrom?: Slot) {
  slots.value.push(createSlot(copyFrom));
}

function removeSlot(slotId: string) {
  slots.value = slots.value.filter((s) => s.id !== slotId);
}

function requestRemoveSlot(slotId: string) {
  if (slots.value.length <= 1) return;
  const slot = slots.value.find((s) => s.id === slotId);
  openConfirmDialog({
    title: '删除 Slot？',
    description: slot ? `将删除「${slot.modelId || '未选择模型'}」的 Slot，相关输出也会一并移除。` : '将删除该 Slot，相关输出也会一并移除。',
    tone: 'danger',
    confirmText: '删除',
    action: () => removeSlot(slotId)
  });
}

const selectedSlots = computed(() => slots.value.filter((s) => s.selected));
const recentHistory = computed(() => historyItems.value.slice(0, 5));

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
    // 避免把 Proxy/不可克隆对象写入 IndexedDB
    const plainModels = JSON.parse(JSON.stringify(models)) as { id: string; label: string }[];
    await modelCacheStore.setItem(cacheKey, { savedAt: Date.now(), models: plainModels });
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
  // 切换 Provider 后默认清空 model（避免误用旧 provider 的 model）
  slot.modelId = '';
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

let historyPersistQueue: Promise<void> = Promise.resolve();

function queuePersistHistory(items: HistoryItem[]) {
  // Vue 的 reactive/ref 可能包含 Proxy，IndexedDB（localforage）无法结构化克隆，会触发 DataCloneError
  const plain = JSON.parse(JSON.stringify(items)) as HistoryItem[];
  historyPersistQueue = historyPersistQueue
    .then(() => historyStore.setItem('items', plain))
    .catch((err) => console.warn('保存历史失败。', err));
  return historyPersistQueue;
}

function mergeParams(slot: Slot) {
  return removeEmptyEntries({ ...shared.defaultParams, ...(slot.paramOverride || {}) });
}

function buildVariableMap() {
  const map: Record<string, string> = {};
  shared.variables
    .map((item) => ({ key: item.key.trim(), value: item.value }))
    .filter((item) => item.key.length > 0)
    .forEach((item) => {
      map[item.key] = item.value;
    });
  return map;
}

function renderTemplate(source: string, variables: Record<string, string>) {
  if (!source) return '';
  return source.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key]! : match
  );
}

function buildRequest(slot: Slot): PluginRequest {
  const variables = buildVariableMap();
  const composerMessages = shared.userPrompts
    .map((message) => ({
      role: message.role || 'user',
      content: renderTemplate(message.text, variables)
    }))
    .filter((msg) => msg.content.trim().length > 0);
  const userOnlyPrompts = composerMessages.filter((msg) => msg.role !== 'system').map((msg) => msg.content);
  return {
    systemPrompt: renderTemplate(slot.systemPrompt, variables),
    userPrompts: userOnlyPrompts,
    toolsDefinition: shared.toolsDefinition,
    params: mergeParams(slot),
    modelId: slot.modelId,
    enableSuggestions: shared.enableSuggestions,
    stream: shared.streamOutput,
    messages: composerMessages
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

function buildCurlSnippet(slot: Slot): { title: string; code: string } | null {
  const plugin = getPlugin(slot);
  const profile = getProfile(slot);
  if (!profile) return null;
  const request = buildRequest(slot);
  const maskedProfile = useCurlPlaceholder.value ? { ...profile, apiKey: '' } : profile;
  return {
    title: `cURL（${slot.modelId}）`,
    code: plugin.buildCurl(maskedProfile, request)
  };
}

async function exportCurl(slot: Slot) {
  const snippet = buildCurlSnippet(slot);
  if (!snippet) {
    alert('请选择 Provider Profile');
    return;
  }
  codeDialogSlotId.value = slot.id;
  codeDialogTitle.value = snippet.title;
  codeDialogCode.value = snippet.code;
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
  abortControllersBySlotId.set(slot.id, controller);
  slot.status = 'running';
  slot.output = '';
  slot.toolCalls = null;
  slot.metrics = { ttfbMs: null, totalMs: null };
  const start = performance.now();
  let firstChunkAt: number | null = null;
  let canceled = false;
  try {
    for await (const chunk of plugin.invokeChat(profile, request, {
      stream: request.stream,
      signal: controller.signal
    })) {
      if (firstChunkAt === null) {
        firstChunkAt = performance.now();
        slot.metrics.ttfbMs = firstChunkAt - start;
      }
      if (chunk.type === 'content') {
        slot.output += chunk.text;
      } else if (chunk.type === 'tool_calls') {
        slot.toolCalls = chunk.toolCalls;
      } else if (chunk.type === 'usage') {
        slot.metrics.tokens = chunk.tokens;
      }
    }
    slot.status = 'done';
  } catch (err) {
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError');
    if (isAbort) {
      canceled = true;
      slot.status = 'canceled';
      if (!slot.output.trim()) {
        slot.output = '已中止';
      }
    } else {
      console.error(err);
      slot.status = 'error';
      slot.output = err instanceof Error ? err.message : String(err);
      slot.toolCalls = null;
    }
  } finally {
    slot.metrics.totalMs = performance.now() - start;
    abortControllersBySlotId.delete(slot.id);

    if (!canceled) {
      const historyItem: HistoryItem = {
        id: newId(),
        createdAt: Date.now(),
        star: false,
        title: `Run ${new Date().toLocaleString()}`,
        providerProfileSnapshot: { ...profile },
        requestSnapshot: { ...request, systemPrompt: request.systemPrompt },
        responseSnapshot: {
          outputText: slot.output,
          toolCalls: slot.toolCalls || undefined,
          usage: slot.metrics.tokens,
          metrics: { ttfbMs: slot.metrics.ttfbMs, totalMs: slot.metrics.totalMs }
        }
      };
      historyItems.value = [historyItem, ...historyItems.value];
      queuePersistHistory(historyItems.value);
    }
  }
}

async function runSelected() {
  await Promise.all(selectedSlots.value.map((slot) => runSlot(slot)));
}

async function runAll() {
  await Promise.all(slots.value.map((slot) => runSlot(slot)));
}

function toggleStar(id: string) {
  historyItems.value = historyItems.value.map((item) =>
    item.id === id ? { ...item, star: !item.star } : item
  );
  queuePersistHistory(historyItems.value);
}

function loadHistoryIntoEditor(item: HistoryItem) {
  historyLoadItem.value = item;
  historyLoadOpen.value = true;
}

function applyHistoryLoad() {
  const item = historyLoadItem.value;
  if (!item) return;

  const targetSlot = selectedSlots.value[0] || slots.value[0] || createSlot();
  if (!slots.value.length) slots.value = [targetSlot];
  targetSlot.toolCalls = null;

  const legacyUserPrompt = (item.requestSnapshot as unknown as { userPrompt?: string }).userPrompt;
  const userPrompts = Array.isArray(item.requestSnapshot.userPrompts)
    ? item.requestSnapshot.userPrompts
    : legacyUserPrompt
      ? [legacyUserPrompt]
      : [];
  const historyMessages =
    Array.isArray(item.requestSnapshot.messages) && item.requestSnapshot.messages.length
      ? item.requestSnapshot.messages
      : userPrompts.map((text) => ({ role: 'user', content: text }));

  if (historyLoadOptions.userPrompts) {
    shared.userPrompts = historyMessages.length
      ? historyMessages.map((msg) => ({
          id: newId(),
          role: msg.role === 'system' || msg.role === 'assistant' ? msg.role : 'user',
          text: typeof msg.content === 'string' ? msg.content : ''
        }))
      : [{ id: newId(), role: 'user', text: '' }];
  }

  if (historyLoadOptions.tools) {
    shared.toolsDefinition = item.requestSnapshot.toolsDefinition;
  }

  if (historyLoadOptions.provider && item.providerProfileSnapshot) {
    const snap = item.providerProfileSnapshot;
    const existing = providerProfiles.value.find((p) => p.id === snap.id);
    if (!existing) {
      providerProfiles.value.push({ ...snap });
      saveProfiles();
    }
    targetSlot.providerProfileId = snap.id;
    targetSlot.pluginId = snap.pluginId;
    refreshModelsForSlot(targetSlot);
  }

  if (historyLoadOptions.model) {
    targetSlot.modelId = item.requestSnapshot.modelId || '';
  }

  historyLoadOptions.systemPrompt = true;
  targetSlot.systemPrompt = item.requestSnapshot.systemPrompt || '';

  if (historyLoadOptions.params) {
    targetSlot.paramOverride = item.requestSnapshot.params ? { ...(item.requestSnapshot.params as Record<string, unknown>) } : null;
  }

  if (historyLoadOptions.output) {
    targetSlot.output = item.responseSnapshot.outputText || '';
    targetSlot.status = targetSlot.output ? 'done' : 'idle';
    targetSlot.historyId = item.id;
    targetSlot.toolCalls = item.responseSnapshot.toolCalls ?? null;
  }

  if (historyLoadOptions.metrics) {
    targetSlot.metrics = {
      ...targetSlot.metrics,
      ttfbMs: item.responseSnapshot.metrics?.ttfbMs ?? null,
      totalMs: item.responseSnapshot.metrics?.totalMs ?? null,
      tokens: item.responseSnapshot.usage
    };
  }

  historyLoadOpen.value = false;
  historyLoadItem.value = null;
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
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize', updateWorkspaceRect);
  window.addEventListener('scroll', updateWorkspaceRect, { passive: true });
  nextTick(() => updateWorkspaceRect());
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('resize', updateWorkspaceRect);
  window.removeEventListener('scroll', updateWorkspaceRect);
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
  <div class="app-shell">
    <AppHeader :project-options="projectOptions" v-model:selected-project="selectedProjectId" :theme="theme" @toggleTheme="toggleTheme" />

    <div class="workspace" ref="workspaceRef">
      <NLayout class="workspace-layout" has-sider sider-placement="left" style="background: transparent">
        <NLayoutSider
          class="workspace-layout__sider"
          collapse-mode="width"
          :collapsed-width="0"
          :width="leftSidebarWidthPx"
          :collapsed="leftSidebarHidden"
          :show-collapsed-content="false"
          content-style="background: transparent;"
          style="background: transparent;"
        >
          <aside id="workspace-left-sidebar" class="workspace-sidebar">
            <div class="sidebar-section">
              <div class="sidebar-section__title">Projects</div>
              <div class="sidebar-list">
                <button
                  v-for="project in projectOptions"
                  :key="project.id"
                  class="sidebar-item"
                  :class="{ active: selectedProjectId === project.id }"
                  @click="selectedProjectId = project.id"
                >
                  <span class="sidebar-item__name">{{ project.label }}</span>
                  <span class="sidebar-item__badge">Live</span>
                </button>
              </div>
            </div>

            <div class="sidebar-section">
              <div class="sidebar-section__title">
                Providers
                <button class="text-button" @click="showProviderManager = true">管理</button>
              </div>
              <div class="providers-list">
                <div v-if="!providerProfiles.length" class="sidebar-empty">暂无 Provider</div>
                <button
                  v-for="profile in providerProfiles"
                  :key="profile.id"
                  class="provider-chip"
                  @click="showProviderManager = true"
                >
                  <span class="dot dot--success"></span>
                  <div class="provider-chip__info">
                    <div class="provider-chip__name">{{ profile.name }}</div>
                    <div class="provider-chip__meta">{{ plugins.find((p) => p.id === profile.pluginId)?.name }}</div>
                  </div>
                </button>
              </div>
            </div>

            <div class="sidebar-section">
              <div class="sidebar-section__title">
                Runs History
                <button class="text-button" @click="showHistory = true">全部</button>
              </div>
              <div class="runs-list">
                <button
                  v-for="run in recentHistory"
                  :key="run.id"
                  class="run-entry"
                  @click="loadHistoryIntoEditor(run)"
                >
                  <div class="run-entry__title">{{ run.title }}</div>
                  <div class="run-entry__meta">
                    <span>{{ new Date(run.createdAt).toLocaleTimeString() }}</span>
                    <span>{{ run.requestSnapshot.modelId }}</span>
                  </div>
                </button>
                <div v-if="!recentHistory.length" class="sidebar-empty">暂无运行记录</div>
              </div>
            </div>
          </aside>
        </NLayoutSider>

        <NLayout class="workspace-layout__inner" has-sider sider-placement="right" style="background: transparent">
          <div class="workspace-layout__main">
            <main class="workspace-main">
              <section class="panel composer-panel card">
                <PromptComposer v-model:messages="shared.userPrompts" />
              </section>

              <section class="panel slots-panel card">
                <SlotsSection
                  :slots="slots"
                  :providerProfiles="providerProfiles"
                  :streamOutput="shared.streamOutput"
                  :refreshingModelsBySlotId="refreshingModelsBySlotId"
                  :modelOptions="modelOptions"
                  :defaultParams="shared.defaultParams"
                  :showParamDiffOnly="showParamDiffOnly"
                  @copy="addSlot"
                  @remove="requestRemoveSlot"
                  @run="runSlot"
                  @stop="stopSlot"
                  @export-curl="exportCurl"
                  @provider-change="onProviderChange"
                  @refresh-models="forceRefreshModels"
                  @runSelected="runSelected"
                  @runAll="runAll"
                  @stopAll="stopAllSlots"
                />
              </section>
            </main>
          </div>

          <NLayoutSider
            class="workspace-layout__sider workspace-layout__sider--right"
            collapse-mode="width"
            :collapsed-width="0"
            :width="rightPanelWidthPx"
            :collapsed="rightPanelHidden"
            :show-collapsed-content="false"
            content-style="background: transparent;"
            style="background: transparent;"
          >
            <ContextPanel
              id="workspace-right-panel"
              class="context-panel"
              :shared="shared"
              v-model:activeTab="contextPanelTab"
              v-model:showDiffOnly="showParamDiffOnly"
            />
          </NLayoutSider>
        </NLayout>
      </NLayout>

      <div class="folding-handle folding-handle--left" :style="leftPanelToggleStyle">
        <button
          type="button"
          class="folding-handle__button"
          :class="{ 'is-collapsed': leftSidebarHidden }"
          @click="leftSidebarHidden = !leftSidebarHidden"
          :aria-pressed="leftSidebarHidden"
          aria-controls="workspace-left-sidebar"
          :aria-label="leftSidebarHidden ? '展开左栏' : '隐藏左栏'"
          :title="leftSidebarHidden ? '展开左栏' : '隐藏左栏'"
        >
          <span class="sr-only">{{ leftSidebarHidden ? '展开左栏' : '隐藏左栏' }}</span>
          <span class="folding-handle__icon" aria-hidden="true">
            <svg v-if="leftSidebarHidden" viewBox="0 0 16 16" focusable="false">
              <path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else viewBox="0 0 16 16" focusable="false">
              <path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      <div class="folding-handle folding-handle--right" :style="rightPanelToggleStyle">
        <button
          type="button"
          class="folding-handle__button"
          :class="{ 'is-collapsed': rightPanelHidden }"
          @click="rightPanelHidden = !rightPanelHidden"
          :aria-pressed="rightPanelHidden"
          aria-controls="workspace-right-panel"
          :aria-label="rightPanelHidden ? '展开右栏' : '隐藏右栏'"
          :title="rightPanelHidden ? '展开右栏' : '隐藏右栏'"
        >
          <span class="sr-only">{{ rightPanelHidden ? '展开右栏' : '隐藏右栏' }}</span>
          <span class="folding-handle__icon" aria-hidden="true">
            <svg v-if="rightPanelHidden" viewBox="0 0 16 16" focusable="false">
              <path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else viewBox="0 0 16 16" focusable="false">
              <path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </div>

    </div>

  <ProviderPanel
    v-if="showProviderManager"
      :plugins="plugins"
      :providerProfiles="providerProfiles"
      :newProfile="newProfile"
      :defaultProviderTemplate="defaultProviderTemplate"
      :onResetNewProfile="resetNewProfile"
      :onAddProfile="addProfile"
      :onRemoveProfile="requestRemoveProfile"
      :onExportProviders="exportProvidersEncryptedZip"
      :onImportProviders="requestImportProvidersEncryptedZip"
      :onClearKeys="requestClearProviderApiKeys"
      @close="showProviderManager = false"
    />

    <HistoryDrawer
      v-if="showHistory"
      :items="historyItems"
      @close="showHistory = false"
      @load="loadHistoryIntoEditor"
      @toggle-star="toggleStar"
    />

    <HistoryLoadDialog
      :open="historyLoadOpen"
      :item="historyLoadItem"
      :options="historyLoadOptions"
      @close="historyLoadOpen = false"
      @confirm="applyHistoryLoad"
    />

    <CodeDialog
      :open="codeDialogOpen"
      :title="codeDialogTitle"
      :code="codeDialogCode"
      v-model:usePlaceholder="useCurlPlaceholder"
      @close="closeCodeDialog"
    />

    <ConfirmDialog
      :open="confirmDialogOpen"
      :title="confirmDialogTitle"
      :description="confirmDialogDescription"
      :tone="confirmDialogTone"
      :confirmText="confirmDialogConfirmText"
      @close="closeConfirmDialog"
      @confirm="confirmDialogConfirm"
    />
  </div>
</template>
