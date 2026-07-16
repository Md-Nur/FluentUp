// ---------------------------------------------------------------------------
// FluentUp — Shared TypeScript Interfaces
// These match the data shapes defined in CONTEXT.md Section 4.
// If you change anything here, update CONTEXT.md Section 4 immediately.
// ---------------------------------------------------------------------------

/** Response shape from `/api/chat` — must match CONTEXT.md exactly. */
export interface ChatResponse {
  reply: string; // Max's conversational reply
  had_error: boolean;
  original_snippet: string | null; // the exact wrong phrase user wrote
  corrected_snippet: string | null; // the fixed version
  error_type: string | null; // e.g. "past tense" — secondary label only
  explanation: string | null; // short, warm, one-line, non-clinical
  xp_gained: number;
}

/** Response shape from `/api/quiz` */
export interface QuizResponse {
  question: string;
  options: string[]; // multiple choice
  correctIndex: number;
  explanation: string; // shown after answering, encouraging tone
  targetedPattern?: string | null;
}

export interface MistakeLogEntry {
  error_type: string;
  snippet: string;
  timestamp: number;
}

export interface MistakePattern {
  errorType: string;
  count: number;
  examples: string[];
  lastSeen: number;
}

/** Response shape from `/api/persona` */
export interface PersonaMessage {
  personaName: string;
  message: string;
}

/** A single chat message in the conversation. */
export interface Message {
  id: string;
  sender: "user" | "max" | "priya" | "kenji" | "chloe" | "diego";
  text: string;
  timestamp: number;
  correction?: {
    original_snippet: string;
    corrected_snippet: string;
    error_type: string;
    explanation: string;
  };
  xp_gained?: number;
  quiz?: QuizResponse;
}

/** User profile — persisted in localStorage. */
export interface UserProfile {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  xp: number;
  streak: number;
}

/** AI persona for group chat (Priority 3, defined here for completeness). */
export interface Persona {
  name: string;
  avatar: string;
  personality: string;
  currentXp: number;
}
