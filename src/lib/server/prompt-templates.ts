export interface ToneConfig {
  greetingStyle?: string | null;
  formalityLevel: string;
  customInstructions?: string | null;
}

const FORMALITY_HINTS: Record<string, Record<string, string>> = {
  en: {
    casual: "Talk like a friend. Use simple, short sentences.",
    friendly: "Be warm and professional. Use polite but approachable language.",
    formal: "Use respectful language. Address with sir/madam when appropriate.",
  },
  hi: {
    casual: "Dost jaisi baat karo. Aasan aur chhoti sentences mein bolo.",
    friendly: "Namaste se shuru karo. Pyaar se aur professional tarike se baat karo.",
    formal: "Aap ka use karo. Sir/Madam ke saath respect se baat karo.",
  },
  hinglish: {
    casual: "Mix Hindi and English naturally, like chatting with a friend. Keep it chill.",
    friendly: "Namaste! Mix Hindi-English naturally. Be warm and helpful.",
    formal: "Respectful Hinglish mein baat karo. Aap ka use karo, sir/madam lagao.",
  },
  ta: {
    casual: "Natpana vaarthai pongal. Simple ah pesu.",
    friendly: "Vanakkam! Aandavan polae pesu. Professional aana irukanum.",
    formal: "Mariyaadhaiyaaga pesu. Ungal endru azhaikkaavum.",
  },
  bn: {
    casual: "Bondhur moto kotha bolo. Simple ar chhoto kotha bolo.",
    friendly: "Nomoskar! Bhalobasha diye kotha bolo. Professional thakbe.",
    formal: "Shomman diye kotha bolun. Apni bole sambodhon korun.",
  },
  mr: {
    casual: "Mitraasaarkha bola. Sopa aani lahanshya vakyaat bola.",
    friendly: "Namaskar! Premane bola. Professional asaave.",
    formal: "Aadarane bola. Tumhi asaa sambodhan karaa.",
  },
  te: {
    casual: "Snehitunila maatlaadu. Simple ga, short ga cheppu.",
    friendly: "Namaskaram! Preemaga maatlaadu. Professional ga undu.",
    formal: "Gauravamugtho maatlaadu. Meeru ani sambodhinchandi.",
  },
  kn: {
    casual: "Sneehitana haage maataadu. Simple aagiiru.",
    friendly: "Namaskara! Preethiyinda maataadu. Professional aagiiru.",
    formal: "Gauravadinda maataadu. Neevu endu sambhodhisi.",
  },
};

export function buildSystemPrompt(
  businessName: string,
  vertical: string,
  language: string,
  tone: ToneConfig | null,
  skillContext: string,
): string {
  const lang = language || "en";
  const formality = tone?.formalityLevel || "friendly";
  const formalityHint =
    FORMALITY_HINTS[lang]?.[formality] ??
    FORMALITY_HINTS["en"]?.[formality] ??
    "";

  const langInstruction = {
    en: "Reply in English.",
    hi: "Hindi mein jawab do. Devanagari script mein likho.",
    hinglish:
      "Reply in Hinglish — mix Hindi and English naturally, using Roman script.",
    ta: "Tamil-la pathil sollu. Tamil script-la ezhudhu.",
    bn: "Bangla-te uttor dao. Bangla script-e lekho.",
    mr: "Marathi madhe uttar dya. Devanagari script madhe likha.",
    te: "Telugu lo jawabu cheppu. Telugu script lo rayu.",
    kn: "Kannada-dalli uttara kodi. Kannada script-alli bareyiri.",
  }[lang] ?? "Reply in the customer's language.";

  let prompt = `You are a WhatsApp assistant for "${businessName}" (a ${vertical}).
${langInstruction}
${formalityHint}
Keep replies concise (1-3 sentences). Use WhatsApp formatting (*bold*, _italic_).`;

  if (tone?.greetingStyle) {
    prompt += `\nGreeting style: "${tone.greetingStyle}"`;
  }

  if (tone?.customInstructions) {
    prompt += `\nOwner instructions: ${tone.customInstructions}`;
  }

  if (skillContext) {
    prompt += `\n\n${skillContext}`;
  }

  return prompt;
}
