"use client";

import type { UserProfile } from "@/lib/types";

export interface LeaderboardUser {
  name: string;
  avatar: string;
  xp: number;
  isUser: boolean;
  countryFlag: string;
}

interface LeaderboardCardProps {
  participants: LeaderboardUser[];
}

export default function LeaderboardCard({ participants }: LeaderboardCardProps) {
  // Sort participants by XP descending
  const sorted = [...participants].sort((a, b) => b.xp - a.xp);

  return (
    <div className="flu-leaderboard-card">
      <div className="flu-leaderboard-header">
        <span className="leaderboard-icon">🏆</span>
        <h3>Weekly Leaderboard</h3>
      </div>
      <div className="flu-leaderboard-list">
        {sorted.map((p, index) => {
          const rank = index + 1;
          let rankEmoji = "";
          if (rank === 1) rankEmoji = "🥇";
          else if (rank === 2) rankEmoji = "🥈";
          else if (rank === 3) rankEmoji = "🥉";

          return (
            <div
              key={p.name}
              className={`flu-leaderboard-row ${p.isUser ? "user-row" : ""}`}
            >
              {/* Rank */}
              <div className="flu-leaderboard-rank">
                {rankEmoji ? (
                  <span className="rank-emoji">{rankEmoji}</span>
                ) : (
                  <span className="rank-number">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="flu-leaderboard-avatar" aria-hidden="true">
                {p.avatar}
              </div>

              {/* Name & Country */}
              <div className="flu-leaderboard-info">
                <span className="participant-name">
                  {p.name} {p.isUser && <span className="you-label">(You)</span>}
                </span>
                <span className="participant-country">
                  {p.countryFlag} {p.name === "Max" ? "Teacher" : "Student"}
                </span>
              </div>

              {/* XP */}
              <div className="flu-leaderboard-xp">
                <span className="xp-num">{p.xp}</span>
                <span className="xp-label">XP</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
