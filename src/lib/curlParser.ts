/**
 * cURL Parser - 解析 cURL 命令并提取配置信息
 * 
 * 功能：
 * - 解析 cURL 命令字符串
 * - 检测 API Provider 类型
 * - 提取 API Key、模型 ID、消息等
 */

import type { ProviderProfile, Slot } from '../types';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * cURL 解析错误
 */
export class CurlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurlParseError';
  }
}

/**
 * 解析后的 cURL 命令结构
 */
export interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown | null;
  apiKey: string | null;
}

/**
 * 提取的消息结构
 */
export interface ExtractedMessages {
  modelId: string | null;
  messages: Array<{ role: string; content: string }> | null;
  systemPrompt: string | null;
}

/**
 * cURL 导入结果
 */
export interface CurlImportResult {
  targetProjectId: string;
  provider: {
    id: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    pluginId: string;
    isNew: boolean;
  };
  modelId: string | null;
  messages: Array<{ role: string; content: string }> | null;
  systemPrompt: string | null;
}

// ============================================================================
// Plugin URL Patterns
// ============================================================================

/**
 * URL 模式到插件 ID 的映射
 */
export const PLUGIN_URL_PATTERNS: Array<{ pattern: RegExp; pluginId: string; name: string }> = [
  { pattern: /api\.openai\.com/i, pluginId: 'openai-compatible', name: 'OpenAI' },
  { pattern: /generativelanguage\.googleapis\.com/i, pluginId: 'Gemini', name: 'Gemini' },
  { pattern: /dashscope\.aliyuncs\.com/i, pluginId: 'aliyun-dashscope', name: 'Aliyun DashScope' },
  { pattern: /api\.moonshot\.cn/i, pluginId: 'kimi-moonshot', name: 'Kimi' },
  { pattern: /ark\.cn-beijing\.volces\.com/i, pluginId: 'ark-bytedance', name: 'Ark' },
];

/**
 * 默认系统提示词（用于判断 Slot 是否为默认内容）
 */
export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant focused on prompt debugging insights.';


// ============================================================================
// Core Parsing Functions
// ============================================================================

/**
 * 解析 cURL 命令字符串
 * 
 * @param curlCommand - cURL 命令字符串
 * @returns ParsedCurl 对象
 * @throws CurlParseError 如果解析失败
 */
export function parseCurl(curlCommand: string): ParsedCurl {
  // 验证输入
  const trimmed = curlCommand.trim();
  if (!trimmed) {
    throw new CurlParseError('请输入 cURL 命令');
  }

  // 检查是否以 curl 开头
  if (!trimmed.toLowerCase().startsWith('curl')) {
    throw new CurlParseError('无效的 cURL 命令格式');
  }

  // 移除 curl 前缀并处理
  const commandBody = trimmed.slice(4).trim();

  // 提取各部分
  const headers: Record<string, string> = {};
  let method = 'GET';
  let url = '';
  let bodyStr: string | null = null;

  // 使用状态机解析命令
  const tokens = tokenizeCurl(commandBody);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token === '-H' || token === '--header') {
      // 解析 header
      const headerValue = tokens[++i];
      if (headerValue) {
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > 0) {
          const key = headerValue.slice(0, colonIndex).trim();
          const value = headerValue.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
    } else if (token === '-X' || token === '--request') {
      // 解析 HTTP 方法
      method = tokens[++i]?.toUpperCase() || 'GET';
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      // 解析请求体
      bodyStr = tokens[++i] || null;
    } else if (!token.startsWith('-') && !url) {
      // 可能是 URL
      if (isValidUrl(token)) {
        url = token;
      }
    }
  }

  // 验证 URL
  if (!url) {
    throw new CurlParseError('未找到有效的请求 URL');
  }

  // 解析 body
  let body: unknown | null = null;
  if (bodyStr) {
    try {
      body = JSON.parse(bodyStr);
    } catch {
      // body 不是有效 JSON，保持为字符串
      body = bodyStr;
    }
  }

  // 提取 API Key
  const apiKey = extractApiKey(headers);

  // 如果有 body，默认为 POST
  if (body && method === 'GET') {
    method = 'POST';
  }

  return {
    url,
    method,
    headers,
    body,
    apiKey,
  };
}

/**
 * 将 cURL 命令分词
 * 处理引号内的内容作为单个 token
 */
function tokenizeCurl(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;
  let escapeNext = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escapeNext) {
      // 如果转义后是 - 开头（如 \--header），视为新 token 的开始
      if (char === '-' && !inQuote) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        current += char;
      } else {
        current += char;
      }
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === ' ' || char === '\t' || char === '\n') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * 检查字符串是否为有效 URL
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}


// ============================================================================
// Plugin Detection
// ============================================================================

/**
 * 根据 URL 检测插件 ID
 * 
 * @param url - 请求 URL
 * @returns 匹配的插件 ID，如果没有匹配则返回 'openai-compatible'
 */
export function detectPluginId(url: string): string {
  for (const { pattern, pluginId } of PLUGIN_URL_PATTERNS) {
    if (pattern.test(url)) {
      return pluginId;
    }
  }
  return 'openai-compatible';
}

/**
 * 根据 URL 获取插件名称
 * 
 * @param url - 请求 URL
 * @returns 匹配的插件名称
 */
