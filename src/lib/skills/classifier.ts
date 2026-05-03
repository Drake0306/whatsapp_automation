import { callLlm } from "$lib/server/llm.js";
import { skillRouting } from "$lib/config/models.js";
import type { Intent } from "./types.js";

const VALID_INTENTS: Intent[] = [
  "question",
  "booking",
  "reschedule",
  "cancel",
  "greeting",
  "talk_to_owner",
  "other",
];

const CLASSIFIER_PROMPT = `You are an intent classifier for a WhatsApp business bot.
Given a customer message, classify it into exactly one intent.

Possible intents:
- question: asking about prices, services, hours, availability, or general info
- booking: wants to book/schedule an appointment
- reschedule: wants to change an existing appointment
- cancel: wants to cancel an appointment
- greeting: simple hello/hi/namaste with no specific request
- talk_to_owner: explicitly asks to speak with owner/manager/human
- other: doesn't fit any above

Reply with ONLY the intent word, nothing else.`;

export async function classifyIntent(
  messageText: string,
): Promise<Intent> {
  try {
    const modelId = skillRouting["intent-classifier"];
    const response = await callLlm(modelId, [
      { role: "system", content: CLASSIFIER_PROMPT },
      { role: "user", content: messageText },
    ]);

    const raw = response.text.trim().toLowerCase();
    if (VALID_INTENTS.includes(raw as Intent)) {
      return raw as Intent;
    }

    return "other";
  } catch (err) {
    console.error("[classifier] failed:", err);
    return "other";
  }
}
