# FluentUp — Project Context

_Last updated: initial scaffold (create-next-app just run, no features built yet)_

This document is the single source of truth for the project. Any AI model or developer
picking up this codebase should read this file FIRST before writing any code, and should
update it after finishing each feature. Do not rely on memory of past conversations —
rely on this file.

---

## 1. Project Overview

**Name:** FluentUp

**What it is:** A WhatsApp/Messenger-style language learning social app. Users chat 1:1
with an AI teacher ("Max"), get live, encouraging grammar corrections, earn XP, and level
up. Once leveled up, they join a group chat with AI-simulated peers where Max drops in
gamified quiz challenges, and a leaderboard tracks everyone's progress.

**Why it matters / target user:** IELTS aspirants and casual language learners who want
low-pressure, social, encouraging practice — not a clinical grammar checker. Built for a
one-day hackathon (Build With AI Hack Days @RU, powered by Google for Developers / Gemini),
so speed of build and a strong live demo matter as much as feature completeness.

**Core user flow:**
1. Landing screen → user picks a name and a comfort level (Beginner/Intermediate/Advanced)
   via big friendly tappable cards (no forms, no jargon)
2. 1:1 chat with Max → conversational replies + live inline corrections + XP awarded per
   message + streak counter + XP progress bar
3. On crossing an XP threshold → celebratory full-screen "level up" modal → routes to
   group view
4. Group view (`/group/[level]`) → 3-4 AI persona "peers" post messages periodically to
   simulate a live room, Max drops in quiz cards generated from the user's past mistakes,
   a leaderboard sidebar ranks user + personas by XP

**Non-negotiable design constraint:** The entire app must be usable by a non-technical
person with zero onboarding friction. No technical jargon ever appears in user-facing
copy (words like "XP threshold," "session," "mode," "API" are fine as internal code
names, never as UI text). Corrections must always feel encouraging, never clinical.

---

## 2. Tech Stack

- Next.js 14, App Router, TypeScript
- Tailwind CSS
- Google Gemini API (check Google AI Studio for the current recommended model name
  before hardcoding one — model names change)
- No external database — state lives in React state + localStorage for the demo
- Framer Motion allowed for micro-animations if useful
- Target deploy: Vercel

---

## 3. Architecture

### Folder structure
_(update this section as real folders are created — currently just the default
create-next-app scaffold, nothing custom built yet)_

```
/app
  /page.tsx              -> landing screen (name + level picker) [NOT STARTED]
  /chat/page.tsx          -> 1:1 chat with Max [NOT STARTED]
  /group/[level]/page.tsx -> group chat + quiz + leaderboard [NOT STARTED]
  /api/chat/route.ts      -> Gemini call for 1:1 chat + correction [NOT STARTED]
  /api/quiz/route.ts      -> Gemini call to generate quiz question [NOT STARTED]
  /api/persona/route.ts   -> Gemini call to generate AI peer messages [NOT STARTED]
/components
  MessageBubble.tsx   [NOT STARTED]
  XPBar.tsx           [NOT STARTED]
  LeaderboardCard.tsx [NOT STARTED]
  QuizCard.tsx        [NOT STARTED]
  LevelUpModal.tsx    [NOT STARTED]
/lib
  types.ts   -> shared TypeScript interfaces [NOT STARTED]
  gemini.ts  -> Gemini API client helper [NOT STARTED]
CONTEXT.md   -> this file
```

### State management
Plan: React state for in-session data (messages, XP, current screen), localStorage to
persist across refreshes during the demo (name, level, XP total, chat history). No
backend DB. This is a deliberate hackathon shortcut — see Section 6.

---

## 4. Data Shapes (Gemini API contracts)

These are the fixed JSON shapes every Gemini call must return. Keep this section updated
if any shape changes — every API route and every component that consumes it must match.

### `/api/chat` response
```ts
interface ChatResponse {
  reply: string;                 // Max's conversational reply
  had_error: boolean;
  original_snippet: string | null;   // the exact wrong phrase user wrote
  corrected_snippet: string | null;  // the fixed version
  error_type: string | null;         // e.g. "past tense" — secondary label only, never headline
  explanation: string | null;        // short, warm, one-line, non-clinical
  xp_gained: number;
}
```

