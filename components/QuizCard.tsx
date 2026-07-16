"use client";

import { useState } from "react";
import type { QuizResponse } from "@/lib/types";

interface QuizCardProps {
  quiz: QuizResponse;
  onCorrectAnswer: (xpGain: number) => void;
}

export default function QuizCard({ quiz, onCorrectAnswer }: QuizCardProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleOptionSelect(idx: number) {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);

    if (idx === quiz.correctIndex) {
      // Award 20 XP for a correct answer!
      onCorrectAnswer(20);
    } else {
      // Award 5 XP just for attempting! Encouragement matters.
      onCorrectAnswer(5);
    }
  }

  return (
    <div className="flu-quiz-card">
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
            if (idx === quiz.correctIndex) {
              btnClass = "correct"; // Correct option always turns green
            } else if (idx === selectedIdx && selectedIdx !== quiz.correctIndex) {
              btnClass = "incorrect"; // Wrong choice turns red
            } else {
              btnClass = "disabled";
            }
          }

          return (
            <button
              key={option}
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
            {selectedIdx === quiz.correctIndex ? (
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
