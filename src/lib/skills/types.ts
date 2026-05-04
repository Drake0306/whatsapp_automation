export type Intent =
  | "question"
  | "booking"
  | "reschedule"
  | "cancel"
  | "greeting"
  | "talk_to_owner"
  | "other";

export interface ChatMessage {
  role: "customer" | "bot";
  text: string;
}

export interface SkillContext {
  businessId: string;
  businessName: string;
  vertical: string;
  language: string;
  timezone: string;
  customerPhone: string;
  conversationId: string;
  conversationState: Record<string, unknown>;
  history: ChatMessage[];
  tone?: {
    greetingStyle?: string | null;
    formalityLevel: string;
    customInstructions?: string | null;
  } | null;
}

export interface IncomingMessage {
  text: string;
  raw?: unknown;
  interactiveId?: string;
}

export interface SideEffect {
  type: string;
  payload: Record<string, unknown>;
}

export interface InteractiveListPayload {
  type: "list";
  bodyText: string;
  buttonText: string;
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[];
  headerText?: string;
  footerText?: string;
}

export interface ReplyButtonsPayload {
  type: "buttons";
  bodyText: string;
  buttons: { id: string; title: string }[];
  headerText?: string;
  footerText?: string;
}

export type InteractivePayload = InteractiveListPayload | ReplyButtonsPayload;

export interface SkillResult {
  reply?: string;
  interactive?: InteractivePayload;
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
