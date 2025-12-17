<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import localforage from 'localforage';

type PluginRequest = {
  systemPrompt: string;
  userPrompt: string;
  toolsDefinition: string;
  params: Record<string, unknown>;
  modelId: string;
  enableSuggestions: boolean;
  stream: boolean;
};

type PluginInvokeOptions = {
  stream?: boolean;
  signal?: AbortSignal;
};

type Plugin = {
  id: string;
  name: string;
  defaultBaseUrl?: string;
  listModels: (config: ProviderProfile) => Promise<{ id: string; label: string }[]>;
  invokeChat: (
    config: ProviderProfile,
    request: PluginRequest,
    options: PluginInvokeOptions
  ) => AsyncGenerator<string, void, unknown>;
  buildCurl: (config: ProviderProfile, request: PluginRequest) => string;
};

type ProviderProfile = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  pluginId: string;
};

type SlotMetrics = {
  ttfbMs: number | null;
  totalMs: number | null;
  tokens?: { prompt?: number; completion?: number; total?: number };
  toolCalls?: { name: string; args: unknown; result?: string }[];
};

type Slot = {
  id: string;
  providerProfileId: string | null;
  pluginId: string;
  modelId: string;
  systemPrompt: string;
  paramOverride: Record<string, unknown> | null;
  selected: boolean;
  status: 'idle' | 'running' | 'done' | 'error';
  output: string;
  metrics: SlotMetrics;
  historyId?: string;
  isExporting?: boolean;
};

type HistoryItem = {
  id: string;
  createdAt: number;
  star: boolean;
  title: string;
  note?: string;
  providerProfileSnapshot: ProviderProfile | null;
  requestSnapshot: PluginRequest & { systemPrompt: string };
  responseSnapshot: {
    outputText: string;
    toolCalls?: { name: string; args: unknown; result?: string }[];
    usage?: SlotMetrics['tokens'];
    metrics: { ttfbMs: number | null; totalMs: number | null };
  };
};

const localStorageKey = 'promptforge-profiles';
const historyStore = localforage.createInstance({ name: 'promptforge-history' });

const providerProfiles = ref<ProviderProfile[]>([]);
const historyItems = ref<HistoryItem[]>([]);
const historyQuery = ref('');
const showHistory = ref(false);
const showProviderManager = ref(false);
const activeHistoryId = ref<string | null>(null);

const shared = reactive({
  userPrompt: 'Compare how each slot reacts to this message.',
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

function setParamOverride(slot: Slot, key: string, value: unknown) {
  if (value === '' || value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    if (slot.paramOverride) {
      const { [key]: _, ...rest } = slot.paramOverride;
      slot.paramOverride = Object.keys(rest).length ? rest : null;
    }
    return;
  }
  slot.paramOverride = { ...(slot.paramOverride || {}), [key]: value };
}

const newProfile = reactive({
  name: '',
  apiKey: '',
  baseUrl: '',
  pluginId: plugins[0].id
});
const modelsByPlugin = reactive<Record<string, { id: string; label: string }[]>>({});
const defaultProviderTemplate = computed(() => {
  const plugin = plugins.find((p) => p.id === newProfile.pluginId);
  return plugin?.defaultBaseUrl || 'https://api.openai.com/v1/chat/completions';
});

function parseTools(toolsDefinition: string) {
  try {
    return toolsDefinition ? JSON.parse(toolsDefinition) : undefined;
  } catch (err) {
    console.warn('工具定义 JSON 解析失败，将忽略 tools。', err);
    return undefined;
  }
}

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

async function* streamOpenAIStyle(resp: Response) {
  if (!resp.body) throw new Error('No stream body');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.replace(/^data:\s*/, '');
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          yield delta as string;
        }
      } catch (err) {
        console.warn('解析流式 chunk 失败', err, payload);
      }
    }
  }
}

type OpenAICompatibleConfig = {
  id: string;
  name: string;
  defaultUrl: string;
  defaultModelsUrl?: string;
  apiKeyPlaceholder: string;
  fallbackModels: { id: string; label: string }[];
  authHeader?: string;
  authPrefix?: string;
};

