// ---------------------------------------------------------------------------
// FluentUp — Smoke / Contract Test Script
// ---------------------------------------------------------------------------
// Run with:  bun test scripts/fluentup.test.ts   (or:  npx tsx scripts/fluentup.test.ts)
//
// Covers:
//   1. Mistake DNA logic (lib/mistakeTracker.ts) — pure, no server needed.
//   2. The three API routes (/api/chat, /api/quiz, /api/persona) — needs a
//      running dev server (bun run dev) AND a valid GEMINI_API_KEY in .env.
//
// Set FLU_BASE=http://localhost:3000 if your server runs elsewhere.
// Set FLU_API_TESTS=0 to skip the live API calls (logic-only run).
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from "bun:test";

import {
  normalizeErrorType,
  addMistakeToLog,
  getMistakeLog,
  getMistakePatterns,
  improveMistakePattern,
  clearMistakeLog,
} from "../lib/mistakeTracker";

import type {
  ChatResponse,
  QuizResponse,
  PersonaMessage,
  MistakePattern,
  UserProfile,
  Message,
} from "../lib/types";

const BASE = process.env.FLU_BASE ?? "http://localhost:3000";
const RUN_API = process.env.FLU_API_TESTS !== "0";

// ---------------------------------------------------------------------------
// Minimal localStorage shim so mistakeTracker works under Bun (Node-like).
// ---------------------------------------------------------------------------
function installLocalStorageShim() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as unknown as { localStorage: typeof ls }).localStorage = ls;
  // The tracker guards on `typeof window === "undefined"`; satisfy that too.
  (globalThis as unknown as { window: { localStorage: typeof ls } }).window = { localStorage: ls };
}

// ---------------------------------------------------------------------------
// 1. Mistake DNA logic tests (pure, deterministic)
// ---------------------------------------------------------------------------
describe("mistakeTracker — normalisation", () => {
  it("lowercases and trims error types", () => {
    expect(normalizeErrorType("  PAST TENSE ")).toBe("past tense");
    expect(normalizeErrorType("Article")).toBe("article");
  });
});

