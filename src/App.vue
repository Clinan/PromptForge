<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import localforage from 'localforage';

type PluginRequest = {
  systemPrompt: string;
  userPrompt: string;
  toolsDefinition: string;
  params: Record<string, unknown>;
  modelId: string;
};

type PluginInvokeOptions = {
  stream?: boolean;
  signal?: AbortSignal;
};

type Plugin = {
  id: string;
  name: string;
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
  }
});

const plugins: Plugin[] = [
  {
    id: 'openai-compatible',
    name: 'OpenAI-Compatible (Mock)',
    async listModels() {
      return [
        { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
        { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' }
      ];
    },
    async *invokeChat(_config, request, options) {
      const { signal } = options;
      const chunks = [
        'Analysing system prompt...',
        'Applying shared user prompt...',
        `Model ${request.modelId} summarises intent.`,
        'Streaming simulated completion for quick validation.'
      ];
      const start = performance.now();
      for (const chunk of chunks) {
        if (signal?.aborted) break;
        await new Promise((resolve) => setTimeout(resolve, 300));
        yield `${chunk}\n`;
      }
      const elapsed = performance.now() - start;
      if (!signal?.aborted) {
        yield `Done in ${(elapsed / 1000).toFixed(2)}s.`;
      }
    },
    buildCurl(config, request) {
      const body = {
        model: request.modelId,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt }
        ],
        tools: request.toolsDefinition ? JSON.parse(request.toolsDefinition) : undefined,
        ...request.params
      };
        const headerKey = config.apiKey ? config.apiKey : '{{OPENAI_API_KEY}}';
        return `curl -H "Content-Type: application/json" -H "Authorization: Bearer ${headerKey}" ` +
          `-X POST ${config.baseUrl || 'https://api.openai.com/v1/chat/completions'} ` +
          `-d '${JSON.stringify(body, null, 2)}'`;
    }
  }
];

const slots = ref<Slot[]>([]);

function loadProfiles() {
  const stored = localStorage.getItem(localStorageKey);
  providerProfiles.value = stored ? (JSON.parse(stored) as ProviderProfile[]) : [];
}

function saveProfiles() {
  localStorage.setItem(localStorageKey, JSON.stringify(providerProfiles.value));
}

function addProfile() {
  const name = prompt('Provider profile name?');
  if (!name) return;
  const apiKey = prompt('API Key (stored locally)') || '';
  const baseUrl = prompt('Base URL (OpenAI compatible)') || 'https://api.openai.com/v1/chat/completions';
  providerProfiles.value.push({ id: crypto.randomUUID(), name, apiKey, baseUrl });
  saveProfiles();
}

function createSlot(copyFrom?: Slot): Slot {
  return {
    id: crypto.randomUUID(),
    providerProfileId: providerProfiles.value[0]?.id ?? null,
    pluginId: copyFrom?.pluginId ?? plugins[0].id,
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

function mergeParams(slot: Slot) {
  return { ...shared.defaultParams, ...(slot.paramOverride || {}) };
}

function buildRequest(slot: Slot): PluginRequest {
  return {
    systemPrompt: slot.systemPrompt,
    userPrompt: shared.userPrompt,
    toolsDefinition: shared.toolsDefinition,
    params: mergeParams(slot),
    modelId: slot.modelId
  };
}

function getPlugin(slot: Slot) {
  return plugins.find((p) => p.id === slot.pluginId)!;
}

function getProfile(slot: Slot) {
  return providerProfiles.value.find((p) => p.id === slot.providerProfileId) || null;
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
      stream: true,
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
  loadProfiles();
  slots.value = [createSlot()];
  await loadHistory();
});
</script>

<template>
  <div>
    <header class="flex-between" style="margin-bottom: 12px">
      <div>
        <h1>PromptForge 调试台</h1>
        <p class="small">多 Slot 对比 / 插件化 / cURL 导出 / 本地持久化</p>
      </div>
      <div class="row" style="width: 320px">
        <button @click="addSlot()">新增 Slot</button>
        <button class="ghost" @click="addProfile">新增 Provider</button>
      </div>
    </header>

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
              <select v-model="slot.providerProfileId">
                <option v-for="profile in providerProfiles" :key="profile.id" :value="profile.id">
                  {{ profile.name }}
                </option>
              </select>
            </div>
            <div>
              <label>Plugin</label>
              <select v-model="slot.pluginId">
                <option v-for="plugin in plugins" :key="plugin.id" :value="plugin.id">
                  {{ plugin.name }}
                </option>
              </select>
            </div>
            <div>
              <label>Model</label>
              <select v-model="slot.modelId">
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>
          </div>
          <div>
            <label>System Prompt</label>
            <textarea v-model="slot.systemPrompt" placeholder="为该 Slot 定义 System Prompt" />
          </div>
          <div>
            <label>参数覆盖（JSON，可选）</label>
            <textarea
              :value="slot.paramOverride ? JSON.stringify(slot.paramOverride, null, 2) : ''"
              placeholder='{"temperature":0.2}'
              @input="(e: Event) => {
                const value = (e.target as HTMLTextAreaElement).value;
                slot.paramOverride = value ? JSON.parse(value) : null;
              }"
            />
          </div>
          <div class="row">
            <button @click="runSlot(slot)" :disabled="slot.status === 'running'">Run</button>
            <button class="ghost" @click="exportCurl(slot)">Export cURL</button>
          </div>
          <div class="metrics">
            <span class="chip">TTFB: {{ slot.metrics.ttfbMs ? `${slot.metrics.ttfbMs.toFixed(0)} ms` : '-' }}</span>
            <span class="chip">Total: {{ slot.metrics.totalMs ? `${slot.metrics.totalMs.toFixed(0)} ms` : '-' }}</span>
          </div>
          <div>
            <label>输出 (流式)</label>
            <div class="output-box">{{ slot.output || '等待运行...' }}</div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="showHistory">
      <div class="flex-between">
        <h3>历史记录</h3>
        <input
          style="max-width: 240px"
          v-model="historyQuery"
          placeholder="搜索 system/user prompt"
        />
      </div>
      <div class="history-list">
        <table class="table">
          <thead>
            <tr>
              <th>时间</th>
              <th>标题</th>
              <th>耗时</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredHistory" :key="item.id">
              <td>{{ new Date(item.createdAt).toLocaleString() }}</td>
              <td>
                <div>{{ item.title }}</div>
                <div class="small">{{ item.requestSnapshot.modelId }}</div>
              </td>
              <td>
                <span class="chip">TTFB {{ item.responseSnapshot.metrics.ttfbMs?.toFixed(0) ?? '-' }} ms</span>
                <span class="chip">Total {{ item.responseSnapshot.metrics.totalMs?.toFixed(0) ?? '-' }} ms</span>
              </td>
              <td class="row">
                <button class="ghost" @click="loadHistoryIntoEditor(item)">载入</button>
                <button class="ghost" @click="toggleStar(item.id)">
                  {{ item.star ? 'Unstar' : 'Star' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