function createOpenAICompatiblePlugin(options: OpenAICompatibleConfig): Plugin {
  const authHeader = options.authHeader || 'Authorization';
  const authPrefix = options.authPrefix || 'Bearer ';

  return {
    id: options.id,
    name: options.name,
    defaultBaseUrl: options.defaultUrl,
    async listModels(config) {
      const chatUrl = config.baseUrl || options.defaultUrl;
      const modelsUrl =
        options.defaultModelsUrl ||
        (chatUrl.endsWith('/chat/completions')
          ? chatUrl.replace(/\/chat\/completions$/, '/models')
          : `${chatUrl.replace(/\/chat\/completions$/, '')}/models`);

      try {
        const resp = await fetch(modelsUrl, {
          headers: {
            [authHeader]: `${authPrefix}${config.apiKey}`.trim()
          }
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const list = Array.isArray(data?.data)
          ? (data.data as { id: string; description?: string }[])
          : [];
        const mapped = list.map((item) => ({
          id: item.id,
          label: item.description ? `${item.id} (${item.description})` : item.id
        }));

        if (mapped.length) return mapped;
      } catch (err) {
        console.warn(`加载 ${options.name} 模型列表失败，将使用备用列表`, err);
      }

      return options.fallbackModels;
    },
    async *invokeChat(config, request, opts) {
      const controller = new AbortController();
      if (opts.signal) {
        opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const useStream = opts.stream !== false && request.stream !== false;
      const body = {
        model: request.modelId,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt }
        ],
        tools: parseTools(request.toolsDefinition),
        stream: useStream,
        ...request.params,
        enable_suggestions: request.enableSuggestions
      };

      const payload = removeEmptyEntries(body);
      const resp = await fetch(config.baseUrl || options.defaultUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [authHeader]: `${authPrefix}${config.apiKey}`.trim()
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }

      if (useStream) {
        yield* streamOpenAIStyle(resp);
      } else {
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || '';
        if (content) {
          yield content as string;
        }
      }
    },
    buildCurl(config, request) {
      const useStream = request.stream !== false;
      const body = removeEmptyEntries({
        model: request.modelId,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt }
        ],
        tools: parseTools(request.toolsDefinition),
        stream: useStream,
        ...request.params,
        enable_suggestions: request.enableSuggestions
      });

      const apiKey = config.apiKey || options.apiKeyPlaceholder;
      const url = config.baseUrl || options.defaultUrl;
      return (
        `curl -H "Content-Type: application/json" ` +
        `-H "${authHeader}: ${authPrefix}${apiKey}" ` +
        `-X POST ${url} -d '${JSON.stringify(body, null, 2)}'`
      );
    }
  };
}