describe("mistakeTracker — log + patterns", () => {
  beforeEach(() => {
    installLocalStorageShim();
    clearMistakeLog();
  });
  afterEach(() => {
    clearMistakeLog();
    (globalThis as unknown as { window?: unknown }).window = undefined;
    (globalThis as unknown as { localStorage?: unknown }).localStorage = undefined;
  });

  it("returns empty log when nothing stored", () => {
    expect(getMistakeLog()).toEqual([]);
  });

  it("adds, persists, and reads back a mistake entry", () => {
    addMistakeToLog("past tense", "I goed to school");
    const log = getMistakeLog();
    expect(log).toHaveLength(1);
    expect(normalizeErrorType(log[0].error_type)).toBe("past tense");
    expect(log[0].snippet).toBe("I goed to school");
    expect(typeof log[0].timestamp).toBe("number");
  });

  it("ignores empty error type or snippet", () => {
    addMistakeToLog("", "x");
    addMistakeToLog("spelling", "   ");
    expect(getMistakeLog()).toHaveLength(0);
  });

  it("aggregates duplicate error types into a pattern with sorted examples", () => {
    addMistakeToLog("articles", "a apple");
    addMistakeToLog("articles", "the cat is happy");
    addMistakeToLog("past tense", "he goed home");
    const patterns = getMistakePatterns();
    expect(patterns).toHaveLength(2);
    const articlePattern = patterns.find((p) => normalizeErrorType(p.errorType) === "articles");
    expect(articlePattern?.count).toBe(2);
    expect(articlePattern?.examples).toContain("a apple");
    expect(articlePattern?.examples).toContain("the cat is happy");
  });

  it("sorts patterns by count desc, then recency desc", () => {
    addMistakeToLog("spelling", "recieve");
    addMistakeToLog("articles", "a dog");
    addMistakeToLog("articles", "an cat");
    addMistakeToLog("articles", "the book");
    const patterns = getMistakePatterns();
    expect(normalizeErrorType(patterns[0].errorType)).toBe("articles");
    expect(patterns[0].count).toBe(3);
  });

  it("improveMistakePattern removes the oldest entry and lowers count", () => {
    addMistakeToLog("prepositions", "on the bus");
    addMistakeToLog("prepositions", "in Monday");
    expect(getMistakePatterns().find((p) => normalizeErrorType(p.errorType) === "prepositions")?.count).toBe(2);
    const ok = improveMistakePattern("Prepositions");
    expect(ok).toBe(true);
    expect(getMistakePatterns().find((p) => normalizeErrorType(p.errorType) === "prepositions")?.count).toBe(1);
  });

  it("improveMistakePattern returns false for unknown pattern", () => {
    expect(improveMistakePattern("nonexistent")).toBe(false);
  });

  it("clearMistakeLog wipes storage", () => {
    addMistakeToLog("spelling", "teh");
    clearMistakeLog();
    expect(getMistakeLog()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Contract / shape validation helpers
// ---------------------------------------------------------------------------
function assertChatShape(r: unknown): asserts r is ChatResponse {
  const v = r as Record<string, unknown>;
  expect(typeof v.reply).toBe("string");
  expect(typeof v.had_error).toBe("boolean");
  expect(v.original_snippet === null || typeof v.original_snippet === "string").toBe(true);
  expect(v.corrected_snippet === null || typeof v.corrected_snippet === "string").toBe(true);
  expect(v.error_type === null || typeof v.error_type === "string").toBe(true);
  expect(v.explanation === null || typeof v.explanation === "string").toBe(true);
  expect(typeof v.xp_gained).toBe("number");
}

function assertQuizShape(r: unknown): asserts r is QuizResponse {
  const v = r as Record<string, unknown>;
  expect(typeof v.question).toBe("string");
  expect(Array.isArray(v.options)).toBe(true);
  expect((v.options as string[]).every((o) => typeof o === "string")).toBe(true);
  expect((v.options as string[]).length).toBeGreaterThanOrEqual(3);
  expect((v.options as string[]).length).toBeLessThanOrEqual(4);
  expect(typeof v.correctIndex).toBe("number");
  expect(v.correctIndex).toBeGreaterThanOrEqual(0);
  expect(v.correctIndex).toBeLessThan((v.options as string[]).length);
  expect(typeof v.explanation).toBe("string");
  expect(typeof v.targetedPattern === "string" || v.targetedPattern === null || v.targetedPattern === undefined).toBe(true);
}

function assertPersonaShape(r: unknown): asserts r is PersonaMessage {
  const v = r as Record<string, unknown>;
  expect(typeof v.personaName).toBe("string");
  expect(typeof v.message).toBe("string");
  expect(["Priya", "Kenji", "Chloe", "Diego"]).toContain(v.personaName);
}

// ---------------------------------------------------------------------------
// 3. Live API tests (only run when FLU_API_TESTS !== "0" and server is up)
// ---------------------------------------------------------------------------
describe("API routes (live)", () => {
  const profile: UserProfile = { name: "Test", level: "beginner", xp: 0, streak: 1 };
  const history: Message[] = [];

  it("POST /api/chat returns a valid ChatResponse", async () => {
    if (!RUN_API) return;
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "yesterday I goed to the park", history, userProfile: profile }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    assertChatShape(body);
    expect(body.had_error).toBe(true);
  });

  it("POST /api/chat 400s on missing fields", async () => {
    if (!RUN_API) return;
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/quiz returns a valid QuizResponse (no prior mistakes)", async () => {
    if (!RUN_API) return;
    const res = await fetch(`${BASE}/api/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: "intermediate", mistakes: [], mistakePatterns: [] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    assertQuizShape(body);
  });

  it("POST /api/quiz targets the top Mistake DNA pattern", async () => {
    if (!RUN_API) return;
    const patterns: MistakePattern[] = [
      { errorType: "articles", count: 4, examples: ["a apple"], lastSeen: Date.now() },
    ];
    const res = await fetch(`${BASE}/api/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: "beginner", mistakes: [], mistakePatterns: patterns }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    assertQuizShape(body);
    expect(body.targetedPattern).toBeTruthy();
  });

  it("POST /api/persona returns a valid PersonaMessage", async () => {
    if (!RUN_API) return;
    const res = await fetch(`${BASE}/api/persona`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: "intermediate", history: [], lastSpeaker: "Priya" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    assertPersonaShape(body);
    expect(body.personaName).not.toBe("Priya");
  });
});
