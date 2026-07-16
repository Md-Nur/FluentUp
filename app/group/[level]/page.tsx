"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Message, UserProfile, PersonaMessage, ChatResponse } from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";
import LeaderboardCard, { LeaderboardUser } from "@/components/LeaderboardCard";
import XPToast from "@/components/XPToast";
import QuizCard from "@/components/QuizCard";
import type { QuizResponse } from "@/lib/types";
import MistakeDNACard from "@/components/MistakeDNACard";
import { addMistakeToLog, clearMistakeLog, improveMistakePattern, getMistakePatterns } from "@/lib/mistakeTracker";

const FRIENDLY_TYPING_MESSAGES = [
  "is typing… ✍️",
  "is thinking of what to say… 💭",
  "is writing a reply… 📖",
];

const INITIAL_PEERS = [
  { name: "Priya", avatar: "👩🏽‍💼", xp: 120, isUser: false, countryFlag: "🇮🇳" },
  { name: "Kenji", avatar: "👨🏻‍💻", xp: 95, isUser: false, countryFlag: "🇯🇵" },
  { name: "Chloe", avatar: "👩🏼‍🎨", xp: 110, isUser: false, countryFlag: "🇫🇷" },
  { name: "Diego", avatar: "👨🏽‍⚽️", xp: 105, isUser: false, countryFlag: "🇲🇽" },
  { name: "Max", avatar: "🎓", xp: 150, isUser: false, countryFlag: "🇬🇧" },
];

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Polish 3: Pre-seeded persona messages so the room doesn't feel empty on load
function buildInitialMessages(level: string): Message[] {
  const now = Date.now();
  return [
    {
      id: randomId(),
      sender: "max",
      text: `Welcome to the ${level.toUpperCase()} Practice Room! This is a group chat where you can practice speaking in real-time with other students. Let's start introducing ourselves!`,
      timestamp: now - 60000,
    },
    {
      id: randomId(),
      sender: "max",
      text: "Priya, Kenji, Chloe, Diego — say hello to our newest member!",
      timestamp: now - 50000,
    },
    // Polish 3: Pre-seeded peer messages so the room isn't empty
    {
      id: randomId(),
      sender: "priya",
      text: "Hey! Welcome 🎉 Great to have someone new here! I've been practicing my vocabulary this week. What topic do you enjoy talking about?",
      timestamp: now - 42000,
    },
    {
      id: randomId(),
      sender: "kenji",
      text: "こんにちは! Oh wait — English only 😄 Hello! Nice to meet you. Don't be shy, we all make mistakes here. That's how we get better!",
      timestamp: now - 35000,
    },
    {
      id: randomId(),
      sender: "max",
      text: `(Tip: Chat freely. I'll stay here to give help and drop quick study challenges!)`,
      timestamp: now - 28000,
    },
  ];
}

