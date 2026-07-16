// ---------------------------------------------------------------------------
// FluentUp — Gemini API Client Helper
// Wraps the @google/genai SDK for structured JSON responses.
// ---------------------------------------------------------------------------

import { GoogleGenAI, Type } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Use a fast, capable model. Check Google AI Studio for current recommendations.
const MODEL_NAME = "gemini-2.0-flash";

/**
 * Call Gemini with a system instruction and user prompt, returning parsed JSON.
 * Uses responseSchema to enforce strict JSON output matching our data contracts.
 */
export async function callGeminiChat(
  systemInstruction: string,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "model"; text: string }>
): Promise<Record<string, unknown>> {
  const contents = conversationHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Add the current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const response = await genai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING, description: "Max's conversational reply" },
          had_error: { type: Type.BOOLEAN, description: "Whether the user made a grammar/spelling error" },
          original_snippet: {
            type: Type.STRING,
            description: "The exact wrong phrase user wrote, or null if no error",
            nullable: true,
          },
          corrected_snippet: {
            type: Type.STRING,
            description: "The fixed version of the error, or null if no error",
            nullable: true,
          },
          error_type: {
            type: Type.STRING,
            description: "Brief label like 'past tense' or 'article usage', or null",
            nullable: true,
          },
          explanation: {
            type: Type.STRING,
            description: "Short, warm, encouraging one-line explanation of the fix, or null",
            nullable: true,
          },
          xp_gained: {
            type: Type.NUMBER,
            description: "XP to award for this message (5-15)",
          },
        },
        required: ["reply", "had_error", "original_snippet", "corrected_snippet", "error_type", "explanation", "xp_gained"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return JSON.parse(text);
}
