import { MistakeLogEntry, MistakePattern } from "./types";

/**
 * Canonical normalisation for error-type strings.
 * Always lowercase + trimmed so lookups are case-insensitive by construction.
 */
export function normalizeErrorType(s: string): string {
  return s.toLowerCase().trim();
}

const LOCAL_STORAGE_KEY = "flu-mistake-log";

/** Helper to safe-parse the log from localStorage */
export function getMistakeLog(): MistakeLogEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as MistakeLogEntry[];
  } catch (e) {
    console.error("Failed to parse mistake log:", e);
    return [];
  }
}

/** Save log back to localStorage */
export function saveMistakeLog(log: MistakeLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(log));
  } catch (e) {
    console.error("Failed to save mistake log:", e);
  }
}

/** Add a single mistake entry to the log */
export function addMistakeToLog(errorType: string, snippet: string): void {
  const cleanType = (errorType || "").trim();
  const cleanSnippet = (snippet || "").trim();
  if (!cleanType || !cleanSnippet) return;
  const log = getMistakeLog();
  const newEntry: MistakeLogEntry = {
    error_type: cleanType,
    snippet: cleanSnippet,
    timestamp: Date.now(),
  };
  log.push(newEntry);
  saveMistakeLog(log);
}

/** Aggregate mistake log entries into patterns sorted by frequency and recency */
export function getMistakePatterns(): MistakePattern[] {
  const log = getMistakeLog();
  const groups: Record<string, { count: number; examples: Set<string>; lastSeen: number; originalName: string }> = {};

  log.forEach((entry) => {
    const errorType = entry.error_type || "grammar";
    const key = normalizeErrorType(errorType);

    if (!groups[key]) {
      groups[key] = {
        count: 0,
        examples: new Set<string>(),
        lastSeen: 0,
        originalName: errorType, // Keep the first casing we see
      };
    }

    groups[key].count += 1;
    groups[key].examples.add(entry.snippet);
    if (entry.timestamp > groups[key].lastSeen) {
      groups[key].lastSeen = entry.timestamp;
    }
  });

  const patterns: MistakePattern[] = Object.keys(groups).map((key) => {
    const group = groups[key];
    return {
      errorType: group.originalName,
      count: group.count,
      examples: Array.from(group.examples),
      lastSeen: group.lastSeen,
    };
  });

  // Sort by count descending, then by lastSeen descending
  return patterns.sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen);
}

/** 
 * Improve on a pattern by removing its oldest log entry.
 * Returns true if a log entry was successfully removed (count decreased).
 */
export function improveMistakePattern(errorType: string): boolean {
  if (!errorType) return false;
  const targetKey = normalizeErrorType(errorType);
  const log = getMistakeLog();

  // Find the index of the OLDEST (first in log since we append) entry of this pattern
  const idx = log.findIndex((entry) => normalizeErrorType(entry.error_type || "") === targetKey);

  if (idx !== -1) {
    log.splice(idx, 1);
    saveMistakeLog(log);
    return true;
  }

  return false;
}

/** Clear the mistake log (e.g. on Restart Demo) */
export function clearMistakeLog(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}