### `/api/quiz` response
```ts
interface QuizResponse {
  question: string;
  options: string[];       // multiple choice
  correctIndex: number;
  explanation: string;     // shown after answering, encouraging tone
}
```

### `/api/persona` response
```ts
interface PersonaMessage {
  personaName: string;
  message: string;
}
```

### Shared types
To be defined in `/lib/types.ts` once chat is built — include `Message`, `UserProfile`
(name, level, xp, streak), `Persona` (name, avatar, personality description, current xp).

---

## 5. Feature Status Checklist

- [ ] Landing screen (name + level picker, no jargon, big tappable cards)
- [ ] 1:1 chat UI (WhatsApp-style bubbles)
- [ ] `/api/chat` Gemini integration returning strict JSON per shape above
- [ ] Inline correction rendering (strikethrough + green fix + encouraging one-liner)
- [ ] XP system + animated XP toast + persistent XP bar + streak counter
- [ ] Level-up full-screen celebratory modal + route to `/group/[level]`
- [ ] Group chat view UI
- [ ] AI persona periodic messages (`/api/persona`, timer-based ~15-20s)
- [ ] Quiz card in group chat (`/api/quiz`, based on past error patterns)
- [ ] Leaderboard sidebar (user + personas ranked by XP)
- [ ] First-use onboarding hints (e.g. tooltip first time a correction appears)
- [ ] Friendly loading states everywhere ("Max is thinking..." not bare spinners)
- [ ] Visual polish / animations pass
- [ ] Deployed to Vercel

**Build order priority (do not reorder without updating this doc):**
1. 1:1 chat + live correction + XP (the core "wow" feature — get this rock solid first)
2. Level-up transition animation
3. Group view with AI personas messaging periodically
4. Quiz card + leaderboard
5. Visual polish and animations last

---

## 6. Design Decisions & Why

- **No external DB, using localStorage:** one-day solo hackathon build — a real DB adds
  setup time with no demo-visible benefit. Documented shortcut, not a long-term choice.
- **AI personas simulated on a timer instead of real multiplayer/WebSockets:** real-time
  multi-user infra (Socket.io, presence, rooms) is too much scope for a solo one-day
  build. Timer-based Gemini-generated persona messages give the same *visual* effect of
  a live group for the demo. Real multiplayer is explicitly the "roadmap" pitch, not
  today's build.
- **Corrections always framed positively:** clinical/red-pen feedback discourages
  language learners and contradicts the Duolingo-style product vision — this is a
  product requirement, not just a style preference.
- **Strict JSON responses from Gemini:** keeps the frontend simple (one call, one
  parseable shape) rather than doing multiple round trips per message.

---

## 7. Known Limitations / Demo Shortcuts

_(update this list honestly as shortcuts are taken — this protects the demo pitch by
making sure known gaps are framed intentionally, not discovered live by a judge)_

- Group chat peers are simulated via periodic Gemini calls, not real other users.
- No persistent backend — refreshing outside of localStorage state will reset progress.
- Leaderboard persona scores are designed to look plausible, not derived from a real
  scoring simulation engine.
- (Add more here as they come up during the build.)

---

## 8. Environment Setup

- Required env var: `GEMINI_API_KEY` (never hardcode, never commit to git)
- Run locally: `bun run dev`
- Confirm current Gemini model name in Google AI Studio before first API call — do not
  assume a model name from training data, it may be outdated.
- Deploy target: Vercel (set `GEMINI_API_KEY` in Vercel project environment variables)

---

## 9. Instructions for Any Model Continuing This Project

1. Read this entire file before writing any code.
2. Check Section 5 (Feature Status Checklist) to see what's done vs. not started.
3. Follow the build order priority — do not jump ahead to polish before core chat works.
4. After finishing any checklist item, come back and update Section 5, and add any new
   design decisions to Section 6 or shortcuts to Section 7.
5. Never introduce technical jargon into user-facing UI text (see Section 1 constraint).
6. If you change any data shape in Section 4, update it here immediately so the contract
   stays accurate for whoever/whatever reads this next.