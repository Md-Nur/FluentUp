"use client";

import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/lib/types";

interface XPBarProps {
  profile: UserProfile;
  xpThreshold?: number;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "🌱 Beginner",
  intermediate: "🌿 Intermediate",
  advanced: "🌳 Advanced",
};

export default function XPBar({ profile, xpThreshold = 100 }: XPBarProps) {
  const xpPercent = Math.min((profile.xp / xpThreshold) * 100, 100);
  const [isPulsing, setIsPulsing] = useState(false);
  const isFirstMount = useRef(true);

  // Trigger glow pulse whenever XP increases (skip initial mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 700);
    return () => clearTimeout(timer);
  }, [profile.xp]);

  return (
    <div className="flu-xp-bar-wrap">
      {/* Level badge */}
      <span className="flu-level-badge flu-level-badge--responsive">
        {LEVEL_LABELS[profile.level] || profile.level}
      </span>

      {/* XP progress bar */}
      <div className="flu-xp-track" role="progressbar" aria-valuenow={Math.round(xpPercent)} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress">
        <div
          className={`flu-xp-fill${isPulsing ? " flu-xp-fill--pulse" : ""}`}
          style={{ width: `${xpPercent}%` }}
        />
      </div>

      {/* XP counter */}
      <span className="flu-xp-label">
        {profile.xp}/{xpThreshold}
      </span>

      {/* Streak */}
      {profile.streak > 0 && (
        <span className="flu-streak">
          🔥 {profile.streak}
        </span>
      )}
    </div>
  );
}
