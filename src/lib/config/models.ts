export interface ModelConfig {
  id: string;
  provider: "gemini" | "groq" | "sarvam" | "anthropic";
  apiModelId: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  description?: string;
}

export const models: Record<string, ModelConfig> = {
  // ── Gemini (Google) ──
  "gemini-flash": {
    id: "gemini-flash",
    provider: "gemini",
    apiModelId: "gemini-2.5-flash",
    contextWindow: 1_000_000,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    description: "Google's fast multimodal workhorse — free tier",
  },
  "gemini-flash-lite": {
    id: "gemini-flash-lite",
    provider: "gemini",
    apiModelId: "gemini-2.5-flash-lite",
    contextWindow: 1_000_000,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    description: "Cheapest Gemini model for high-volume tasks",
  },

  // ── Groq ──
  "groq-llama-70b": {
    id: "groq-llama-70b",
    provider: "groq",
    apiModelId: "llama-3.3-70b-versatile",
    contextWindow: 128_000,
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
    description: "Meta Llama 3.3 70B — strong general intelligence, 1K req/day free",
  },
  "groq-llama-8b": {
    id: "groq-llama-8b",
    provider: "groq",
    apiModelId: "llama-3.1-8b-instant",
    contextWindow: 128_000,
    costPer1kInput: 0.00005,
    costPer1kOutput: 0.00008,
    description: "Meta Llama 3.1 8B — fastest, 14.4K req/day free",
  },
  "groq-llama4-scout": {
    id: "groq-llama4-scout",
    provider: "groq",
    apiModelId: "meta-llama/llama-4-scout-17b-16e-instruct",
    contextWindow: 128_000,
    costPer1kInput: 0.00011,
    costPer1kOutput: 0.00034,
    description: "Meta Llama 4 Scout — latest generation, preview",
  },
  "groq-gpt-oss-120b": {
    id: "groq-gpt-oss-120b",
    provider: "groq",
    apiModelId: "openai/gpt-oss-120b",
    contextWindow: 128_000,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    description: "OpenAI GPT-OSS 120B — open-weights reasoning model",
  },
  "groq-gpt-oss-20b": {
    id: "groq-gpt-oss-20b",
    provider: "groq",
    apiModelId: "openai/gpt-oss-20b",
    contextWindow: 128_000,
    costPer1kInput: 0.000075,
    costPer1kOutput: 0.0003,
    description: "OpenAI GPT-OSS 20B — compact, fast open-weights model",
  },
  "groq-qwen3-32b": {
    id: "groq-qwen3-32b",
    provider: "groq",
    apiModelId: "qwen/qwen3-32b",
    contextWindow: 128_000,
    costPer1kInput: 0.00029,
    costPer1kOutput: 0.00059,
    description: "Alibaba Qwen 3 32B — thinking model, preview",
  },

  // ── Sarvam (Indian languages) ──
  "sarvam-m": {
    id: "sarvam-m",
    provider: "sarvam",
    apiModelId: "sarvam-m",
    contextWindow: 32_000,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.002,
    description: "Sarvam — optimized for Indian languages",
  },

  // ── Anthropic ──
  "claude-sonnet": {
    id: "claude-sonnet",
    provider: "anthropic",
    apiModelId: "claude-sonnet-4-6",
    contextWindow: 200_000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    description: "Claude Sonnet 4 — balanced reasoning and speed",
  },
};

export type SkillRoute =
  | "intent-classifier"
  | "faq"
  | "booking"
  | "vernacular"
  | "escalation-draft";

export const defaultSkillRouting: Record<SkillRoute, string> = {
  "intent-classifier": "gemini-flash",
  faq: "gemini-flash",
  booking: "gemini-flash",
  vernacular: "sarvam-m",
  "escalation-draft": "claude-sonnet",
};

let runtimeOverrides: Partial<Record<SkillRoute, string>> = {};

export function setSkillRoutingOverrides(overrides: Partial<Record<SkillRoute, string>>) {
  runtimeOverrides = overrides;
}

export function getSkillRoutingOverrides(): Partial<Record<SkillRoute, string>> {
  return { ...runtimeOverrides };
}

export const skillRouting: Record<SkillRoute, string> = new Proxy(
  defaultSkillRouting,
  {
    get(target, prop: string) {
      return runtimeOverrides[prop as SkillRoute] ?? target[prop as SkillRoute];
    },
  },
);

export function getModelForSkill(route: SkillRoute): ModelConfig {
  const modelId = skillRouting[route];
  return models[modelId];
}
