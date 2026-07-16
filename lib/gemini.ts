// ---------------------------------------------------------------------------
// FluentUp — LLM Client Helper (Gemini with DeepSeek Fallback)
// Wraps the @google/genai SDK and falls back to DeepSeek API if Gemini fails.
// ---------------------------------------------------------------------------

import { GoogleGenAI, Type } from "@google/genai";

const MODEL_NAME = "gemini-2.0-flash";

// ---------------------------------------------------------------------------
// Bug #6: Lazy-init the Gemini client so a missing key causes a clear per-
// request 500 instead of crashing the entire module at import time.
// ---------------------------------------------------------------------------
let _genai: GoogleGenAI | null = null;
function getGenai(): GoogleGenAI {
  if (!_genai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to your .env.local file."
      );
    }
    _genai = new GoogleGenAI({ apiKey });
  }
  return _genai;
}

/**
 * Clean Markdown formatting (e.g. ```json ... ```) from a string if present.
 */
function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith("```")) {
    // Bug #2: strip the opening fence whether or not a newline follows the language tag
    cleaned = cleaned.replace(/^```[a-zA-Z]*\r?\n?/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/```$/, "");
  }
  return cleaned.trim();
}

/**
 * Call DeepSeek API with a system instruction and user prompt, returning parsed JSON.
 */
