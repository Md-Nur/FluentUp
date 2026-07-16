// ---------------------------------------------------------------------------
// FluentUp — /api/persona Route Handler
// Generates messages from AI peer personas in the group chat.
// ---------------------------------------------------------------------------

import { NextRequest } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import type { PersonaMessage } from "@/lib/types";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL_NAME = "gemini-2.0-flash";

export const dynamic = "force-dynamic";

interface PersonaConfig {
  name: string;
  emoji: string;
  country: string;
  personality: string;
  style: string;
}

const PERSONAS: Record<string, PersonaConfig> = {
  Priya: {
    name: "Priya",
    emoji: "🇮🇳",
    country: "India",
    personality: "Very warm, bubbly, enthusiastic, uses lots of emojis, loves connecting with people.",
    style: "Friendly and highly interactive. Uses conversational phrases like 'Oh!', 'Hey guys!', 'That's so interesting!'. Often asks follow-up questions to keep the chat going.",
  },
  Kenji: {
    name: "Kenji",
    emoji: "🇯🇵",
    country: "Japan",
    personality: "Humble, polite, slightly formal but very sweet. Eager to practice for a new job opportunity.",
    style: "Respectful and thoughtful. Sometimes uses simpler sentences. Shares Japanese culture elements (like food or Tokyo life) and uses polite expressions like 'Thank you for sharing' or 'That is very helpful.'",
  },
  Chloe: {
    name: "Chloe",
    emoji: "🇫🇷",
    country: "France",
    personality: "Chic, artistic, casual, expressive. Loves cafes, fashion, and talking about movies.",
    style: "Expressive and modern. Occasionally drops in a light French phrase like 'Bonjour!' or 'Ah, c'est super!'. Speaks naturally about everyday art, food, and design.",
  },
  Diego: {
    name: "Diego",
    emoji: "🇲🇽",
    country: "Mexico",
    personality: "Energetic, sporty, highly encouraging, loves talking about football (soccer) and music.",
    style: "Upbeat and highly encouraging. Uses terms like 'Amigo!', 'Let's do this!', 'Amazing job!'. Very enthusiastic about physical activity, sports, and food.",
  },
};

function buildSystemPrompt(level: string, speakingPersona: PersonaConfig): string {
  const levelDescriptions = {
    beginner:
      "The language of this group is for Beginner English learners. Keep vocabulary very simple. Use short sentences. Emojis are encouraged.",
    intermediate:
      "The language of this group is for Intermediate English learners. Use natural conversational vocabulary with some moderate idioms, but keep it accessible.",
    advanced:
      "The language of this group is for Advanced English learners. Use rich vocabulary, phrasal verbs, natural idioms, and more complex sentence structures.",
  };

  return `You are simulating a member of a group English learning chat room.
Your name is ${speakingPersona.name} from ${speakingPersona.country}.

YOUR BACKGROUND AND PERSONALITY:
- Personality: ${speakingPersona.personality}
- Speaking Style: ${speakingPersona.style}

GROUP LANGUAGE DIFFICULTY:
${levelDescriptions[level as keyof typeof levelDescriptions] || levelDescriptions.intermediate}

RULES FOR YOUR MESSAGE:
1. Respond naturally to the conversation history. You can comment on what the user or other peers said.
2. Keep your message short (1-3 sentences). It's a text chat room, so long paragraphs look fake and boring.
3. Keep the tone warm, welcoming, and supportive. You are all learning English together.
4. Speak ONLY as ${speakingPersona.name}. Do not output any meta-commentary or prefix the message with your name.
5. Your output must strictly match the JSON schema.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      level,
      history,
      lastSpeaker,
    }: {
      level: string;
      history: Array<{ sender: string; text: string }>;
      lastSpeaker?: string;
    } = body;

    // Pick a speaker that wasn't the last speaker
    const candidates = Object.keys(PERSONAS).filter((p) => p !== lastSpeaker);
    const chosenName = candidates[Math.floor(Math.random() * candidates.length)] || "Priya";
    const speakingPersona = PERSONAS[chosenName];

    const systemPrompt = buildSystemPrompt(level, speakingPersona);

    // Format chat history for Gemini input
    const formattedHistory = (history || []).slice(-8).map((msg) => ({
      role: msg.sender === "user" ? ("user" as const) : ("model" as const),
      text: `${msg.sender}: ${msg.text}`,
    }));

    const response = await genai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        ...formattedHistory.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
        {
          role: "user",
          parts: [{ text: `Generate the next message in the chat from ${speakingPersona.name}.` }],
        },
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personaName: { type: Type.STRING, description: "Must be exactly: " + speakingPersona.name },
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

    const data = JSON.parse(text);

    const result: PersonaMessage = {
      personaName: speakingPersona.name,
      message: data.message || "Hey everyone! Let's keep practicing!",
    };

    return Response.json(result);
  } catch (error) {
    console.error("Persona API error:", error);

    // Dynamic fallback so the simulation never breaks
    const fallbacks = [
      { name: "Priya", text: "This is such a fun group chat! I love practicing with you all! 😊" },
      { name: "Kenji", text: "English is challenging but practicing together makes it much better. Thank you." },
      { name: "Chloe", text: "Oui! Let's keep writing and talking. It is the best way to learn!" },
      { name: "Diego", text: "Let's keep going guys! We are doing amazing! ⚽️🔥" },
    ];
    const picked = fallbacks[Math.floor(Math.random() * fallbacks.length)]!;

    const result: PersonaMessage = {
      personaName: picked.name,
      message: picked.text,
    };
    return Response.json(result);
  }
}
