import { describe, it, expect } from "vitest";
import { extractTextFromPlain, chunkText } from "$lib/server/file-extract.js";

describe("extractTextFromPlain", () => {
  it("decodes UTF-8 buffer to string", () => {
    const text = "Hello, this is a test document.";
    const buf = new TextEncoder().encode(text).buffer;
    expect(extractTextFromPlain(buf)).toBe(text);
  });

  it("handles empty buffer", () => {
    const buf = new ArrayBuffer(0);
    expect(extractTextFromPlain(buf)).toBe("");
  });

  it("handles Hindi text", () => {
    const text = "नमस्ते, यह एक परीक्षण है।";
    const buf = new TextEncoder().encode(text).buffer;
    expect(extractTextFromPlain(buf)).toBe(text);
  });
});

describe("chunkText", () => {
  it("returns empty array for empty text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk for short text", () => {
    const text = "one two three four five";
    const chunks = chunkText(text, 100, 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("splits text into overlapping chunks", () => {
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text, 10, 3);

    expect(chunks.length).toBeGreaterThan(1);

    // First chunk has 10 words
    expect(chunks[0].split(" ")).toHaveLength(10);

    // Chunks overlap by 3 words
    const chunk1Words = chunks[0].split(" ");
    const chunk2Words = chunks[1].split(" ");
    const overlap = chunk1Words.slice(-3);
    expect(chunk2Words.slice(0, 3)).toEqual(overlap);
  });

  it("uses default chunk size and overlap", () => {
    const words = Array.from({ length: 1600 }, (_, i) => `w${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text);
    expect(chunks.length).toBe(3); // 800 + 800 + remaining with overlap
  });
});