async function callDeepSeek(
  systemInstruction: string,
  userMessage: string | null,
  conversationHistory: Array<{ role: "user" | "model"; text: string }>,
  schema: Record<string, any>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured in environment variables.");
  }

  // Format messages for DeepSeek (OpenAI compatible format)
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  // 1. System Prompt with strict JSON formatting instruction
  const enhancedSystemInstruction = `${systemInstruction}\n\nIMPORTANT: Your response MUST be a valid JSON object matching the JSON schema below. Do not wrap the response in markdown code blocks (\`\`\`json) or write any surrounding text. Output only the raw JSON.\n\nSchema:\n${JSON.stringify(schema, null, 2)}`;
  
  messages.push({
    role: "system",
    content: enhancedSystemInstruction,
  });

  // 2. Add history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.text,
    });
  }

  // 3. Add current user message if present
  if (userMessage) {
    messages.push({
      role: "user",
      content: userMessage,
    });
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown DeepSeek error");
    throw new Error(`DeepSeek API failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error("DeepSeek returned an empty response.");
  }

  const cleanedText = cleanJsonString(rawText);
  return JSON.parse(cleanedText);
}

/**
 * Call Gemini with a system instruction and user prompt, returning parsed JSON.
 * Falls back to DeepSeek if Gemini fails.
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

  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const chatSchema = {
    type: "object",
    properties: {
      reply: { type: "string", description: "Max's conversational reply" },
      had_error: { type: "boolean", description: "Whether the user made a grammar/spelling error" },
      original_snippet: {
        type: "string",
        description: "The exact wrong phrase user wrote, or null if no error",
        nullable: true,
      },
      corrected_snippet: {
        type: "string",
        description: "The fixed version of the error, or null if no error",
        nullable: true,
      },
      error_type: {
        type: "string",
        description: "Brief label like 'past tense' or 'article usage', or null",
        nullable: true,
      },
      explanation: {
        type: "string",
        description: "Short, warm, encouraging one-line explanation of the fix, or null",
        nullable: true,
      },
      xp_gained: {
        type: "number",
        description: "XP to award for this message (5-15)",
      },
    },
    required: ["reply", "had_error", "original_snippet", "corrected_snippet", "error_type", "explanation", "xp_gained"],
  };

  try {
    const response = await getGenai().models.generateContent({
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
    return JSON.parse(cleanJsonString(text));
  } catch (geminiError) {
    console.warn("Gemini Chat API call failed, attempting DeepSeek fallback...", geminiError);
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn("DEEPSEEK_API_KEY is not configured. Skipping fallback.");
      throw geminiError;
    }
    try {
      return await callDeepSeek(systemInstruction, userMessage, conversationHistory, chatSchema);
    } catch (deepseekError) {
      console.error("Both Gemini and DeepSeek Chat calls failed:", deepseekError);
      throw deepseekError;
    }
  }
}

/**
 * Call LLM to generate group chat persona messages, returning parsed JSON.
 * Falls back to DeepSeek if Gemini fails.
 */
export async function callGeminiPersona(
  systemInstruction: string,
  conversationHistory: Array<{ role: "user" | "model"; text: string }>,
  speakingPersonaName: string
): Promise<Record<string, unknown>> {
  const contents = conversationHistory.map((h) => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));

  const userMessage = `Generate the next message in the chat from ${speakingPersonaName}.`;
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const personaSchema = {
    type: "object",
    properties: {
      personaName: { type: "string", description: "Must be exactly: " + speakingPersonaName },
      message: { type: "string", description: "The message text generated for this persona." },
    },
    required: ["personaName", "message"],
  };

  try {
    const response = await getGenai().models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personaName: { type: Type.STRING, description: "Must be exactly: " + speakingPersonaName },
            message: { type: Type.STRING, description: "The message text generated for this persona." },
          },
          required: ["personaName", "message"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return JSON.parse(cleanJsonString(text));
  } catch (geminiError) {
    console.warn("Gemini Persona API call failed, attempting DeepSeek fallback...", geminiError);
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn("DEEPSEEK_API_KEY is not configured. Skipping fallback.");
      throw geminiError;
    }
    try {
      return await callDeepSeek(systemInstruction, userMessage, conversationHistory, personaSchema);
    } catch (deepseekError) {
      console.error("Both Gemini and DeepSeek Persona calls failed:", deepseekError);
      throw deepseekError;
    }
  }
}

/**
 * Call LLM to generate personalized quiz questions, returning parsed JSON.
 * Falls back to DeepSeek if Gemini fails.
 */
export async function callGeminiQuiz(
  systemInstruction: string
): Promise<Record<string, unknown>> {
  const userMessage = "Generate a personalized multiple choice quiz question.";
  const contents = [
    {
      role: "user" as const,
      parts: [{ text: userMessage }],
    },
  ];

  const quizSchema = {
    type: "object",
    properties: {
      question: { type: "string", description: "The quiz question text." },
      options: {
        type: "array",
        items: { type: "string" },
        description: "The options list (3 or 4 choices).",
      },
      correctIndex: { type: "number", description: "The 0-based index of the correct choice." },
      explanation: { type: "string", description: "Warm, encouraging one-liner explaining why the choice is correct." },
      targetedPattern: { type: "string", description: "The name of the mistake pattern targeted (e.g. 'articles', 'past tense'), or empty string if none." },
    },
    required: ["question", "options", "correctIndex", "explanation", "targetedPattern"],
  };

  try {
    const response = await getGenai().models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING, description: "The quiz question text." },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The options list (3 or 4 choices).",
            },
            correctIndex: { type: Type.NUMBER, description: "The 0-based index of the correct choice." },
            explanation: { type: Type.STRING, description: "Warm, encouraging one-liner explaining why the choice is correct." },
            targetedPattern: { type: Type.STRING, description: "The name of the mistake pattern targeted, or empty string if none." },
          },
          required: ["question", "options", "correctIndex", "explanation", "targetedPattern"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return JSON.parse(cleanJsonString(text));
  } catch (geminiError) {
    console.warn("Gemini Quiz API call failed, attempting DeepSeek fallback...", geminiError);
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn("DEEPSEEK_API_KEY is not configured. Skipping fallback.");
      throw geminiError;
    }
    try {
      return await callDeepSeek(systemInstruction, userMessage, [], quizSchema);
    } catch (deepseekError) {
      console.error("Both Gemini and DeepSeek Quiz calls failed:", deepseekError);
      throw deepseekError;
    }
  }
}
