"use client";

import { useState } from "react";
import type { QuizResponse } from "@/lib/types";

interface QuizCardProps {
  quiz: QuizResponse;
  onCorrectAnswer: (xpGain: number, patternName?: string) => void;
}

export default function QuizCard({ quiz, onCorrectAnswer }: QuizCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  // Guard correctIndex bounds (e.g. when options length changed)
  const correctIndex =
    typeof quiz.correctIndex === "number" &&
    quiz.correctIndex >= 0 &&
    quiz.correctIndex < quiz.options.length
      ? quiz.correctIndex
      : 0;

  function handleOptionSelect(idx: number) {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);

    if (idx === correctIndex) {
      // Award 20 XP for a correct answer!
      onCorrectAnswer(20, quiz.targetedPattern || undefined);
    } else {
      // Award 5 XP just for attempting! Encouragement matters.
      onCorrectAnswer(5, quiz.targetedPattern || undefined);
    }
  }

  return (
    <div className="flu-quiz-card">
      {/* DNA Framing Line */}
      {quiz.targetedPattern && (
        <div className="flu-quiz-framing">
          🎯 This one&apos;s for your <strong>{quiz.targetedPattern.toLowerCase()}</strong> pattern — let&apos;s squash it!
        </div>
      )}

      {/* Quiz Header */}
      <div className="flu-quiz-header" aria-hidden="true">
        <span>📝</span>
        <h4>Max&apos;s English Challenge</h4>
      </div>

      {/* Question */}
      <p className="flu-quiz-question">{quiz.question}</p>

      {/* Options */}
      <div className="flu-quiz-options">
        {quiz.options.map((option, idx) => {
          let btnClass = "";
          if (answered) {
            if (idx === correctIndex) {
              btnClass = "correct"; // Correct option always turns green
            } else if (idx === selectedIdx && selectedIdx !== correctIndex) {
              btnClass = "incorrect"; // Wrong choice turns red
            } else {
              btnClass = "disabled";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              className={`flu-quiz-opt-btn ${btnClass}`}
              disabled={answered}
              onClick={() => handleOptionSelect(idx)}
            >
              {option}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && (
        <div className="flu-quiz-feedback">
          <div className="flu-quiz-feedback-title">
            {selectedIdx === correctIndex ? (
              <span className="text-success">🎉 Correct! (+20 XP)</span>
            ) : (
              <span className="text-error">Good attempt! (+5 XP)</span>
            )}
          </div>
          <p className="flu-quiz-explanation">{quiz.explanation}</p>
        </div>
      )}
    </div>
  );
}
