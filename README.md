# FluentUp — Our Story

_Last updated: 2026-07-16 — Mistake DNA feature complete_

## 💡 Inspiration

Language learning apps have a retention problem. Most people who download Duolingo quit within a week — not because they stop wanting to learn, but because the experience stops feeling *human*. You're drilling flashcards. You're tapping owls. You're never actually *talking* to anyone.

The real way humans learn to speak a language is through conversation — messy, imperfect, socially-motivated conversation. A student who chats with a native speaker for 30 minutes learns more than one who studies grammar tables for 3 hours. We kept asking ourselves: **what if an app could replicate that social friction, that gentle nudge from a patient friend, at scale — for free, for anyone?**

That question became FluentUp.

We were also inspired by the anxiety specific to IELTS aspirants in South Asia. These are often working adults or students preparing for a high-stakes exam. They desperately need conversational practice, but hiring a tutor is expensive and practicing with strangers is intimidating. They need a space that is **low-pressure, encouraging, and always available** — which is exactly what a well-prompted AI can be.

But there was a second, deeper question that emerged during the build: **what separates a language learning app from a grammar checker?** A grammar checker fixes your sentence and forgets you. A real teacher remembers. They notice that you always confuse past tense, that you consistently drop articles, that prepositions trip you up every time. That *pattern recognition over time* is what makes a teacher transformative — and it became the seed for our signature feature: **Mistake DNA**.

---

## 🔨 How We Built It

FluentUp was built in a single day at **Build With AI Hack Days @RU**, powered by Google for Developers and Gemini.

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components + API routes in one project |
| Language | TypeScript | Catches shape mismatches between Gemini responses and UI |
| AI | Google Gemini API | Gemini's instruction-following and JSON-mode make it ideal for structured educational feedback |
| State | React state + `localStorage` | Zero backend setup, persists across demo refreshes |
| Animations | Framer Motion | Celebratory level-up modal, XP toasts |
| Deploy | Vercel | One-click, zero config |

### Architecture

The app has three distinct phases, each backed by a dedicated Gemini API route:

1. **`/api/chat`** — Powers the 1:1 conversation with Max. Every user message returns a strict JSON payload containing Max's reply, an optional inline correction (`original_snippet` → `corrected_snippet`), a warm one-line explanation, and XP awarded.

2. **`/api/persona`** — On a timer (~15–20 s), generates messages from AI-simulated group peers (each with a distinct personality) to make the group room feel alive without real multiplayer infrastructure.

3. **`/api/quiz`** — Generates multiple-choice questions seeded from the user's own **Mistake DNA** — their most frequent and recent error patterns — so every quiz feels personally targeted, not generic.

### The XP System

XP is awarded per message sent, with a small bonus for error-free messages. The level-up threshold was tuned so a typical user hits it after roughly 10–15 exchanges — long enough to feel earned, short enough for a demo:

$$
\text{XP}_{\text{message}} = \begin{cases} 15 & \text{if no grammar error detected} \\ 10 & \text{otherwise} \end{cases}
$$

The leaderboard ranks the user against AI personas whose scores follow a smooth growth curve calibrated to feel competitive but beatable:

$$
\text{XP}_{\text{persona}}(t) = \lfloor X_0 + k \cdot \ln(1 + t) \rfloor
$$

where $X_0$ is their starting score, $k$ is a persona-specific aggression constant, and $t$ is elapsed time in seconds.

### Mistake DNA — The Signature Feature

Every grammar correction Max makes is silently logged client-side into a `MistakeLogEntry`:

```ts
interface MistakeLogEntry {
  error_type: string;   // e.g. "past tense", "article usage"
  snippet:    string;   // the exact wrong phrase
  timestamp:  number;
}
```

`/lib/mistakeTracker.ts` aggregates these logs into `MistakePattern` objects — grouping by `error_type`, counting frequency, and surfacing the most recent examples:

```ts
interface MistakePattern {
  errorType: string;
  count:     number;
  examples:  string[];
  lastSeen:  number;
}
```

These patterns are visualised in `MistakeDNACard.tsx` as a **double-helix themed fingerprint card** — a premium visual that makes the user's personal learning profile tangible and shareable. Crucially, the top patterns are passed directly into the `/api/quiz` prompt, so Max's quiz questions target *exactly* what the user keeps getting wrong. As the user improves, the DNA updates dynamically.

---

## 🔧 Hardening & Polish Pass

After the core build was complete, we ran a dedicated hardening pass to make the app demo-proof. Every issue that could embarrass us in front of a judge was hunted down and fixed.

### Bug Fixes

| # | Issue | Fix |
|---|---|---|
| 1 | **Long message overflow** | Added `overflow-wrap: anywhere` to message bubbles — no more text bleeding outside the chat window |
| 2 | **Race condition / duplicate XP** | `isLoading` flag prevents concurrent sends; verified no double-credit edge cases |
| 3 | **Peer timer instability** | Refactored group `useEffect` to use a `messagesRef` so the interval is stable and doesn't restart on every new message |
| 4 | **Level-up modal re-triggering on refresh** | `flu-has-redirected` key persisted to `localStorage` — a hard refresh no longer re-plays the celebration |
| 5 | **Gemini JSON parse safety** | `cleanJsonString()` now applied to all three Gemini paths (`/chat`, `/persona`, `/quiz`); nested `try/catch` around every `response.json()` |
| 6 | **Loading indicator flash** | Typing indicator gated behind a 500 ms `setTimeout` — fast API responses never cause a visual flicker |
| 7 | **Mobile layout at 375 px** | Level badge hidden on narrow screens, XP bar padding tightened, send button guaranteed 44 px tap target, quiz card `max-width: 100%` |

