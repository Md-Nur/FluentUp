"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Message, UserProfile, ChatResponse } from "@/lib/types";
import MessageBubble from "@/components/MessageBubble";
import XPBar from "@/components/XPBar";
import XPToast from "@/components/XPToast";
import LevelUpModal from "@/components/LevelUpModal";

const XP_THRESHOLD = 10; // TODO: restore to 100 before production

const FRIENDLY_LOADING_MESSAGES = [
  "Max is thinking… 🤔",
  "Max is reading your message… 📖",
  "One moment, Max is crafting a reply… ✍️",
  "Max is on it… 💡",
];

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getRandomLoadingMessage() {
  return FRIENDLY_LOADING_MESSAGES[
    Math.floor(Math.random() * FRIENDLY_LOADING_MESSAGES.length)
  ];
}

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [toastAmount, setToastAmount] = useState(0);
  const [toastTrigger, setToastTrigger] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [hasSeenCorrectionHint, setHasSeenCorrectionHint] = useState(true);

  // Check onboarding status on client mount
  useEffect(() => {
    const seen = localStorage.getItem("flu-seen-hint") === "true";
    setHasSeenCorrectionHint(seen);
  }, []);

  // Load profile and messages from localStorage on mount
  useEffect(() => {
    const storedProfile = localStorage.getItem("flu-profile");
    if (!storedProfile) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(storedProfile) as UserProfile;
      setProfile(parsed);
    } catch {
      router.replace("/");
      return;
    }

    const storedMessages = localStorage.getItem("flu-messages");
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch {
        // Ignore corrupt data
      }
    }
  }, [router]);

  // Persist messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("flu-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Persist profile to localStorage
  useEffect(() => {
    if (profile) {
      localStorage.setItem("flu-profile", JSON.stringify(profile));
    }
  }, [profile]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Check for level-up (XP >= threshold)
  useEffect(() => {
    if (profile && profile.xp >= XP_THRESHOLD && !hasRedirected) {
      // Trigger the level-up celebratory modal
      setIsLevelUpOpen(true);
    }
  }, [profile, hasRedirected]);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || !profile) return;

    const userMessage: Message = {
      id: randomId(),
      sender: "user",
      text: inputText.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);
    setLoadingText(getRandomLoadingMessage());

    // Focus back on input for rapid typing
    inputRef.current?.focus();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          history: updatedMessages.slice(-10),
          userProfile: profile,
        }),
      });

      const data: ChatResponse = await response.json();

      const maxMessage: Message = {
        id: randomId(),
        sender: "max",
        text: data.reply,
        timestamp: Date.now(),
        xp_gained: data.xp_gained,
        ...(data.had_error &&
          data.original_snippet &&
          data.corrected_snippet && {
            correction: {
              original_snippet: data.original_snippet,
              corrected_snippet: data.corrected_snippet,
              error_type: data.error_type || "",
              explanation: data.explanation || "",
            },
          }),
      };

      setMessages((prev) => [...prev, maxMessage]);

      // Update XP and streak
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          xp: prev.xp + data.xp_gained,
          streak: prev.streak + 1,
        };
      });

      // Show XP toast
      setToastAmount(data.xp_gained);
      setToastTrigger((t) => t + 1);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add a friendly error message from Max
      const errorMessage: Message = {
        id: randomId(),
        sender: "max",
        text: "Oops, something went wrong on my end! 😅 Could you try sending that again?",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, profile]);

  // Don't render until we've checked for a profile
  if (!profile) {
    return (
      <div className="flu-chat-container" style={{ alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--flu-text-secondary)", fontSize: "1.1rem" }}>
          Loading your chat… ✨
        </p>
      </div>
    );
  }

  return (
    <div className="flu-chat-container">
      {/* Header */}
      <div className="flu-chat-header">
        <div className="flu-max-avatar" aria-hidden="true">
          🎓
        </div>
        <div className="flu-header-info">
          <h2>Max</h2>
          <p>Your English Teacher</p>
        </div>
      </div>

      {/* XP Bar */}
      <XPBar profile={profile} xpThreshold={XP_THRESHOLD} />

      {/* Messages */}
      <div className="flu-messages">
        {/* Welcome card if no messages */}
        {messages.length === 0 && (
          <div className="flu-welcome-card">
            <h3>Hey {profile.name}! 👋</h3>
            <p>
              I&apos;m Max, your English teacher! Just chat with me naturally — I&apos;ll
              gently help you improve along the way. Don&apos;t worry about mistakes,
              that&apos;s how we learn! 😊
            </p>
          </div>
        )}

        {/* Message bubbles */}
        {(() => {
          const firstCorrectionId = messages.find((m) => m.correction)?.id;
          return messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              showOnboardingHint={!hasSeenCorrectionHint && msg.id === firstCorrectionId}
              onCloseHint={() => {
                localStorage.setItem("flu-seen-hint", "true");
                setHasSeenCorrectionHint(true);
              }}
            />
          ));
        })()}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flu-msg-row">
            <div className="flu-msg-avatar-sm" aria-hidden="true">
              🎓
            </div>
            <div className="flu-typing">
              <span className="flu-typing-text">{loadingText}</span>
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

      {/* Input bar */}
      <div className="flu-chat-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="flu-chat-input"
          placeholder="Type a message…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          disabled={isLoading}
          autoComplete="off"
          autoFocus
        />
        <button
          type="button"
          className="flu-send-btn"
          onClick={sendMessage}
          disabled={!inputText.trim() || isLoading}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>

      {/* XP Toast */}
      <XPToast amount={toastAmount} triggerId={toastTrigger} />

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={isLevelUpOpen}
        name={profile.name}
        currentLevel={profile.level}
        onProceed={() => {
          setIsLevelUpOpen(false);
          setHasRedirected(true);
          router.push(`/group/${profile.level}`);
        }}
      />
    </div>
  );
}
