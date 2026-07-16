"use client";

import { useEffect, useState } from "react";

interface LevelUpModalProps {
  isOpen: boolean;
  name: string;
  currentLevel: "beginner" | "intermediate" | "advanced";
  onProceed: () => void;
}

const LEVEL_NAMES: Record<string, string> = {
  beginner: "Beginner 🌱",
  intermediate: "Intermediate 🌿",
  advanced: "Advanced 🌳",
};

export default function LevelUpModal({
  isOpen,
  name,
  currentLevel,
  onProceed,
}: LevelUpModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Prevent body scrolling while modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  return (
    <div
      className={`flu-modal-overlay ${isOpen ? "active" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
    >
      {/* Background Confetti/Sparkle Particles */}
      <div className="flu-particles">
        <div className="particle p1">✨</div>
        <div className="particle p2">🎉</div>
        <div className="particle p3">✨</div>
        <div className="particle p4">🌟</div>
        <div className="particle p5">🎉</div>
        <div className="particle p6">✨</div>
        <div className="particle p7">🌟</div>
        <div className="particle p8">🎉</div>
      </div>

      <div className="flu-modal-card">
        {/* Animated celebration crown/badge */}
        <div className="flu-celebration-badge" aria-hidden="true">
          🏆
        </div>

        <h1 id="levelup-title" className="flu-modal-title">
          Incredible Job, {name}!
        </h1>
        
        <p className="flu-modal-desc">
          You earned 100 points! You have mastered the basics and leveled up. Let&apos;s put your skills to the test in the group chat.
        </p>

        {/* Level Progression Visualizer */}
        <div className="flu-level-visual">
          <div className="flu-level-step completed">
            <span className="step-label">1:1 Chat</span>
            <span className="step-status">Completed ✓</span>
          </div>
          <div className="flu-level-arrow">➔</div>
          <div className="flu-level-step active">
            <span className="step-label">Group Chat</span>
            <span className="step-status">{LEVEL_NAMES[currentLevel]} Unlock</span>
          </div>
        </div>

        <button
          type="button"
          className="flu-btn-primary flu-stagger-3"
          onClick={onProceed}
          style={{ width: "100%", marginTop: "1rem" }}
        >
          Join the Group Chat 💬
        </button>
      </div>
    </div>
  );
}
