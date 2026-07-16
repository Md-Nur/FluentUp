// ---------------------------------------------------------------------------
// FluentUp — /api/quiz Route Handler
// Generates personalized grammar quizzes using Gemini with DeepSeek fallback.
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { callGeminiQuiz } from "@/lib/gemini";
import type { QuizResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildSystemPrompt(level: string, mistakes: Array<{ original: string; corrected: string }>): string {
  let mistakeContext = "";
  if (mistakes && mistakes.length > 0) {
    mistakeContext = `The user has made these errors in past chats:\n` +
      mistakes.map((m) => `- Wrote "${m.original}" instead of "${m.corrected}"`).join("\n") +
      `\nFocus the quiz question on correcting one of these specific patterns.`;
  } else {
    mistakeContext = `The user has no recorded errors yet. Generate a standard high-yield quiz question suitable for a ${level} English learner.`;
  }

  return `You are Max, a warm and encouraging English language teacher.
Your job is to generate a single multiple-choice grammar or vocabulary quiz question.

CONTEXT:
Level: ${level}
${mistakeContext}

RULES:
1. Provide exactly one question text. Focus on common grammatical pain points (e.g. tenses, prepositions, articles, subject-verb agreement).
2. Provide exactly 3 or 4 options. Make the incorrect options plausible but clearly wrong.
3. correctIndex is the 0-based index of the correct option.
4. Keep the question, options, and explanation clean of any technical linguistic terminology (no "subordinating conjunctions", "gerund versus participle", etc.).
5. Make the explanation warm, encouraging, and clear (1-2 sentences). For example: "Perfect! We say 'interested in' doing something, not 'interested of' 😊".
6. Strictly output JSON matching the required schema.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      level,
      mistakes,
    }: {
      level: string;
      mistakes: Array<{ original: string; corrected: string }>;
    } = body;

    const systemPrompt = buildSystemPrompt(level || "intermediate", mistakes || []);

    // Use centralized function with Gemini → DeepSeek fallback
    const data = await callGeminiQuiz(systemPrompt);

    // Coerce values to guarantee type safety
    const result: QuizResponse = {
      question: String(data.question || "Which sentence is correct?"),
      options: Array.isArray(data.options) ? (data.options as string[]).map(String) : ["Option A", "Option B"],
      correctIndex: typeof data.correctIndex === "number" ? data.correctIndex : 0,
      explanation: String(data.explanation || "That is correct! Great job! 😊"),
    };

    return Response.json(result);
  } catch (error) {
    console.error("Quiz API error (both Gemini and DeepSeek failed):", error);

    // Fallback standard quiz question
    const result: QuizResponse = {
      question: "Which of the following is correct?",
      options: [
        "She doesn't like apples.",
        "She don't likes apples.",
        "She doesn't likes apples.",
      ],
      correctIndex: 0,
      explanation: "Great job! In simple present tense for third-person singular (she/he/it), we use 'doesn't' + base verb for negatives! 😊",
    };

    return Response.json(result);
  }
}
