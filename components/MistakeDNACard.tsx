"use client";

import { useEffect, useState, useRef } from "react";
import { getMistakePatterns } from "@/lib/mistakeTracker";
import { MistakePattern } from "@/lib/types";

interface MistakeDNACardProps {
  /** A key to force-refresh patterns when a new mistake/correction occurs */
  updateTrigger?: number;
}

export default function MistakeDNACard({ updateTrigger = 0 }: MistakeDNACardProps) {
  const [patterns, setPatterns] = useState<MistakePattern[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Load and refresh mistake patterns
  useEffect(() => {
    const data = getMistakePatterns();
    setPatterns(data);

    // Trigger pulse animation when new mistakes are detected (updateTrigger increments)
    if (updateTrigger > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(timer);
    }
  }, [updateTrigger]);

  // Handle open modal
  const openModal = () => {
    setIsOpen(true);
    dialogRef.current?.showModal();
  };

  // Handle close modal
  const closeModal = () => {
    setIsOpen(false);
    dialogRef.current?.close();
  };

  // Setup click outside fallback for dialog dismiss
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      // If closedBy is supported natively (Chrome 134+, Firefox 141+), let it handle
      if ("closedBy" in HTMLDialogElement.prototype) return;

      // Otherwise click outside content fallback
      if (event.target !== dialog) return;

      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isInside) {
        dialog.close();
      }
    };

    // Listen to close/cancel event
    const handleClose = () => setIsOpen(false);

    dialog.addEventListener("click", handleBackdropClick);
    dialog.addEventListener("close", handleClose);

    return () => {
      dialog.removeEventListener("click", handleBackdropClick);
      dialog.removeEventListener("close", handleClose);
    };
  }, []);

  // Friendly encouraging labels
  const getEncouragingLabel = (errorType: string) => {
    const lower = errorType.toLowerCase();
    if (lower.includes("article")) return "Articles are your growth area right now 🌱";
    if (lower.includes("past tense") || lower.includes("tense")) return "Tenses are your focus zone today ⏳";
    if (lower.includes("preposition")) return "Prepositions are where you can shine next 🗺️";
    if (lower.includes("spelling")) return "Spelling is your path to precision ✍️";
    if (lower.includes("agreement") || lower.includes("subject-verb")) return "Subject-verb agreement is your alignment goal 🤝";
    return `${errorType} is your path to mastery ✨`;
  };

  // If there are no patterns yet, show a friendly starter state
  if (patterns.length === 0) {
    return (
      <div className="flu-dna-compact-empty">
        <span className="flu-dna-emoji">🧬</span>
        <span className="flu-dna-text">Mistake DNA: Ready to map your language fingerprint!</span>
      </div>
    );
  }

  // Find max count to scale progress bars; floor at 1 to avoid 0/−Infinity
  const maxCount = Math.max(1, ...patterns.map((p) => p.count));
  const top2 = patterns.slice(0, 2);

  return (
    <>
      {/* Pinned Compact Version */}
      <button
        type="button"
        onClick={openModal}
        className={`flu-dna-compact-container ${pulse ? "pulse-active" : ""}`}
        aria-haspopup="dialog"
        aria-label="Open Mistake DNA dashboard"
        title="Tap to see your full mistake patterns and history"
      >
        <span className="flu-dna-indicator">🧬 Mistake DNA:</span>
        <div className="flu-dna-pills-row">
          {top2.map((p, idx) => {
            const isArticles = p.errorType.toLowerCase().includes("article");
            const isTenses = p.errorType.toLowerCase().includes("tense");
            const isPrep = p.errorType.toLowerCase().includes("preposition");
            const isSpelling = p.errorType.toLowerCase().includes("spelling");
            let emoji = "✨";
            if (isArticles) emoji = "🌱";
            else if (isTenses) emoji = "⏳";
            else if (isPrep) emoji = "🗺️";
            else if (isSpelling) emoji = "✍️";
            else if (p.errorType.toLowerCase().includes("agreement")) emoji = "🤝";

            return (
              <span key={p.errorType} className="flu-dna-badge-pill">
                {emoji} {p.errorType} ({p.count})
              </span>
            );
          })}
          {patterns.length > 2 && (
            <span className="flu-dna-badge-pill count-more">
              +{patterns.length - 2} more
            </span>
          )}
        </div>
        <span className="flu-dna-compact-hint">Tap to inspect 🔍</span>
      </button>

      {/* Expanded Modal Dashboard */}
      <dialog
        ref={dialogRef}
        className="flu-dna-dialog"
        closedby="any"
        aria-labelledby="dnaDialogTitle"
      >
        <div className="flu-dna-dialog-content">
          {/* Header */}
          <div className="flu-dna-dialog-header">
            <div className="flu-dna-header-icon" aria-hidden="true">🧬</div>
            <div>
              <h3 id="dnaDialogTitle">Your Learning Fingerprint</h3>
              <p className="flu-dna-dialog-subtitle">
                We track recurring pattern errors across your messages to customize Max&apos;s quizzes!
              </p>
            </div>
            <button
              type="button"
              className="flu-dna-close-icon-btn"
              onClick={closeModal}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {/* Patterns List */}
          <div className="flu-dna-dialog-body">
            {patterns.map((p) => {
              const widthPercentage = maxCount > 0 ? (p.count / maxCount) * 100 : 100;
              const friendlyLabel = getEncouragingLabel(p.errorType);

              return (
                <div key={p.errorType} className="flu-dna-pattern-item">
                  <div className="flu-dna-pattern-meta">
                    <span className="flu-dna-pattern-name">{p.errorType}</span>
                    <span className="flu-dna-pattern-count">{p.count}x detected</span>
                  </div>

                  {/* Encouraging label */}
                  <div className="flu-dna-pattern-encouragement">
                    {friendlyLabel}
                  </div>

                  {/* Progress bar */}
                  <div className="flu-dna-progress-bg">
                    <div
                      className="flu-dna-progress-fill"
                      style={{ width: `${widthPercentage}%` }}
                    />
                  </div>

                  {/* Example snippets */}
                  {p.examples.length > 0 && (
                    <div className="flu-dna-pattern-examples">
                      <span className="example-label">Growth Snippets:</span>
                      <div className="example-snippets-list">
                        {p.examples.slice(0, 3).map((snippet, sIdx) => (
                          <span key={sIdx} className="flu-dna-snippet-tag">
                            &ldquo;{snippet}&rdquo;
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer close button */}
          <div className="flu-dna-dialog-footer">
            <button
              type="button"
              className="flu-dna-close-btn"
              onClick={closeModal}
            >
              Keep Learning! 🚀
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