export function detectPluginName(url: string): string {
  for (const { pattern, name } of PLUGIN_URL_PATTERNS) {
    if (pattern.test(url)) {
      return name;
    }
  }
  return 'OpenAI Compatible';
}


// ============================================================================
// API Key Extraction
// ============================================================================

/**
 * 从请求头中提取 API Key
 * 
 * @param headers - 请求头对象
 * @returns API Key 或 null
 */
export function extractApiKey(headers: Record<string, string>): string | null {
  // 查找 Authorization header（不区分大小写）
  const authKey = Object.keys(headers).find(
    key => key.toLowerCase() === 'authorization'
  );
  
  if (!authKey) {
    return null;
  }

  const authValue = headers[authKey];
  
  // 处理 Bearer token
  if (authValue.toLowerCase().startsWith('bearer ')) {
    return authValue.slice(7).trim();
  }
  
  // 处理其他格式（直接返回值）
  return authValue.trim() || null;
}


// ============================================================================
// Model and Messages Extraction
// ============================================================================

/**
 * 从请求体中提取模型 ID 和消息
 * 
 * @param body - 解析后的请求体
 * @returns 提取的模型 ID、消息和系统提示词
 */
export function extractModelAndMessages(body: unknown): ExtractedMessages {
  if (!body || typeof body !== 'object') {
    return { modelId: null, messages: null, systemPrompt: null };
  }

  const bodyObj = body as Record<string, unknown>;
  
  // 提取模型 ID
  const modelId = typeof bodyObj.model === 'string' ? bodyObj.model : null;
  
  // 提取消息
  let messages: Array<{ role: string; content: string }> | null = null;
  let systemPrompt: string | null = null;
  
  if (Array.isArray(bodyObj.messages)) {
    const allMessages: Array<{ role: string; content: string }> = [];
    
    for (const msg of bodyObj.messages) {
      if (msg && typeof msg === 'object') {
        const msgObj = msg as Record<string, unknown>;
        const role = typeof msgObj.role === 'string' ? msgObj.role : 'user';
        const content = typeof msgObj.content === 'string' ? msgObj.content : '';
        
        if (role === 'system') {
          // 系统消息提取到 systemPrompt
          systemPrompt = content;
        } else {
          // 其他消息保留
          allMessages.push({ role, content });
        }
      }
    }
    
    if (allMessages.length > 0) {
      messages = allMessages;
    }
  }
  
  return { modelId, messages, systemPrompt };
}


// ============================================================================
// Provider Management
// ============================================================================

/**
 * 在 Provider 列表中查找匹配的 Provider
 * 匹配条件：baseUrl、pluginId 和 apiKey 都相同
 * 
 * @param providers - 现有 Provider 列表
 * @param baseUrl - 要匹配的 baseUrl
 * @param pluginId - 要匹配的 pluginId
 * @param apiKey - 要匹配的 apiKey（可选，如果提供则也需要匹配）
 * @returns 匹配的 Provider 或 null
 */
export function findMatchingProvider(
  providers: ProviderProfile[],
  baseUrl: string,
  pluginId: string,
  apiKey?: string | null
): ProviderProfile | null {
  return providers.find(p => {
    // 必须匹配 baseUrl 和 pluginId
    if (p.baseUrl !== baseUrl || p.pluginId !== pluginId) {
      return false;
    }
    // 如果提供了 apiKey，也需要匹配
    if (apiKey !== undefined && apiKey !== null) {
      return p.apiKey === apiKey;
    }
    return true;
  }) || null;
}

/**
 * 生成唯一的 Provider 名称
 * 
 * @param existingNames - 现有 Provider 名称列表
 * @param baseName - 基础名称
 * @returns 唯一的名称
 */
export function generateUniqueProviderName(
  existingNames: string[],
  baseName: string
): string {
  // 如果基础名称不存在，直接使用
  if (!existingNames.includes(baseName)) {
    return baseName;
  }
  
  // 生成随机后缀
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const newName = `${baseName}-${suffix}`;
  
  // 确保唯一性（极小概率冲突）
  if (existingNames.includes(newName)) {
    return generateUniqueProviderName(existingNames, baseName);
  }
  
  return newName;
}


// ============================================================================
// Slot Decision Logic
// ============================================================================

/**
 * 检查 Slot 是否为默认/空内容
 * 
 * @param slot - Slot 对象
 * @returns 如果 Slot 是默认内容则返回 true
 */
export function isSlotDefault(slot: Slot): boolean {
  // 检查状态是否为 idle
  if (slot.status !== 'idle') {
    return false;
  }
  
  // 检查输出是否为空
  if (slot.output && slot.output.trim()) {
    return false;
  }
  
  // 检查系统提示词是否为默认或空
  const systemPrompt = slot.systemPrompt?.trim() || '';
  const isDefaultPrompt = systemPrompt === '' || systemPrompt === DEFAULT_SYSTEM_PROMPT;
  
  return isDefaultPrompt;
}

/**
 * 决定是否应该覆盖现有 Slot
 * 
 * @param slots - 当前 Slot 列表
 * @returns 如果应该覆盖则返回 true，否则返回 false（创建新 Slot）
 */
export function shouldOverwriteSlot(slots: Slot[]): boolean {
  // 只有一个 Slot 且为默认内容时才覆盖
  if (slots.length !== 1) {
    return false;
  }
  
  return isSlotDefault(slots[0]);
}
