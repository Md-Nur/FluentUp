import { NextRequest } from "next/server";
import { callGeminiQuiz } from "@/lib/gemini";
import type { QuizResponse, MistakePattern } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildSystemPrompt(
  level: string,
  mistakes: Array<{ original: string; corrected: string }>,
  mistakePatterns: MistakePattern[]
): string {
  let mistakeContext = "";
  let targetPatternStr = "";

  if (mistakePatterns && mistakePatterns.length > 0) {
    const topPattern = mistakePatterns[0];
    targetPatternStr = topPattern.errorType;
    const patternDetails = mistakePatterns
      .map((p) => `- Pattern "${p.errorType}" (seen ${p.count} times, examples: ${p.examples.slice(0, 3).join(", ")})`)
      .join("\n");
    
    mistakeContext = `The user's Mistake DNA profile shows the following top weak points:\n${patternDetails}\n\nStrictly target the quiz question to drill the user's top mistake pattern: "${topPattern.errorType}". Build a question specifically around this concept. Make sure to return "${topPattern.errorType}" in the 'targetedPattern' JSON field.`;
  } else if (mistakes && mistakes.length > 0) {
    mistakeContext = `The user has made these errors in past chats:\n` +
      mistakes.map((m) => `- Wrote "${m.original}" instead of "${m.corrected}"`).join("\n") +
      `\nFocus the quiz question on correcting one of these specific patterns. Make sure to identify the simple name of the pattern in the 'targetedPattern' JSON field (e.g. 'articles', 'past tense', etc.).`;
  } else {
    mistakeContext = `The user has no recorded errors yet. Generate a standard high-yield quiz question suitable for a ${level} English learner. Set 'targetedPattern' to an empty string in this case.`;
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
6. Strictly output JSON matching the required schema. Ensure the 'targetedPattern' field matches the pattern you focused on (e.g., "${targetPatternStr || "articles"}"), or is empty string if none.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      level,
      mistakes,
      mistakePatterns,
    }: {
      level: string;
      mistakes: Array<{ original: string; corrected: string }>;
      mistakePatterns: MistakePattern[];
    } = body;

    const systemPrompt = buildSystemPrompt(
      level || "intermediate",
      mistakes || [],
      mistakePatterns || []
    );

    // Use centralized function with Gemini → DeepSeek fallback
    const data = await callGeminiQuiz(systemPrompt);

    // Coerce values to guarantee type safety
    const result: QuizResponse = {
      question: String(data.question || "Which sentence is correct?"),
      options: Array.isArray(data.options) ? (data.options as string[]).map(String) : ["Option A", "Option B"],
      correctIndex: typeof data.correctIndex === "number" ? data.correctIndex : 0,
      explanation: String(data.explanation || "That is correct! Great job! 😊"),
      targetedPattern: data.targetedPattern ? String(data.targetedPattern) : "",
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
      targetedPattern: "",
    };

    return Response.json(result);
  }
}
