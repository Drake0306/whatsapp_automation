import { models, type ModelConfig } from "$lib/config/models.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  text: string;
  modelId: string;
  usage?: { inputTokens: number; outputTokens: number };
}

async function callGemini(
  model: ModelConfig,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const systemInstruction = messages.find((m) => m.role === "system");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.apiModelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const usage = data.usageMetadata;

  return {
    text,
    modelId: model.id,
    usage: usage
      ? {
          inputTokens: usage.promptTokenCount ?? 0,
          outputTokens: usage.candidatesTokenCount ?? 0,
        }
      : undefined,
  };
}

async function callGroq(
  model: ModelConfig,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.apiModelId,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    modelId: model.id,
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
        }
      : undefined,
  };
}

async function callAnthropic(
  model: ModelConfig,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const system = messages.find((m) => m.role === "system")?.content;
  const filtered = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model: model.apiModelId,
    max_tokens: 1024,
    messages: filtered,
  };
  if (system) body.system = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text =
    data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";

  return {
    text,
    modelId: model.id,
    usage: data.usage
      ? {
          inputTokens: data.usage.input_tokens ?? 0,
          outputTokens: data.usage.output_tokens ?? 0,
        }
      : undefined,
  };
}

async function callSarvam(
  model: ModelConfig,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("SARVAM_API_KEY not set");

  const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.apiModelId,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sarvam error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    modelId: model.id,
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens ?? 0,
          outputTokens: data.usage.completion_tokens ?? 0,
        }
      : undefined,
  };
}

const PROVIDER_HANDLERS: Record<
  string,
  (model: ModelConfig, messages: LlmMessage[]) => Promise<LlmResponse>
> = {
  gemini: callGemini,
  groq: callGroq,
  anthropic: callAnthropic,
  sarvam: callSarvam,
};

export async function callLlm(
  modelId: string,
  messages: LlmMessage[],
): Promise<LlmResponse> {
  const model = models[modelId];
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  const handler = PROVIDER_HANDLERS[model.provider];
  if (!handler) throw new Error(`No handler for provider: ${model.provider}`);

  return handler(model, messages);
}
