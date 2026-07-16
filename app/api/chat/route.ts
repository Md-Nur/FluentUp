// ---------------------------------------------------------------------------
// FluentUp — /api/chat Route Handler
// Handles 1:1 chat with Max. Returns strict JSON per CONTEXT.md Section 4.
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { callGeminiChat } from "@/lib/gemini";
import type { ChatResponse, Message, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildSystemPrompt(profile: UserProfile): string {
  const levelDescriptions = {
    beginner:
      "The user is a beginner English learner. Use simple vocabulary and short sentences. Be extra patient and encouraging. Focus on basic grammar (articles, tenses, subject-verb agreement). Celebrate even small correct usage.",
    intermediate:
      "The user is an intermediate English learner. Use moderately complex vocabulary. Be encouraging and supportive. Focus on tense consistency, prepositions, idioms, and sentence structure. Push them gently to try more complex expressions.",
    advanced:
      "The user is an advanced English learner preparing for exams like IELTS. Use natural, fluent English. Focus on nuanced grammar (conditionals, passive voice, collocations), academic vocabulary, and natural phrasing. Be encouraging but subtly challenging.",
  };

  return `You are Max, a warm and friendly English language teacher in a chat app called FluentUp. You're chatting 1-on-1 with ${profile.name}.

YOUR PERSONALITY:
- You're enthusiastic, supportive, and genuinely interested in helping
- You chat like a friendly tutor, not a textbook — use casual, warm language
- You NEVER use technical jargon in your replies (no "syntax", "morphology", etc.)
- When the user makes an error, you gently point it out with encouragement — NEVER be clinical or harsh
- You celebrate progress and good sentences
- You keep conversations engaging by asking follow-up questions

USER'S LEVEL:
${levelDescriptions[profile.level]}

CORRECTION RULES:
- Check the user's message for grammar, spelling, or usage errors
- If there IS an error:
  - Set had_error to true
  - Pick the MOST important single error (don't overwhelm with multiple corrections)
  - Set original_snippet to the EXACT wrong phrase from the user's message
  - Set corrected_snippet to the fixed version
  - Set error_type to a simple, short label (e.g. "past tense", "article", "spelling")
  - Set explanation to a SHORT, WARM, encouraging one-liner (e.g. "Almost perfect! For things that already happened, we use 'went' instead of 'goed' 😊")
  - Award xp_gained between 8-12 (they still learn from mistakes!)
- If there is NO error:
  - Set had_error to false
  - Set original_snippet, corrected_snippet, error_type, and explanation to null
  - Award xp_gained between 10-15 (reward correct usage!)

REPLY RULES:
- Your reply should be conversational and respond to what the user said
- Keep replies 1-3 sentences — this is a chat, not an essay
- Ask a follow-up question to keep the conversation going
- Do NOT repeat the correction in your reply text — the correction fields handle that separately
- Match the user's energy — if they're excited, be excited back!

Current streak: ${profile.streak} messages. ${profile.streak >= 3 ? "Mention how great their streak is!" : ""}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      history,
      userProfile,
    }: {
      message: string;
      history: Message[];
      userProfile: UserProfile;
    } = body;

    if (!message || !userProfile) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build conversation history for context (filtering to user and max messages only, Bug #7)
    const conversationHistory = (history || [])
      .filter((msg) => msg.sender === "user" || msg.sender === "max")
      .slice(-10)
      .map((msg) => ({
        role: msg.sender === "user" ? ("user" as const) : ("model" as const),
        text: msg.text,
      }));

    const systemPrompt = buildSystemPrompt(userProfile);

    const result = await callGeminiChat(
      systemPrompt,
      message,
      conversationHistory
    );

    // Validate and coerce the response to match ChatResponse shape
    const chatResponse: ChatResponse = {
      reply: String(result.reply || "Hey! I'm having a little trouble right now, but let's keep chatting! 😊"),
      had_error: Boolean(result.had_error),
      original_snippet: result.original_snippet ? String(result.original_snippet) : null,
      corrected_snippet: result.corrected_snippet ? String(result.corrected_snippet) : null,
      error_type: result.error_type ? String(result.error_type) : null,
      explanation: result.explanation ? String(result.explanation) : null,
      xp_gained: Number(result.xp_gained) || 10,
    };

    return Response.json(chatResponse);
  } catch (error) {
    console.error("Chat API error:", error);

    // Return a friendly fallback — never show raw errors to users
    const fallback: ChatResponse = {
      reply: "Hmm, I got a bit confused there! 😅 Could you say that again? I want to make sure I understand you perfectly!",
      had_error: false,
      original_snippet: null,
      corrected_snippet: null,
      error_type: null,
      explanation: null,
      xp_gained: 5,
    };

    return Response.json(fallback);
  }
}
