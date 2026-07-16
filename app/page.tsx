"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/lib/types";

const LEVELS = [
  {
    value: "beginner" as const,
    emoji: "🌱",
    title: "Just Starting Out",
    description: "I'm new to English and want to learn step by step",
  },
  {
    value: "intermediate" as const,
    emoji: "🌿",
    title: "Getting the Hang of It",
    description: "I can hold a conversation but want to get better",
  },
  {
    value: "advanced" as const,
    emoji: "🌳",
    title: "Almost Fluent",
    description: "I'm comfortable in English and want to polish my skills",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<
    "beginner" | "intermediate" | "advanced" | null
  >(null);

  const canProceed = name.trim().length >= 1 && selectedLevel !== null;

  function handleStart() {
    if (!canProceed || !selectedLevel) return;

    const profile: UserProfile = {
      name: name.trim(),
      level: selectedLevel,
      xp: 0,
      streak: 0,
    };

    localStorage.setItem("flu-profile", JSON.stringify(profile));
    // Clear any old chat history for a fresh start
    localStorage.removeItem("flu-messages");
    router.push("/chat");
  }

  return (
    <div className="flu-landing flu-gradient-bg">
      <div className="flu-card-container">
        {/* Logo + Tagline */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            className="flu-logo"
            style={{ animation: "flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
          >
            FluentUp
          </div>
          <p
            className="flu-subtitle"
            style={{
              animation:
                "flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both",
            }}
          >
            Chat with Max, your friendly English teacher.
            <br />
            Get live tips, earn points, and level up! 🚀
          </p>
        </div>

        {/* Bengali Description */}
        <div
          style={{
            marginBottom: "2rem",
            animation: "flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.13s both",
          }}
        >
          <div
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1.5px solid rgba(99,102,241,0.18)",
              borderRadius: "1.1rem",
              padding: "1.25rem 1.4rem",
              textAlign: "center",
              lineHeight: "1.9",
              color: "var(--flu-text-secondary, #a5b4fc)",
              fontSize: "0.97rem",
              fontFamily: "inherit",
            }}
          >
            <p style={{ marginBottom: "0.6rem", fontWeight: 700, fontSize: "1.05rem", color: "var(--flu-text, #e0e7ff)" }}>
              🇧🇩 FluentUp কী?
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#c7d2fe" }}>FluentUp</strong> হলো তোমার ব্যক্তিগত ইংরেজি শিক্ষার বন্ধু। 🤝
              <br />
              এখানে তুমি{" "}
              <strong style={{ color: "#a5b4fc" }}>Max</strong>-এর সাথে চ্যাট করে ইংরেজি অনুশীলন করতে পারবে —
              ঠিক WhatsApp-এর মতো! 💬
              <br />
              Max তোমার বাক্যে কোনো ভুল হলে সুন্দরভাবে সংশোধন করে দেবে এবং
              উৎসাহিত করবে। 🌟
              <br />
              প্রতিটি বার্তায় তুমি{" "}
              <strong style={{ color: "#a5b4fc" }}>পয়েন্ট (XP)</strong> অর্জন করবে।
              যত বেশি অনুশীলন, তত বেশি পয়েন্ট! 🏆
              <br />
              পর্যাপ্ত পয়েন্ট পেলে তুমি{" "}
              <strong style={{ color: "#a5b4fc" }}>গ্রুপ চ্যাটে</strong> যোগ দিতে পারবে —
              যেখানে AI বন্ধুদের সাথে মিলে ইংরেজিতে আড্ডা দিতে এবং
              কুইজে অংশ নিতে পারবে! 🎯
            </p>
          </div>
        </div>

        {/* Name Input */}
        <div
          style={{
            marginBottom: "1.75rem",
            animation:
              "flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both",
          }}
        >
          <label className="flu-label" htmlFor="name-input">
            What should we call you?
          </label>
          <input
            id="name-input"
            type="text"
            className="flu-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canProceed) handleStart();
            }}
            maxLength={30}
            autoFocus
            autoComplete="off"
          />
        </div>

        {/* Level Picker */}
        <div
          style={{
            marginBottom: "2rem",
            animation:
              "flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s both",
          }}
        >
          <label className="flu-label">How comfortable are you with English?</label>
          <div className="flu-level-grid">
            {LEVELS.map((level, i) => (
              <button
                key={level.value}
                type="button"
                className={`flu-level-card ${selectedLevel === level.value ? "selected" : ""}`}
                onClick={() => setSelectedLevel(level.value)}
                style={{
                  animation: `flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) ${0.25 + i * 0.08}s both`,
                }}
              >
                <span className="flu-level-emoji">{level.emoji}</span>
                <div className="flu-level-info">
                  <h3>{level.title}</h3>
                  <p>{level.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          className="flu-btn-primary"
          disabled={!canProceed}
          onClick={handleStart}
          style={{
            animation:
              "flu-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.5s both",
          }}
        >
          Start Chatting with Max 💬
        </button>
      </div>
    </div>
  );
}
