export type PluginRequest = {
  systemPrompt: string;
  userPrompts: string[];
  toolsDefinition: string;
  params: Record<string, unknown>;
  modelId: string;
  enableSuggestions: boolean;
  stream: boolean;
};

export type PluginInvokeOptions = {
  stream?: boolean;
  signal?: AbortSignal;
};

export type ProviderProfile = {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  pluginId: string;
};

export type Plugin = {
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

export type SlotMetrics = {
  ttfbMs: number | null;
  totalMs: number | null;
  tokens?: { prompt?: number; completion?: number; total?: number };
  toolCalls?: { name: string; args: unknown; result?: string }[];
};

export type Slot = {
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

export type HistoryItem = {
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

export type UserPromptPreset = {
  id: string;
  text: string;
};

export type SharedState = {
  userPrompts: UserPromptPreset[];
  toolsDefinition: string;
  defaultParams: {
    temperature: number;
    top_p: number;
    max_tokens: number;
    stop: string;
    presence_penalty: number;
    frequency_penalty: number;
  };
  enableSuggestions: boolean;
  streamOutput: boolean;
};

export type ProviderProfileDraft = {
  name: string;
  apiKey: string;
  baseUrl: string;
  pluginId: string;
};

