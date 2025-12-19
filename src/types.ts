export type PluginRequest = {
  systemPrompt: string;
  userPrompts: string[];
  toolsDefinition: string;
  params: Record<string, unknown>;
  modelId: string;
  enableSuggestions: boolean;
  stream: boolean;
  messages?: Array<{ role: string; content: string }>;
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
  ) => AsyncGenerator<PluginChunk, void, unknown>;
  buildCurl: (config: ProviderProfile, request: PluginRequest) => string;
};

export type ToolCall = {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: unknown;
  };
  [key: string]: unknown;
};

export type PluginChunk =
  | { type: 'content'; text: string }
  | { type: 'tool_calls'; toolCalls: ToolCall[] }
  | { type: 'usage'; tokens: SlotMetrics['tokens'] };

export type SlotMetrics = {
  ttfbMs: number | null;
  totalMs: number | null;
  tokens?: { prompt?: number; completion?: number; total?: number };
};

export type Slot = {
  id: string;
  providerProfileId: string | null;
  pluginId: string;
  modelId: string;
  systemPrompt: string;
  paramOverride: Record<string, unknown> | null;
  selected: boolean;
  status: 'idle' | 'running' | 'done' | 'error' | 'canceled';
  output: string;
  toolCalls: ToolCall[] | null;
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
    toolCalls?: ToolCall[];
    usage?: SlotMetrics['tokens'];
    metrics: { ttfbMs: number | null; totalMs: number | null };
  };
};

export type UserPromptPreset = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  text: string;
};

export type VariableBinding = {
  id: string;
  key: string;
  value: string;
};

export type SharedState = {
  userPrompts: UserPromptPreset[];
  toolsDefinition: string;
  variables: VariableBinding[];
  defaultParams: {
    temperature: number;
    top_p: number;
    max_tokens: number;
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