const plugins: Plugin[] = [
  createOpenAICompatiblePlugin({
    id: 'openai-compatible',
    name: 'OpenAI-Compatible (Mock)',
    defaultUrl: 'https://api.openai.com/v1/chat/completions',
    apiKeyPlaceholder: '{{OPENAI_API_KEY}}',
    fallbackModels: [
      { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
      { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' }
    ]
  }),
  createOpenAICompatiblePlugin({
    id: 'aliyun-dashscope',
    name: 'Aliyun DashScope (通义)',
    defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKeyPlaceholder: '{{ALIYUN_API_KEY}}',
    defaultModelsUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
    fallbackModels: [
      { id: 'qwen-plus', label: 'qwen-plus' },
      { id: 'qwen-max', label: 'qwen-max' },
      { id: 'qwen-vl-max', label: 'qwen-vl-max' }
    ]
  }),
  createOpenAICompatiblePlugin({
    id: 'kimi-moonshot',
    name: 'Kimi (Moonshot)',
    defaultUrl: 'https://api.moonshot.cn/v1/chat/completions',
    apiKeyPlaceholder: '{{KIMI_API_KEY}}',
    defaultModelsUrl: 'https://api.moonshot.cn/v1/models',
    fallbackModels: [
      { id: 'moonshot-v1-8k', label: 'moonshot-v1-8k' },
      { id: 'moonshot-v1-32k', label: 'moonshot-v1-32k' },
      { id: 'moonshot-v1-128k', label: 'moonshot-v1-128k' }
    ]
  }),
  createOpenAICompatiblePlugin({
    id: 'ark-bytedance',
    name: '方舟 Ark (ByteDance)',
    defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    apiKeyPlaceholder: '{{ARK_API_KEY}}',
    defaultModelsUrl: 'https://ark.cn-beijing.volces.com/api/v3/models',
    fallbackModels: [
      { id: 'doubao-pro-32k', label: 'doubao-pro-32k' },
      { id: 'doubao-vision', label: 'doubao-vision' },
      { id: 'doubao-lite-128k', label: 'doubao-lite-128k' }
    ],
    authHeader: 'Authorization',
    authPrefix: 'Bearer '
  })
];

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
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
  const plugin = getPlugin(slot);
  try {
    const profile =
      getProfile(slot) ?? ({ id: '', name: '', apiKey: '', baseUrl: '', pluginId: plugin.id } as ProviderProfile);
    modelsByPlugin[plugin.id] = await plugin.listModels(profile);
    if (!modelsByPlugin[plugin.id].find((m) => m.id === slot.modelId)) {
      slot.modelId = modelsByPlugin[plugin.id][0]?.id || slot.modelId;
    }
  } catch (err) {
    console.warn('加载模型列表失败', err);
  }
}

function modelOptions(slot: Slot) {
  const pluginId = resolvePluginId(slot);
  return modelsByPlugin[pluginId] || [{ id: slot.modelId, label: slot.modelId }];
}

function onProviderChange(slot: Slot) {
  resolvePluginId(slot);
  refreshModelsForSlot(slot);
}

function toggleSelectAll(value: boolean) {
  slots.value.forEach((slot) => {
    slot.selected = value;
  });
}

async function loadHistory() {
  const items: HistoryItem[] = (await historyStore.getItem('items')) || [];
  historyItems.value = items.sort((a, b) => b.createdAt - a.createdAt);
}

async function persistHistory(items: HistoryItem[]) {
  await historyStore.setItem('items', items);
}

function matchesQuery(item: HistoryItem) {
  const q = historyQuery.value.toLowerCase();
  if (!q) return true;
  return (
    item.title.toLowerCase().includes(q) ||
    item.requestSnapshot.userPrompt.toLowerCase().includes(q) ||
    item.requestSnapshot.systemPrompt.toLowerCase().includes(q)
  );
}

const filteredHistory = computed(() => historyItems.value.filter(matchesQuery));

watch(
  filteredHistory,
  (list) => {
    if (!list.length) {
      activeHistoryId.value = null;
      return;
    }
    if (!activeHistoryId.value || !list.some((item) => item.id === activeHistoryId.value)) {
      activeHistoryId.value = list[0].id;
    }
  },
  { immediate: true }
);

function mergeParams(slot: Slot) {
  return removeEmptyEntries({ ...shared.defaultParams, ...(slot.paramOverride || {}) });
}

function buildRequest(slot: Slot): PluginRequest {
  return {
    systemPrompt: slot.systemPrompt,
    userPrompt: shared.userPrompt,
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
  await navigator.clipboard.writeText(curl);
  alert('cURL 已复制，可直接使用');
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
      id: crypto.randomUUID(),
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
  shared.userPrompt = item.requestSnapshot.userPrompt;
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
  slots.value = [createSlot()];
  await Promise.all(slots.value.map((slot) => refreshModelsForSlot(slot)));
  await loadHistory();
});

watch(
  () => newProfile.pluginId,
  () => {
    if (!newProfile.baseUrl) {
      newProfile.baseUrl = defaultProviderTemplate.value;
    }
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
    <header class="flex-between" style="margin-bottom: 12px">
      <div>
        <h1>PromptForge 调试台</h1>
        <p class="small">多 Slot 对比 / 插件化 / cURL 导出 / 本地持久化</p>
      </div>
      <div class="row" style="width: 360px">
        <button @click="addSlot()">新增 Slot</button>
        <button class="ghost" @click="showProviderManager = true">管理 Providers</button>
      </div>
    </header>

    <div v-if="showProviderManager" class="provider-panel">
      <div class="provider-panel__content">
        <div class="flex-between" style="margin-bottom: 12px">
          <h3>Provider 管理</h3>
          <button class="ghost" @click="showProviderManager = false">关闭</button>
        </div>
        <div class="provider-form">
          <div class="row">
            <div>
              <label>名称</label>
              <input v-model="newProfile.name" placeholder="如：OpenAI 生产环境" />
            </div>
            <div>
              <label>插件</label>
              <select v-model="newProfile.pluginId">
                <option v-for="plugin in plugins" :key="plugin.id" :value="plugin.id">{{ plugin.name }}</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div>
              <label>Base URL</label>
              <input
                v-model="newProfile.baseUrl"
                :placeholder="defaultProviderTemplate"
                title="未填写则使用插件默认值"
              />
              <p class="small">未填写将使用对应插件的默认值</p>
            </div>
            <div>
              <label>API Key</label>
              <input v-model="newProfile.apiKey" placeholder="存储在本地" />
            </div>
          </div>
          <div class="flex-between" style="margin-top: 8px">
            <div class="small">Provider 与插件绑定，Slot 选择 Provider 即确定插件。</div>
            <div class="row" style="width: 240px">
              <button class="ghost" @click="resetNewProfile">重置</button>
              <button @click="addProfile">添加 Provider</button>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>名称</th>
                <th>插件</th>
                <th>Base URL</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!providerProfiles.length">
                <td colspan="4">暂无 Provider，请先添加。</td>
              </tr>
              <tr v-for="profile in providerProfiles" :key="profile.id">
                <td>{{ profile.name }}</td>
                <td>{{ plugins.find((p) => p.id === profile.pluginId)?.name || '未知插件' }}</td>
                <td>{{ profile.baseUrl }}</td>
                <td>
                  <button class="ghost" @click="removeProfile(profile.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <section>
      <div class="flex-between">
        <div class="row">
          <button class="secondary" @click="runSelected">Run Selected</button>
          <button class="ghost" @click="runAll">Run All</button>
          <button class="ghost" @click="toggleSelectAll(true)">全选</button>
        <button class="ghost" @click="toggleSelectAll(false)">取消全选</button>
      </div>
      <button class="ghost" @click="showHistory = !showHistory">
        {{ showHistory ? '隐藏历史' : '打开历史' }}
      </button>
      </div>
    </section>

    <section>
      <h3>Shared（全局共享）</h3>
      <div class="row">
        <div>
          <label for="userPrompt">User Prompt</label>
          <textarea id="userPrompt" v-model="shared.userPrompt" placeholder="输入全局 User Prompt" />
        </div>
        <div>
          <label for="tools">Tools 定义 (JSON)</label>
          <textarea
            id="tools"
            v-model="shared.toolsDefinition"
            placeholder='[{"name":"fetchDocs","description":"..."}]'
          />
        </div>
      </div>
      <div class="row">
        <div>
          <label>默认参数</label>
          <div class="row" style="flex-wrap: wrap">
            <div style="flex: 1 1 160px">
              <label>temperature</label>
              <input type="number" step="0.1" v-model.number="shared.defaultParams.temperature" />
            </div>
            <div style="flex: 1 1 160px">
              <label>top_p</label>
              <input type="number" step="0.1" v-model.number="shared.defaultParams.top_p" />
            </div>
            <div style="flex: 1 1 160px">
              <label>max_tokens</label>
              <input type="number" v-model.number="shared.defaultParams.max_tokens" />
            </div>
            <div style="flex: 1 1 160px">
              <label>stop</label>
              <input type="text" v-model="shared.defaultParams.stop" />
            </div>
            <div style="flex: 1 1 160px">
              <label>presence_penalty</label>
              <input type="number" step="0.1" v-model.number="shared.defaultParams.presence_penalty" />
            </div>
            <div style="flex: 1 1 160px">
              <label>frequency_penalty</label>
              <input type="number" step="0.1" v-model.number="shared.defaultParams.frequency_penalty" />
            </div>
          </div>
        </div>
      </div>
      <div class="row" style="align-items: center; justify-content: flex-start">
        <label class="row" style="flex: 0 1 auto; gap: 6px">
          <input type="checkbox" v-model="shared.enableSuggestions" />
          启用联想
        </label>
        <label class="row" style="flex: 0 1 auto; gap: 6px">
          <input type="checkbox" v-model="shared.streamOutput" />
          启用流式输出
        </label>
      </div>
      <div class="small">关闭流式输出时，将在完整响应返回后一次性展示内容，cURL 也会同步更新。</div>
    </section>

    <section>
      <div class="flex-between">
        <h3>Slots（系统提示词调试）</h3>
        <div class="small">支持新增 / 删除 / 复制 / 导出 cURL</div>
      </div>
      <div class="slot-grid">
        <div v-for="slot in slots" :key="slot.id" class="slot-card">
          <div class="flex-between" style="margin-bottom: 8px">
            <div class="row">
              <input type="checkbox" v-model="slot.selected" />
              <span class="badge">{{ slot.status }}</span>
            </div>
            <div class="row">
              <button class="ghost" @click="addSlot(slot)">复制</button>
              <button class="ghost" @click="removeSlot(slot.id)" :disabled="slots.length === 1">删除</button>
            </div>
          </div>
          <div class="row">
            <div>
              <label>Provider</label>
              <select v-model="slot.providerProfileId" @change="onProviderChange(slot)">
                <option :value="null">未选择</option>
                <option v-for="profile in providerProfiles" :key="profile.id" :value="profile.id">
                  {{ profile.name }}
                </option>
              </select>
            </div>
            <div>
              <label>插件</label>
              <div class="readonly-input">{{ getPlugin(slot).name }}</div>
            </div>
            <div>
              <label>Model</label>
              <select v-model="slot.modelId">
                <option v-for="model in modelOptions(slot)" :key="model.id" :value="model.id">
                  {{ model.label }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label>System Prompt</label>
            <textarea
              class="system-prompt"
              v-model="slot.systemPrompt"
              placeholder="为该 Slot 定义 System Prompt"
            />
          </div>
          <details class="collapse">
            <summary>参数覆盖（JSON，可选）</summary>
            <div class="param-editor">
              <div class="param-grid">
                <label class="param-field">
                  <span>temperature</span>
                  <input
                    type="number"
                    step="0.1"
                    :value="slot.paramOverride?.temperature ?? ''"
                    placeholder="继承默认"
                    @input="(e: Event) => setParamOverride(slot, 'temperature', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
                  />
                </label>
                <label class="param-field">
                  <span>top_p</span>
                  <input
                    type="number"
                    step="0.1"
                    :value="slot.paramOverride?.top_p ?? ''"
                    placeholder="继承默认"
                    @input="(e: Event) => setParamOverride(slot, 'top_p', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
                  />
                </label>
                <label class="param-field">
                  <span>max_tokens</span>
                  <input
                    type="number"
                    step="1"
                    :value="slot.paramOverride?.max_tokens ?? ''"
                    placeholder="继承默认"
                    @input="(e: Event) => setParamOverride(slot, 'max_tokens', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
                  />
                </label>
                <label class="param-field">
                  <span>stop</span>
                  <input
                    type="text"
                    :value="(slot.paramOverride?.stop as string | undefined) ?? ''"
                    placeholder="继承默认"
                    @input="(e: Event) => setParamOverride(slot, 'stop', (e.target as HTMLInputElement).value)"
                  />
                </label>
                <label class="param-field">
                  <span>presence_penalty</span>
                  <input
                    type="number"
                    step="0.1"
                    :value="slot.paramOverride?.presence_penalty ?? ''"
                    placeholder="继承默认"
                    @input="(e: Event) => setParamOverride(slot, 'presence_penalty', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
                  />
                </label>
                <label class="param-field">
                  <span>frequency_penalty</span>
                  <input
                    type="number"
                    step="0.1"
                    :value="slot.paramOverride?.frequency_penalty ?? ''"
                    placeholder="继承默认"
                    @input="(e: Event) => setParamOverride(slot, 'frequency_penalty', (e.target as HTMLInputElement).value === '' ? '' : Number((e.target as HTMLInputElement).value))"
                  />
                </label>
              </div>
              <label>高级 JSON（补充/覆盖其他参数）</label>
              <textarea
                :value="slot.paramOverride ? JSON.stringify(slot.paramOverride, null, 2) : ''"
                placeholder='{"temperature":0.2}'
                @input="(e: Event) => {
                  const value = (e.target as HTMLTextAreaElement).value;
                  if (!value.trim()) {
                    slot.paramOverride = null;
                    return;
                  }
                  try {
                    slot.paramOverride = JSON.parse(value);
                  } catch (err) {
                    alert('JSON 解析失败，请检查格式');
                  }
                }"
              />
              <div class="small">留空即沿用默认参数；上方控件与 JSON 均会合并覆盖。</div>
            </div>
          </details>
          <div class="row">
            <button @click="runSlot(slot)" :disabled="slot.status === 'running'">Run</button>
            <button class="ghost" @click="exportCurl(slot)">Export cURL</button>
          </div>
          <div class="metrics">
            <span class="chip">TTFB: {{ slot.metrics.ttfbMs ? `${slot.metrics.ttfbMs.toFixed(0)} ms` : '-' }}</span>
            <span class="chip">Total: {{ slot.metrics.totalMs ? `${slot.metrics.totalMs.toFixed(0)} ms` : '-' }}</span>
          </div>
          <div>
            <label>输出 ({{ shared.streamOutput ? '流式' : '非流式' }})</label>
            <div class="output-box">{{ slot.output || '等待运行...' }}</div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="showHistory" class="history-drawer">
      <div class="history-mask" @click="showHistory = false"></div>
      <section class="history-drawer__content">
        <div class="flex-between">
          <div>
            <h3 style="margin: 0">历史记录</h3>
            <p class="small">抽屉宽度占屏幕一半，方便快速浏览</p>
          </div>
          <div class="row" style="width: 320px">
            <input v-model="historyQuery" placeholder="搜索 system/user prompt" />
            <button class="ghost" @click="showHistory = false">关闭</button>
          </div>
        </div>

        <div class="history-collapse-list">
          <details
            v-for="item in filteredHistory"
            :key="item.id"
            class="collapse history-collapse"
            :open="activeHistoryId === item.id"
          >
            <summary
              class="history-collapse__summary"
              @click.prevent="activeHistoryId = item.id"
            >
              <div class="history-meta">
                <div class="history-meta__title">{{ item.title }}</div>
                <div class="history-meta__info">
                  <span>{{ new Date(item.createdAt).toLocaleString() }}</span>
                  <span>模型：{{ item.requestSnapshot.modelId }}</span>
                  <span>温度：{{ item.requestSnapshot.params?.temperature ?? '默认' }}</span>
                </div>
              </div>
            </summary>
            <div class="history-collapse__body">
              <div class="row" style="flex-wrap: wrap; gap: 6px; align-items: center">
                <span class="chip">TTFB {{ item.responseSnapshot.metrics.ttfbMs?.toFixed(0) ?? '-' }} ms</span>
                <span class="chip">Total {{ item.responseSnapshot.metrics.totalMs?.toFixed(0) ?? '-' }} ms</span>
                <button class="ghost" style="flex: 0 0 auto" @click="loadHistoryIntoEditor(item)">
                  载入
                </button>
                <button class="ghost" style="flex: 0 0 auto" @click="toggleStar(item.id)">
                  {{ item.star ? 'Unstar' : 'Star' }}
                </button>
              </div>
              <div class="small" style="margin-top: 8px">{{ item.requestSnapshot.userPrompt }}</div>
              <div class="output-box" style="margin-top: 8px">{{ item.responseSnapshot.outputText }}</div>
            </div>
          </details>
        </div>
      </section>
    </div>
  </div>
</template>
