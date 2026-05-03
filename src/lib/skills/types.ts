export type Intent =
  | "question"
  | "booking"
  | "reschedule"
  | "cancel"
  | "greeting"
  | "talk_to_owner"
  | "other";

export interface SkillContext {
  businessId: string;
  businessName: string;
  vertical: string;
  language: string;
  customerPhone: string;
  conversationId: string;
  conversationState: Record<string, unknown>;
  tone?: {
    greetingStyle?: string | null;
    formalityLevel: string;
    customInstructions?: string | null;
  } | null;
}

export interface IncomingMessage {
  text: string;
  raw?: unknown;
}

export interface SideEffect {
  type: string;
  payload: Record<string, unknown>;
}

export interface SkillResult {
  reply?: string;
  state?: Record<string, unknown>;
  sideEffects?: SideEffect[];
  confidence: number;
  needsReview?: boolean;
  skillId: string;
}

export interface Skill {
  id: string;
  match: (intent: Intent, ctx: SkillContext) => number;
  handle: (
    msg: IncomingMessage,
    ctx: SkillContext,
  ) => Promise<SkillResult>;
}