export default function GroupChatPage() {
  const router = useRouter();
  const params = useParams<{ level: string }>();
  const level = params?.level || "intermediate";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toastAmount, setToastAmount] = useState(0);
  const [toastTrigger, setToastTrigger] = useState(0);

  // Mistake DNA state
  const [dnaTrigger, setDnaTrigger] = useState(0);
  const [progressCallout, setProgressCallout] = useState<string | null>(null);
  const [progressTrigger, setProgressTrigger] = useState(0);

  // Clear progress callout toast after 3 seconds
  useEffect(() => {
    if (progressTrigger === 0) return;
    const timer = setTimeout(() => {
      setProgressCallout(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [progressTrigger]);

  // Simulation states
  const [peerTyping, setPeerTyping] = useState<{ name: string; text: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [openQuizId, setOpenQuizId] = useState<string | null>(null);

  // Bug 5: track the peer message typing setTimeout to clear on unmount
  const peerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bug 3: use a ref so the peer timer closure always has fresh messages
  // without restarting the interval on every new message
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load user profile & initialize group room
  useEffect(() => {
    const storedProfile = localStorage.getItem("flu-profile");
    if (!storedProfile) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(storedProfile) as UserProfile;
      setProfile(parsed);

      // Initialize leaderboard with user
      setLeaderboard([
        ...INITIAL_PEERS,
        {
          name: parsed.name,
          avatar: "👤",
          xp: parsed.xp,
          isUser: true,
          countryFlag: "🌍",
        },
      ]);

      // Polish 3: Initialize chat room with pre-seeded welcome + peer messages
      setMessages(buildInitialMessages(level));
    } catch {
      router.replace("/");
    }
  }, [level, router]);

  // Keep leaderboard user XP in sync with local state
  useEffect(() => {
    if (profile) {
      setLeaderboard((prev) =>
        prev.map((p) => (p.isUser ? { ...p, xp: profile.xp } : p))
      );
      localStorage.setItem("flu-profile", JSON.stringify(profile));
    }
  }, [profile]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  // Bug 3: Timer for AI Peer messages — stable interval (depends only on profile/level,
  // uses messagesRef to avoid restarting on every message)
  useEffect(() => {
    if (!profile) return;

    const interval = setInterval(async () => {
      // Pick a random peer to write
      const peers = INITIAL_PEERS.filter((p) => p.name !== "Max");
      const chosenPeer = peers[Math.floor(Math.random() * peers.length)]!;
      
      const typingMsg = FRIENDLY_TYPING_MESSAGES[
        Math.floor(Math.random() * FRIENDLY_TYPING_MESSAGES.length)
      ]!;

      // 1. Show peer typing state
      setPeerTyping({
        name: chosenPeer.name,
        text: `${chosenPeer.name} ${typingMsg}`,
      });

      // 2. Fetch peer response from API
      try {
        // Bug 3: read from ref, not closure — avoids stale messages and timer restart
        const currentMessages = messagesRef.current;
        const lastMsg = currentMessages[currentMessages.length - 1];
        const speakerHistory = currentMessages.map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

        const res = await fetch("/api/persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level,
            history: speakerHistory,
            lastSpeaker: lastMsg?.sender || "",
          }),
        });

        let data: PersonaMessage;
        try {
          data = await res.json();
        } catch {
          throw new Error("Malformed JSON from /api/persona");
        }

        // Small typing delay for realism
        peerTimeoutRef.current = setTimeout(() => {
          setPeerTyping(null);
          
          setMessages((prev) => [
            ...prev,
            {
              id: randomId(),
              sender: data.personaName.toLowerCase() as Message["sender"],
              text: data.message,
              timestamp: Date.now(),
            },
          ]);

          // Increment peer XP by 5-10 to make leaderboard feel alive
          const xpGain = Math.floor(Math.random() * 5) + 5;
          setLeaderboard((prev) =>
            prev.map((p) =>
              p.name === data.personaName ? { ...p, xp: p.xp + xpGain } : p
            )
          );
        }, 1500);

      } catch (err) {
        console.error("Failed to generate peer message:", err);
        setPeerTyping(null);
      }

    }, 18000);

    return () => {
      clearInterval(interval);
      if (peerTimeoutRef.current) {
        clearTimeout(peerTimeoutRef.current);
      }
    };
    // Bug 3: intentionally omit `messages` from deps — use messagesRef instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, profile]);

  // Function to manually or automatically trigger a quiz challenge
  const triggerQuizChallenge = useCallback(async () => {
    if (isQuizLoading || !profile || openQuizId) return;

    setIsQuizLoading(true);
    
    // Simulate Max typing for the challenge
    setPeerTyping({
      name: "max",
      text: "Max is preparing a quick challenge… 📝",
    });

    try {
      // Gather past mistakes from the chat feed
      const pastMistakes = messagesRef.current
          .filter((m) => m.correction)
          .map((m) => ({
            original: m.correction!.original_snippet,
            corrected: m.correction!.corrected_snippet,
          }));

      const currentPatterns = getMistakePatterns();

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          mistakes: pastMistakes,
          mistakePatterns: currentPatterns,
        }),
      });

      let quizData: QuizResponse;
      try {
        quizData = await res.json();
      } catch {
        throw new Error("Malformed JSON from /api/quiz");
      }

      const newQuizId = randomId();
      setPeerTyping(null);
      setMessages((prev) => [
        ...prev,
        {
          id: newQuizId,
          sender: "max",
          text: "Challenge time! Let's see if we can solve this grammar puzzle. Tap the correct option below!",
          timestamp: Date.now(),
          quiz: quizData,
        },
      ]);
      setOpenQuizId(newQuizId);
    } catch (err) {
      console.error("Failed to generate quiz:", err);
      setPeerTyping(null);
    } finally {
      setIsQuizLoading(false);
    }
  }, [level, profile, isQuizLoading, openQuizId]);

  // Trigger automatic quiz after every 6 messages sent by the user (and only if no quiz is open)
  useEffect(() => {
    if (userMessageCount > 0 && userMessageCount % 6 === 0 && !openQuizId) {
      const timer = setTimeout(() => {
        triggerQuizChallenge();
      }, 3000); // 3 seconds delay after user message
      return () => clearTimeout(timer);
    }
  }, [userMessageCount, openQuizId, triggerQuizChallenge]);

  const sendUserMessage = useCallback(async () => {
    if (!inputText.trim() || isSending || !profile) return;

    const userMessage: Message = {
      id: randomId(),
      sender: "user",
      text: inputText.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsSending(true);

    inputRef.current?.focus();

    try {
      // Send user message to /api/chat so Max can check for corrections and reply
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: messagesRef.current.slice(-5),
          userProfile: profile,
        }),
      });

      let data: ChatResponse;
      try {
        data = await res.json();
      } catch {
        throw new Error("Malformed JSON from /api/chat");
      }

      // Update XP & Streak
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          xp: prev.xp + data.xp_gained,
          streak: prev.streak + 1,
        };
      });

      setToastAmount(data.xp_gained);
      setToastTrigger((t) => t + 1);

      // If user had a grammar mistake, Max drops in a public correction in the group chat!
      if (data.had_error && data.original_snippet && data.corrected_snippet) {
        addMistakeToLog(data.error_type || "grammar", data.original_snippet);
        setDnaTrigger((t) => t + 1);

        setMessages((prev) => [
          ...prev,
          {
            id: randomId(),
            sender: "max",
            text: `Nicely phrased! But a quick tip for ${profile.name}:`,
            timestamp: Date.now(),
            correction: {
              original_snippet: data.original_snippet!,
              corrected_snippet: data.corrected_snippet!,
              error_type: data.error_type || "grammar",
              explanation: data.explanation || "",
            },
          },
        ]);
      } else {
        // Max responds conversationally if no error
        setMessages((prev) => [
          ...prev,
          {
            id: randomId(),
            sender: "max",
            text: data.reply,
            timestamp: Date.now(),
          },
        ]);
      }

      // Increment user message counter
      setUserMessageCount((prev) => prev + 1);

    } catch (err) {
      console.error("Failed to process message with Max:", err);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, profile]);

  // Polish 1: Restart Demo — clears all state and returns to landing
  const handleRestartDemo = useCallback(() => {
    localStorage.removeItem("flu-profile");
    localStorage.removeItem("flu-messages");
    localStorage.removeItem("flu-seen-hint");
    localStorage.removeItem("flu-has-redirected");
    clearMistakeLog();
    router.replace("/");
  }, [router]);

  if (!profile) {
    return (
      <div className="flu-chat-container" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--flu-text-secondary)", fontSize: "1.1rem" }}>
          Loading group practice room… ✨
        </p>
      </div>
    );
  }

  // Map participant name to avatar emoji
  const getAvatarForSender = (sender: string) => {
    if (sender === "user") return "👤";
    if (sender === "max") return "🎓";
    const found = INITIAL_PEERS.find((p) => p.name.toLowerCase() === sender);
    return found ? found.avatar : "👤";
  };

  const getDisplayName = (sender: string) => {
    if (sender === "user") return profile.name;
    if (sender === "max") return "Max";
    const found = INITIAL_PEERS.find((p) => p.name.toLowerCase() === sender);
    return found ? found.name : sender;
  };

  return (
    <div className="flu-group-layout">
      {/* Left Chat Pane */}
      <div className="flu-group-chat-pane">
        {/* Header */}
        <div className="flu-chat-header">
          <div className="flu-max-avatar" aria-hidden="true" style={{ background: "linear-gradient(135deg, var(--flu-accent), var(--flu-warning))" }}>
            💬
          </div>
          <div className="flu-header-info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "0.5rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2>{level.toUpperCase()} English Room</h2>
              <p style={{ color: "var(--flu-text-secondary)" }}>
                {INITIAL_PEERS.filter((p) => p.name !== "Max").length + 2} online including Max
              </p>
            </div>
            {/* Group header action buttons */}
            <div className="flu-group-header-actions">
              <button
                type="button"
                className="flu-challenge-btn"
                onClick={triggerQuizChallenge}
                disabled={isQuizLoading || !!openQuizId}
              >
                📚 Challenge
              </button>
              {/* Polish 1: Restart Demo button */}
              <button
                type="button"
                className="flu-restart-btn"
                onClick={handleRestartDemo}
                aria-label="Restart demo"
                title="Clear progress and restart"
              >
                ↺ Restart
              </button>
            </div>
          </div>
        </div>

        {/* Mistake DNA Card */}
        <MistakeDNACard updateTrigger={dnaTrigger} />

        {/* Group Feed Messages */}
        <div className="flu-messages">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            const senderName = getDisplayName(msg.sender);

            return (
              <div key={msg.id} className={`flu-msg-row ${isUser ? "user" : ""}`}>
                {!isUser && (
                  <div className="flu-msg-avatar-sm" aria-hidden="true">
                    {getAvatarForSender(msg.sender)}
                  </div>
                )}
                <div className="flu-msg-bubble-wrap">
                  {!isUser && (
                    <div className="flu-msg-header-group">
                      <span className="flu-msg-name-group">{senderName}</span>
                      <span className={`flu-msg-role-badge ${msg.sender === "max" ? "teacher" : "peer"}`}>
                        {msg.sender === "max" ? "Teacher" : "Peer"}
                      </span>
                    </div>
                  )}
                  <div className={`flu-bubble ${isUser ? "user" : "max"}`}>
                    {msg.text}
                  </div>

                  {/* Correction Card */}
                  {!isUser && msg.correction && (
                    <div className="flu-correction">
                      <div className="flu-correction-diff">
                        <span className="flu-correction-original">
                          {msg.correction.original_snippet}
                        </span>
                        <span className="flu-correction-arrow">→</span>
                        <span className="flu-correction-fixed">
                          {msg.correction.corrected_snippet}
                        </span>
                        {msg.correction.error_type && (
                          <span className="flu-correction-label">
                            {msg.correction.error_type}
                          </span>
                        )}
                      </div>
                      {msg.correction.explanation && (
                        <p className="flu-correction-explanation">
                          {msg.correction.explanation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Interactive Quiz Card */}
                  {msg.quiz && (
                    <QuizCard
                      quiz={msg.quiz}
                      onCorrectAnswer={(xpGain, patternName) => {
                        setProfile((prev) => {
                          if (!prev) return prev;
                          return { ...prev, xp: prev.xp + xpGain };
                        });
                        setToastAmount(xpGain);
                        setToastTrigger((t) => t + 1);
                        setOpenQuizId(null);

                        if (xpGain === 20 && patternName) {
                          const decreased = improveMistakePattern(patternName);
                          if (decreased) {
                            setProgressCallout(`Your grip on ${patternName} is getting stronger! 🚀`);
                            setProgressTrigger((t) => t + 1);
                            setDnaTrigger((t) => t + 1);
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Peer Typing Indicator */}
          {peerTyping && (
            <div className="flu-msg-row">
              <div className="flu-msg-avatar-sm" aria-hidden="true">
                {getAvatarForSender(peerTyping.name.toLowerCase())}
              </div>
              <div className="flu-typing">
                <span className="flu-typing-text">{peerTyping.text}</span>
                <div className="flu-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="flu-chat-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="flu-chat-input"
            placeholder="Introduce yourself or say hello to the group…"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
              }
            }}
            disabled={isSending}
            autoComplete="off"
            autoFocus
          />
          <button
            type="button"
            className="flu-send-btn"
            onClick={sendUserMessage}
            disabled={!inputText.trim() || isSending}
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Right Sidebar: Leaderboard */}
      <div className="flu-group-sidebar">
        <LeaderboardCard participants={leaderboard} />
      </div>

      {/* XP Toast */}
      <XPToast amount={toastAmount} triggerId={toastTrigger} />

      {/* Progress Callout Toast */}
      {progressCallout && (
        <div className="flu-progress-toast" key={progressTrigger}>
          <div className="flu-progress-toast-inner">
            🌟 {progressCallout}
          </div>
        </div>
      )}
    </div>
  );
}
