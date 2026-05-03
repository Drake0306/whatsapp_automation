import { describe, it, expect } from "vitest";
import { models, skillRouting, getModelForSkill } from "$lib/config/models.js";

describe("models config", () => {
  it("has all expected models", () => {
    expect(Object.keys(models)).toEqual([
      "gemini-flash",
      "gemini-flash-lite",
      "groq-llama",
      "sarvam-m",
      "claude-sonnet",
    ]);
  });

  it("every model has required fields", () => {
    for (const m of Object.values(models)) {
      expect(m.id).toBeTruthy();
      expect(m.provider).toBeTruthy();
      expect(m.apiModelId).toBeTruthy();
      expect(m.contextWindow).toBeGreaterThan(0);
      expect(typeof m.costPer1kInput).toBe("number");
      expect(typeof m.costPer1kOutput).toBe("number");
    }
  });
});

describe("skillRouting", () => {
  it("maps all routes to existing models", () => {
    for (const [route, modelId] of Object.entries(skillRouting)) {
      expect(models[modelId]).toBeDefined();
    }
  });

  it("intent-classifier uses gemini-flash", () => {
    expect(skillRouting["intent-classifier"]).toBe("gemini-flash");
  });
});

describe("getModelForSkill", () => {
  it("returns correct model for faq", () => {
    const m = getModelForSkill("faq");
    expect(m.id).toBe("gemini-flash");
    expect(m.provider).toBe("gemini");
  });

  it("returns correct model for escalation-draft", () => {
    const m = getModelForSkill("escalation-draft");
    expect(m.provider).toBe("anthropic");
  });
});
