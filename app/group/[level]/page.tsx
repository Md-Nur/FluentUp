"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Message, UserProfile, PersonaMessage, ChatResponse } from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";
import LeaderboardCard, { LeaderboardUser } from "@/components/LeaderboardCard";
import XPToast from "@/components/XPToast";
import QuizCard from "@/components/QuizCard";
import type { QuizResponse } from "@/lib/types";

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

  // Simulation states
  const [peerTyping, setPeerTyping] = useState<{ name: string; text: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);

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

      // Initialize chat room with some welcome history
      setMessages([
        {
          id: randomId(),
          sender: "max",
          text: `Welcome to the ${level.toUpperCase()} Practice Room! This is a group chat where you can practice speaking in real-time with other students. Let's start introducing ourselves!`,
          timestamp: Date.now() - 60000,
        },
        {
          id: randomId(),
          sender: "max",
          text: "Priya, Kenji, Chloe, Diego — say hello to our newest member!",
          timestamp: Date.now() - 50000,
        },
        {
          id: randomId(),
          sender: "max",
          text: `(Tip: Chat freely. I'll stay here to give help and drop quick study challenges!)`,
          timestamp: Date.now() - 40000,
        },
      ]);
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

  // Timer for AI Peer messages (Simulated room activity every 18 seconds)
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
        const lastMsg = messages[messages.length - 1];
        const speakerHistory = messages.map((m) => ({
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

        const data: PersonaMessage = await res.json();

        // Small typing delay for realism
        setTimeout(() => {
          setPeerTyping(null);
          
          setMessages((prev) => [
            ...prev,
            {
              id: randomId(),
              sender: data.personaName.toLowerCase() as any, // Cast to match user/max/peers style
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

    return () => clearInterval(interval);
  }, [level, messages, profile]);

  // Function to manually or automatically trigger a quiz challenge
  const triggerQuizChallenge = useCallback(async () => {
    if (isQuizLoading || !profile) return;

    setIsQuizLoading(true);
    
    // Simulate Max typing for the challenge
    setPeerTyping({
      name: "max",
      text: "Max is preparing a quick challenge… 📝",
    });

    try {
      // Gather past mistakes from the chat feed
      const pastMistakes = messages
        .filter((m) => m.correction)
        .map((m) => ({
          original: m.correction!.original_snippet,
          corrected: m.correction!.corrected_snippet,
        }));

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          mistakes: pastMistakes,
        }),
      });

      const quizData: QuizResponse = await res.json();

      setPeerTyping(null);
      setMessages((prev) => [
        ...prev,
        {
          id: randomId(),
          sender: "max",
          text: "Challenge time! Let's see if we can solve this grammar puzzle. Tap the correct option below!",
          timestamp: Date.now(),
          quiz: quizData,
        },
      ]);
    } catch (err) {
      console.error("Failed to generate quiz:", err);
      setPeerTyping(null);
    } finally {
      setIsQuizLoading(false);
    }
  }, [level, messages, profile, isQuizLoading]);

  // Trigger automatic quiz after every 3 messages sent by the user
  useEffect(() => {
    if (userMessageCount > 0 && userMessageCount % 3 === 0) {
      const timer = setTimeout(() => {
        triggerQuizChallenge();
      }, 3000); // 3 seconds delay after user message
      return () => clearTimeout(timer);
    }
  }, [userMessageCount, triggerQuizChallenge]);

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
      // Send user message to /api/chat so Max can check for corrections and replying!
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: messages.slice(-5),
          userProfile: profile,
        }),
      });

      const data: ChatResponse = await res.json();

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
  }, [inputText, isSending, messages, profile]);

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
          <div className="flu-header-info" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <h2>{level.toUpperCase()} English Room</h2>
              <p style={{ color: "var(--flu-text-secondary)" }}>
                {INITIAL_PEERS.filter((p) => p.name !== "Max").length + 2} online including Max
              </p>
            </div>
            <button
              type="button"
              className="flu-challenge-btn"
              onClick={triggerQuizChallenge}
              disabled={isQuizLoading}
            >
              📚 Request Challenge
            </button>
          </div>
        </div>

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
                      onCorrectAnswer={(xpGain) => {
                        setProfile((prev) => {
                          if (!prev) return prev;
                          return { ...prev, xp: prev.xp + xpGain };
                        });
                        setToastAmount(xpGain);
                        setToastTrigger((t) => t + 1);
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
    </div>
  );
}
