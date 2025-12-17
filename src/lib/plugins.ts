import type { Plugin, ProviderProfile } from '../types';

type PluginRequest = import('../types').PluginRequest;
type PluginInvokeOptions = import('../types').PluginInvokeOptions;

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

function parseTools(toolsDefinition: string) {
  try {
    if (!toolsDefinition || !toolsDefinition.trim()) return undefined;
    const parsed = JSON.parse(toolsDefinition) as unknown;
    const rawTools = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as any).tools)
        ? ((parsed as any).tools as unknown[])
        : null;

    if (!rawTools) return undefined;
    if (rawTools.length === 0) return [];

    const looksLikeOpenAITools = rawTools.every(
      (t) => t && typeof t === 'object' && typeof (t as any).type === 'string'
    );
    if (looksLikeOpenAITools) return rawTools;

    const looksLikeFunctionList = rawTools.every(
      (t) => t && typeof t === 'object' && typeof (t as any).name === 'string'
    );
    if (looksLikeFunctionList) {
      return rawTools.map((t) => {
        const parameters =
          (t as any).parameters ||
          (t as any).schema ||
          (t as any).json_schema ||
          (t as any).input_schema || {
            type: 'object',
            properties: {},
            additionalProperties: true
          };
        return {
          type: 'function',
          function: {
            name: (t as any).name,
            description: typeof (t as any).description === 'string' ? (t as any).description : undefined,
            parameters
          }
        };
      });
    }

    return rawTools;
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
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (config.apiKey) {
          headers[authHeader] = `${authPrefix}${config.apiKey}`.trim();
        }
        const resp = await fetch(modelsUrl, { headers });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const list =
          (Array.isArray((data as any)?.data) && (data as any).data) ||
          (Array.isArray((data as any)?.models) && (data as any).models) ||
          (Array.isArray((data as any)?.result?.data) && (data as any).result.data) ||
          (Array.isArray((data as any)?.result?.models) && (data as any).result.models) ||
          [];

        const mapped = (list as any[])
          .map((item) => {
            const id =
              (typeof item?.id === 'string' && item.id) ||
              (typeof item?.model_id === 'string' && item.model_id) ||
              (typeof item?.name === 'string' && item.name) ||
              '';
            if (!id) return null;
            const desc =
              (typeof item?.description === 'string' && item.description) ||
              (typeof item?.display_name === 'string' && item.display_name) ||
              (typeof item?.label === 'string' && item.label) ||
              '';
            return { id, label: desc ? `${id} (${desc})` : id };
          })
          .filter((item): item is { id: string; label: string } => Boolean(item));

        if (mapped.length) return mapped;
      } catch (err) {
        console.warn(`加载 ${options.name} 模型列表失败，将使用备用列表`, err);
      }

      return options.fallbackModels;
    },
    async *invokeChat(config: ProviderProfile, request: PluginRequest, opts: PluginInvokeOptions) {
      const controller = new AbortController();
      if (opts.signal) {
        opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const useStream = opts.stream !== false && request.stream !== false;
      const messages = [
        { role: 'system', content: request.systemPrompt },
        ...request.userPrompts.map((content) => ({ role: 'user', content }))
      ];
      const body = {
        model: request.modelId,
        messages,
        tools: parseTools(request.toolsDefinition),
        stream: useStream,
        ...request.params
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
      const messages = [
        { role: 'system', content: request.systemPrompt },
        ...request.userPrompts.map((content) => ({ role: 'user', content }))
      ];
      const body = removeEmptyEntries({
        model: request.modelId,
        messages,
        tools: parseTools(request.toolsDefinition),
        stream: useStream,
        ...request.params
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

export const plugins: Plugin[] = [
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
    defaultUrl: 'https://ark.cn-beijing.volces.com/api/v1/chat/completions',
    apiKeyPlaceholder: '{{ARK_API_KEY}}',
    // 跨域了，走代理
    defaultModelsUrl: '/proxy/ark/api/v3/models',
    fallbackModels: [
      { id: 'doubao-pro-32k', label: 'doubao-pro-32k' },
      { id: 'doubao-vision', label: 'doubao-vision' },
      { id: 'doubao-lite-128k', label: 'doubao-lite-128k' }
    ],
    authHeader: 'Authorization',
    authPrefix: 'Bearer '
  })
];
