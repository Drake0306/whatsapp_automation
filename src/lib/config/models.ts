export interface ModelConfig {
  id: string;
  provider: "gemini" | "groq" | "sarvam" | "anthropic";
  apiModelId: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const models: Record<string, ModelConfig> = {
  "gemini-flash": {
    id: "gemini-flash",
    provider: "gemini",
    apiModelId: "gemini-2.5-flash",
    contextWindow: 1_000_000,
    costPer1kInput: 0,
    costPer1kOutput: 0,
  },
  "gemini-flash-lite": {
    id: "gemini-flash-lite",
    provider: "gemini",
    apiModelId: "gemini-2.0-flash-lite",
    contextWindow: 1_000_000,
    costPer1kInput: 0,
    costPer1kOutput: 0,
  },
  "groq-llama": {
    id: "groq-llama",
    provider: "groq",
    apiModelId: "llama-3.3-70b-versatile",
    contextWindow: 128_000,
    costPer1kInput: 0.00059,
    costPer1kOutput: 0.00079,
  },
  "sarvam-m": {
    id: "sarvam-m",
    provider: "sarvam",
    apiModelId: "sarvam-m",
    contextWindow: 32_000,
    costPer1kInput: 0.002,
    costPer1kOutput: 0.002,
  },
  "claude-sonnet": {
    id: "claude-sonnet",
    provider: "anthropic",
    apiModelId: "claude-sonnet-4-6",
    contextWindow: 200_000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
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
