import type { Skill, SkillContext, IncomingMessage, SkillResult } from "./types.js";
import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import { buildSystemPrompt } from "$lib/server/prompt-templates.js";
import { db } from "$lib/server/db/index.js";
import { businessDocs } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";

async function retrieveRelevantChunks(
  businessId: string,
  query: string,
  limit = 5,
): Promise<string[]> {
  // Simple keyword-based retrieval until we add vector search
  // Fetches all chunks and does naive text matching
  const docs = await db
    .select({ chunkText: businessDocs.chunkText })
    .from(businessDocs)
    .where(eq(businessDocs.businessId, businessId));

  if (docs.length === 0) return [];

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = docs.map((doc) => {
    const lower = doc.chunkText.toLowerCase();
    const matchCount = queryWords.filter((w) => lower.includes(w)).length;
    return { text: doc.chunkText, score: matchCount };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((s) => s.score > 0)
    .map((s) => s.text);
}

export const faqSkill: Skill = {
  id: "faq",

  match(intent) {
    if (intent === "question") return 0.95;
    if (intent === "greeting") return 0.3;
    return 0;
  },

  async handle(msg: IncomingMessage, ctx: SkillContext): Promise<SkillResult> {
    const chunks = await retrieveRelevantChunks(ctx.businessId, msg.text);
    const context = chunks.length > 0
      ? `Knowledge base:\n${chunks.join("\n---\n")}`
      : "No knowledge base documents uploaded yet. Answer based on general knowledge about the business type.";

    const skillContext = `If you don't know the answer, say so honestly and offer to connect them with the owner.\n\n${context}`;
    const systemPrompt = buildSystemPrompt(
      ctx.businessName,
      ctx.vertical,
      ctx.language,
      ctx.tone ?? null,
      skillContext,
    );

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const h of ctx.history.slice(0, -1)) {
      chatMessages.push({
        role: h.role === "customer" ? "user" : "assistant",
        content: h.text,
      });
    }

    chatMessages.push({ role: "user", content: msg.text });

    const modelId = skillRouting["faq"];
    const response = await callLlm(modelId, chatMessages);

    const hasContext = chunks.length > 0;

    return {
      reply: response.text,
      confidence: hasContext ? 0.9 : 0.6,
      skillId: "faq",
    };
  },
};
