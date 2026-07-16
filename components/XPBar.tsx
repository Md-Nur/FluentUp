"use client";

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

  return (
    <div className="flu-xp-bar-wrap">
      {/* Level badge */}
      <span className="flu-level-badge">
        {LEVEL_LABELS[profile.level] || profile.level}
      </span>

      {/* XP progress bar */}
      <div className="flu-xp-track" role="progressbar" aria-valuenow={profile.xp} aria-valuemin={0} aria-valuemax={xpThreshold}>
        <div
          className="flu-xp-fill"
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