### Polish Additions

- **Restart Demo button** — A ghost button in both chat headers clears all `localStorage` and returns to the landing screen, letting judges replay the full flow without a manual browser clear.
- **XP bar glow pulse** — On every XP gain, the progress bar emits a soft glow (`flu-xp-fill--pulse` keyframe toggled via `useEffect` in `XPBar.tsx`). Small detail, huge perceived quality.
- **Pre-seeded group messages** — On first load, Priya and Kenji already have a message in the room. The group chat is never awkwardly empty when the level-up modal closes.
- **Smooth typing indicator** — The "Max is typing…" bubble now fades in with a 500 ms delay so it never flashes in-and-out on fast responses.

---

## 📚 What We Learned

### 1. Prompt engineering is a product discipline
Getting Gemini to return *consistently structured JSON* that is also *warm in tone* required a lot of iteration. The naive approach — "reply naturally and also fix their grammar" — produces inconsistent outputs that break the frontend. The fix was to treat the system prompt like a contract: define the exact JSON schema, enumerate every field, and give Gemini sample outputs. Once that contract was solid, the frontend became trivially simple.

### 2. Perceived liveness matters more than real liveness
We originally worried that timer-based AI persona messages would feel fake. In practice, users in demos didn't notice. The *appearance* of a live group — messages arriving at irregular intervals, different writing styles, occasional emoji — is enough to trigger social motivation. This is a known effect in HCI research: **social presence** doesn't require actual humans, just social *signals*.

### 3. Corrections must be emotionally designed
The first version showed corrections with a red strikethrough. User feedback (from watching someone try it for the first time) was immediate: they winced and apologized. We switched to a softer amber underline with a green suggestion and a warm one-liner ("Nice try — here's a smoother way to say it!"). Retention in the demo session visibly improved. The lesson: **error UI is emotional design, not just information design**.

### 4. Strict output shapes unlock fast frontends
By mandating a single, fixed JSON shape from every Gemini call (and validating against TypeScript interfaces), we eliminated an entire class of bugs. No parsing ambiguity, no conditional rendering spaghetti. The API surface between AI and UI was as clean as any typed REST contract.

### 5. Client-side intelligence can be a product differentiator
Mistake DNA requires no extra API calls and no backend. It's pure client-side aggregation — logging error types to `localStorage`, counting frequency, and feeding the top patterns back into the quiz prompt. The insight is that **the data you already have, organised well, can feel like AI magic**. The user never knows it's just a frequency table. They feel *seen*.

### 6. Demo-proofing is a feature, not an afterthought
The hardening pass taught us that a hackathon app lives or dies in the 5-minute window a judge gives it. A flicker here, a crash there, a mobile layout that breaks — these aren't minor bugs, they're existential. Building in a "Restart Demo" button, pre-seeding the group room, and hardening every API parser made the difference between a project that *works* and one that *performs*.

---

## 🧗 Challenges

### Differentiating from the AI grammar checker crowd
Every hackathon has five "AI grammar corrector" projects. The challenge was reframing FluentUp so judges immediately saw it as something categorically different. The answer was Mistake DNA: instead of fixing sentences and forgetting, FluentUp *remembers*, *patterns*, and *targets*. That single concept — turning corrections into a living learning fingerprint — changed the narrative from "AI tool" to "AI teacher."

### Gemini rate limits on Free Tier
With three concurrent API routes (chat + persona timer + quiz), we hit `429: Resource Exhausted` errors during peak demo load. The fix was request debouncing on the persona timer, lazy quiz generation (only after the user submits an answer), and a user-facing "Max is thinking…" state that gracefully absorbs latency.

### JSON faithfulness under adversarial inputs
When users typed very long or structurally unusual sentences, Gemini would occasionally return prose instead of JSON — breaking the parser. We wrapped every API response in a `try/catch` with a `cleanJsonString()` sanitizer and a fallback shape (a friendly reply, no correction, minimal XP) across all three API routes, so the chat never hard-crashes regardless of model output.

### No-DB state persistence
`localStorage` is fast and friction-free for a demo, but it meant every state mutation had to be mirrored to storage immediately, or a refresh would silently reset progress. The level-up flow required special care — a `flu-has-redirected` flag ensures the celebratory modal fires exactly once, not on every page reload. The Mistake DNA log also lives entirely in `localStorage`, making the tracker stateless and resilient to refreshes.

### Keeping the UI jargon-free
It's surprisingly hard to talk about a learning app without using learning-app vocabulary. Words like "session," "streak," "XP threshold," "level," and "mode" kept sneaking into UI copy written by developers. We did a dedicated copywriting pass right before the demo, replacing every piece of technical language with plain conversational phrasing — including finding a way to explain Mistake DNA to a user without ever saying "error pattern aggregation."

### Mobile layout under pressure
We built desktop-first and left mobile for the polish pass — which almost bit us. At 375 px, the XP bar, level badge, and send button all competed for space. The fix was surgical: hide the level badge on narrow screens, tighten padding, and guarantee a 44 px tap target on the send button (Apple's minimum for reliable thumb taps).

---

## 🔭 What's Next

The hackathon version uses simulated peers, but the real vision is **actual multiplayer** — real learners in the same group room, with Max moderating and quizzing everyone based on the room's collective Mistake DNA. Imagine a leaderboard that doesn't just rank by XP, but by *improvement rate* — who corrected their most common mistake the fastest. The AI infrastructure is already in place; what's missing is presence, WebSockets, and a real backend. That's the roadmap.

> *FluentUp was built with ❤️ in one day at Build With AI Hack Days @RU,  
> powered by Google for Developers / Gemini.  
> It doesn't just correct you. It knows you.*
