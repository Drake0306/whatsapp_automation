import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";

describe("buildSystemPrompt", () => {
  it("builds basic English prompt", () => {
    const result = buildSystemPrompt("Test Salon", "salon", "en", null, "");
    expect(result).toContain("Test Salon");
    expect(result).toContain("salon");
    expect(result).toContain("Reply in English");
  });

  it("includes Hindi instruction for hi language", () => {
    const result = buildSystemPrompt("Test Clinic", "clinic", "hi", null, "");
    expect(result).toContain("Hindi mein jawab do");
  });

  it("includes Hinglish instruction", () => {
    const result = buildSystemPrompt("Test", "salon", "hinglish", null, "");
    expect(result).toContain("Hinglish");
  });

  it("includes tone config when provided", () => {
    const tone = {
      greetingStyle: "Namaste ji!",
      formalityLevel: "formal",
      customInstructions: "Always say thank you",
    };
    const result = buildSystemPrompt("Salon", "salon", "en", tone, "");
    expect(result).toContain("Namaste ji!");
    expect(result).toContain("Always say thank you");
    expect(result).toContain("sir/madam");
  });

  it("includes skill context", () => {
    const result = buildSystemPrompt("Salon", "salon", "en", null, "Customer wants a booking.");
    expect(result).toContain("Customer wants a booking.");
  });

  it("falls back to English formality hints for unknown language", () => {
    const result = buildSystemPrompt("Shop", "retail", "unknown_lang", null, "");
    expect(result).toContain("Shop");
    // Should not crash, should fall back gracefully
  });
});
