"use client";

import type { Message } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  showOnboardingHint?: boolean;
  onCloseHint?: () => void;
}

export default function MessageBubble({
  message,
  showOnboardingHint = false,
  onCloseHint,
}: MessageBubbleProps) {
  const isUser = message.sender === "user";

  return (
    <div className={`flu-msg-row ${isUser ? "user" : ""}`}>
      {/* Max avatar — only for Max's messages */}
      {!isUser && (
        <div className="flu-msg-avatar-sm" aria-hidden="true">
          🎓
        </div>
      )}

      <div className="flu-msg-bubble-wrap">
        {/* Message bubble */}
        <div className={`flu-bubble ${isUser ? "user" : "max"}`}>
          {message.text}
        </div>

        {/* Correction card — only shown on Max's messages with corrections */}
        {!isUser && message.correction && (
          <div className="flu-correction" style={{ position: "relative" }}>
            <div className="flu-correction-diff">
              <span className="flu-correction-original">
                {message.correction.original_snippet}
              </span>
              <span className="flu-correction-arrow">→</span>
              <span className="flu-correction-fixed">
                {message.correction.corrected_snippet}
              </span>
              {message.correction.error_type && (
                <span className="flu-correction-label">
                  {message.correction.error_type}
                </span>
              )}
            </div>
            {message.correction.explanation && (
              <p className="flu-correction-explanation">
                {message.correction.explanation}
              </p>
            )}

            {/* Glowing Onboarding Tooltip */}
            {showOnboardingHint && (
              <div className="flu-onboarding-tooltip">
                <div className="tooltip-arrow" aria-hidden="true" />
                <p>
                  💡 <strong>Quick Tip:</strong> Strikethrough shows your mistake, and green is the fix. No pressure, we learn by trying!
                </p>
                <button
                  type="button"
                  className="tooltip-close-btn"
                  onClick={onCloseHint}
                >
                  Got it! 👍
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
