import { createOpenAI } from "@ai-sdk/openai";

/**
 * 统一模型工厂
 * DeepSeek / OpenAI / 任意 OpenAI 兼容网关都走同一套接口，
 * 面试点：Provider 可替换，业务工具层不感知具体厂商。
 */

const PLACEHOLDER_KEYS = new Set([
  "",
  "sk-your-key",
  "your-api-key",
  "changeme",
  "replace-me",
  "xxx",
  "todo",
]);

/** 过滤示例/占位 Key，避免「看起来有 Key 其实调不通」 */
export function isUsableApiKey(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (PLACEHOLDER_KEYS.has(v.toLowerCase())) return false;
  if (/^sk-your/i.test(v)) return false;
  if (/placeholder|example|changeme/i.test(v)) return false;
  return true;
}

function readChatApiKey(): string | undefined {
  const candidates = [
    process.env.DEEPSEEK_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.AI_GATEWAY_API_KEY,
  ];
  for (const c of candidates) {
    if (isUsableApiKey(c)) return c!.trim();
  }
  return undefined;
}

export function getChatModel() {
  const apiKey = readChatApiKey();

  if (!apiKey) {
    throw new Error(
      "缺少 API Key。请在 aether-desk/.env.local 设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。",
    );
  }

  const baseURL =
    process.env.AI_BASE_URL ||
    (isUsableApiKey(process.env.DEEPSEEK_API_KEY)
      ? "https://api.deepseek.com/v1"
      : "https://api.openai.com/v1");

  const modelId =
    process.env.AI_MODEL ||
    (isUsableApiKey(process.env.DEEPSEEK_API_KEY)
      ? "deepseek-chat"
      : "gpt-4o-mini");

  const provider = createOpenAI({
    apiKey,
    baseURL,
  });

  return provider.chat(modelId);
}

/** 已配置可用 Chat API Key（非占位符） */
export function hasApiKey() {
  return Boolean(readChatApiKey());
}

/**
 * 离线测试数据门控：仅当没有可用 Chat Key 时启用 fixture mock。
 * 接入真 AI 后绝不走 mock。
 */
export function useMockChat() {
  return !hasApiKey();
}
