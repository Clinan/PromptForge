# 插件接入指南

本文档说明如何在 TruestPrompt 前端中接入新的模型厂商插件，并给出基于阿里云 DashScope（通义模型）的示例。核心目标是让第三方开发者可以通过实现统一的插件接口，完成模型列表拉取、聊天调用、cURL 导出等功能。

## 统一插件接口

插件需要实现 `Plugin` 接口中定义的三个方法，接口定义可参考 `src/App.vue` 中的类型声明：

- `listModels(config: ProviderProfile) => Promise<{ id: string; label: string }[]>`
  - 按当前 Provider Profile 返回可用模型列表。
- `invokeChat(config: ProviderProfile, request: PluginRequest, options: PluginInvokeOptions) => AsyncGenerator<string>`
  - 负责将统一的 `PluginRequest` 结构转换为厂商 API 请求并返回流式输出（使用 `yield` 字符串追加到 UI）。
- `buildCurl(config: ProviderProfile, request: PluginRequest) => string`
  - 根据配置与请求体生成可直接调用的 cURL 命令，支持占位符隐藏密钥。

> 对应的数据结构和存储：
>
> - Provider Profile：`{ id, name, apiKey, baseUrl }`，存储在 localStorage，用于保存厂商密钥和基础域名。
> - 插件数组：在 `src/App.vue` 的 `plugins` 变量中注册。每个 Slot 通过 `pluginId` 选择插件，`providerProfileId` 选择密钥配置。

## 接入步骤

1. **确定厂商调用协议与流式格式**：确认请求 URL、鉴权头、是否兼容 OpenAI 格式、流式分隔（SSE / chunk / 普通 JSON）。
2. **在 `src/App.vue` 中实现插件对象**：按照下面的示例创建 `Plugin` 对象，放入 `plugins` 数组。确保 `id` 唯一且有易读的 `name`。
3. **实现模型列表**：
   - 优先调用厂商的 models 查询接口（通常为 `GET /v1/models` 或兼容路径），在 `listModels` 中发起请求并将响应转成 `{id,label}`；
   - 可准备兜底的 fallback 列表，确保接口异常时仍可选择常用模型。
4. **实现聊天调用**：
   - 将 `PluginRequest` 映射为厂商的请求体；
   - 使用 `fetch` 发起请求，处理鉴权与基础路径；
   - 对于流式响应，使用 `ReadableStream` + `TextDecoder` 逐块解析并 `yield`；
   - 如无流式，可 `yield` 单次完整响应文本。
5. **实现 cURL 导出**：
   - 使用与调用一致的请求体和头；
   - 若需要隐藏密钥，可用 `{{YOUR_KEY}}` 占位符。
6. **验证**：在页面中新增一个 Slot，选择新插件与对应 Provider Profile，点击 Run 确认能流式输出并记录历史。

## 示例：接入阿里云 DashScope（通义模型）

下面示例展示如何将阿里云 DashScope 的 OpenAI 兼容接口接入到 TruestPrompt。DashScope 提供 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` 兼容 OpenAI 的 Chat Completions 协议，并使用 `Authorization: Bearer <API_KEY>` 鉴权。

```ts
// 片段：添加到 src/App.vue 的 plugins 数组
  const aliyunDashScope: Plugin = {
    id: 'aliyun-dashscope',
    name: 'Aliyun DashScope (通义)',
    async listModels(config) {
      try {
        const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
          headers: { Authorization: `Bearer ${config.apiKey}` }
        });
        if (!resp.ok) throw new Error('model list failed');
        const data = await resp.json();
        const list = (data?.data || []) as { id: string }[];
        if (list.length) return list.map((m) => ({ id: m.id, label: m.id }));
      } catch (err) {
        console.warn('fallback to default qwen list', err);
      }
      return [
        { id: 'qwen-plus', label: 'qwen-plus' },
        { id: 'qwen-max', label: 'qwen-max' }
      ];
    },
  async *invokeChat(config, request, options) {
    const controller = new AbortController();
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const body = {
      model: request.modelId,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt }
      ],
      tools: request.toolsDefinition ? JSON.parse(request.toolsDefinition) : undefined,
      ...request.params
    };

    const resp = await fetch(
      config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );

    if (!resp.body) throw new Error('No stream body');
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      const text = decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
      if (!text) continue;
      // DashScope 兼容 OpenAI 流式，按行切割 data: 事件
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          const payload = line.replace('data: ', '').trim();
          if (payload === '[DONE]') continue;
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        }
      }
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
    const apiKey = config.apiKey || '{{ALIYUN_API_KEY}}';
    const url = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    return `curl -H "Content-Type: application/json" -H "Authorization: Bearer ${apiKey}" -X POST ${url} -d '${JSON.stringify(body)}'`;
  }
};

plugins.push(aliyunDashScope);
```

### 配置与使用

1. 在页面顶部点击 **Add Profile**（或调用 `addProfile`），填写：
   - `Provider profile name`: 如 `Aliyun Test`
   - `API Key`: 在阿里云控制台获取的 DashScope API Key
   - `Base URL`: 留空使用默认兼容地址，或填写自定义网关
2. 在 Slot 卡片中选择：
   - `Provider`: 刚创建的 `Aliyun Test`
   - `Plugin`: `Aliyun DashScope (通义)`
   - `Model`: 选择 `qwen-plus` 等模型
3. 填写 System Prompt / User Prompt / Tools，点击 Run，即可在 Output 区查看流式返回。

### 其他厂商接入提示

- **非 OpenAI 兼容接口**：需要在 `invokeChat` 中自行构造请求体与解析响应，确保最终 `yield` 字符串片段即可。
 - **SSE 以外的流式格式**：若返回 chunked JSON，可直接在读取到的文本上解析；若不支持流式，`invokeChat` 可一次性 `yield` 完整内容。
 - **鉴权差异**：根据厂商要求添加 `Bearer`、`api-key`、`X-Api-Key` 等 header；如需 query 参数鉴权，请在 `fetch` URL 上附加。
 - **模型列表动态拉取**：如果接口需要鉴权，可以在 `listModels` 中复用 Provider Profile 的密钥。

## 已内置的插件示例（开箱即用）

仓库目前已经预置了多个常见厂商的插件，便于直接选择 Slot -> Plugin 即可运行：

| 插件 ID | 显示名称 | 默认 Base URL | 模型获取方式 | 鉴权方式 |
| --- | --- | --- | --- | --- |
| `openai-compatible` | OpenAI-Compatible (Mock) | `https://api.openai.com/v1/chat/completions` | 动态调用 `/v1/models`，失败回退到常用模型列表 | `Authorization: Bearer <API_KEY>` |
| `aliyun-dashscope` | Aliyun DashScope (通义) | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | 动态调用 `/compatible-mode/v1/models`，失败回退到通义常用模型 | `Authorization: Bearer <API_KEY>` |
| `kimi-moonshot` | Kimi (Moonshot) | `https://api.moonshot.cn/v1/chat/completions` | 动态调用 `/v1/models`，失败回退到 Kimi 常用模型 | `Authorization: Bearer <API_KEY>` |
| `ark-bytedance` | 方舟 Ark (ByteDance) | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` | 动态调用 `/api/v3/models`，失败回退到 Doubao 常用模型 | `Authorization: Bearer <API_KEY>` |

如果需要使用私有网关或企业代理，可在 Provider Profile 中覆盖 Base URL；插件会优先使用 Profile 中的配置。

通过以上步骤，即可为 TruestPrompt 添加新的模型厂商插件，并保持与现有运行、历史、cURL 导出等功能一致。
