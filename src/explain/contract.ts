import type { ReasonCode } from "@/types";

export const MAX_ROOM_LABEL = 60;
export const MAX_EXPLANATION = 280;

export const REASON_CODES: readonly ReasonCode[] = [
  "AVAILABLE",
  "NO_ROOM",
  "INVALID_TIME",
  "INVALID_RANGE",
  "PAST_START",
  "TOO_LONG",
  "ROOM_BLOCKED",
  "OVERLAP",
];

export interface ExplainInput {
  roomLabel: string;
  start: string; // HH:MM
  end: string; // HH:MM
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// Any clock-like token inside generated text (used to detect invented times).
const TIME_IN_TEXT = /\b\d{1,2}:\d{2}\b/g;

const NEGATIVE_SRC = "\\b(?:isn['’]t available|is not available|not available|unavailable|cannot be booked)\\b";
const NEGATIVE = new RegExp(NEGATIVE_SRC);
const NEGATIVE_G = new RegExp(NEGATIVE_SRC, "g");

const REASON_KEYWORDS: Record<ReasonCode, RegExp> = {
  OVERLAP: /\b(overlap\w*|conflict\w*)\b/,
  ROOM_BLOCKED: /\bblocked\b/,
  TOO_LONG: /\b120\b|too long|\bexceed\w*/,
  PAST_START: /current time|\bpassed\b|\bpast\b|\balready\b/,
  INVALID_RANGE: /^(?=[\s\S]*\bend\b)(?=[\s\S]*\bstart\b)/,
  INVALID_TIME: /\b(valid|invalid|time)\b/,
  NO_ROOM: /\broom\b/,
  AVAILABLE: /\b(available|free)\b/,
};
// Only these keywords are specific enough to reject when they belong to another reason code.
const DISTINCT_REASONS: readonly ReasonCode[] = ["OVERLAP", "ROOM_BLOCKED", "TOO_LONG", "PAST_START"];

export function validateExplainInput(input: ExplainInput): ValidationResult {
  // Defensive: callers may pass data that does not match the static type.
  const i = input as unknown as Record<string, unknown> | null;
  if (typeof i !== "object" || i === null) {
    return { ok: false, error: "Input must be an object." };
  }
  const { roomLabel, start, end, isAvailable, reasonCode } = i;

  if (typeof roomLabel !== "string" || roomLabel.trim().length === 0) {
    return { ok: false, error: "Room label must not be empty." };
  }
  if (roomLabel.length > MAX_ROOM_LABEL) {
    return { ok: false, error: `Room label must be at most ${MAX_ROOM_LABEL} characters.` };
  }
  if (typeof start !== "string" || !HHMM.test(start)) {
    return { ok: false, error: "Start must be in HH:MM format." };
  }
  if (typeof end !== "string" || !HHMM.test(end)) {
    return { ok: false, error: "End must be in HH:MM format." };
  }
  if (typeof reasonCode !== "string" || !REASON_CODES.includes(reasonCode as ReasonCode)) {
    return { ok: false, error: "Unknown reason code." };
  }
  if (typeof isAvailable !== "boolean") {
    return { ok: false, error: "isAvailable must be a boolean." };
  }
  if (isAvailable !== (reasonCode === "AVAILABLE")) {
    return { ok: false, error: "isAvailable does not agree with reasonCode." };
  }
  return { ok: true };
}

export function validateExplanation(text: string, input: ExplainInput): ValidationResult {
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "Explanation is empty." };
  }
  if (text.length > MAX_EXPLANATION) {
    return { ok: false, error: `Explanation is longer than ${MAX_EXPLANATION} characters.` };
  }

  // The room label is data, not a claim: remove it before any check, and pad times to HH:MM.
  const label = typeof input.roomLabel === "string" ? input.roomLabel.toLowerCase() : "";
  const withoutLabel = label.trim().length > 0 ? text.toLowerCase().split(label).join(" ") : text.toLowerCase();
  const lower = withoutLabel.replace(TIME_IN_TEXT, (t) => t.padStart(5, "0"));

  const sentences = lower.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 2) {
    return { ok: false, error: "Explanation has more than two sentences." };
  }

  if (/["“”]/.test(lower)) {
    return { ok: false, error: "Explanation contains quoted text." };
  }

  // A hostile label that itself reads "available" must not pass for an unavailable decision.
  if (!input.isAvailable && /\bavailable\b/.test(label)) {
    return { ok: false, error: "Room label reads as available but the room is unavailable." };
  }

  // Negated forms are stripped first so "not available" is never read as "available".
  // Synonyms "free" and "open" count as availability claims too (audit R-01); a negated
  // "not free" is also rejected for an unavailable decision, which fails closed to the fallback.
  const claimsUnavailable = NEGATIVE.test(lower) || /\bblocked\b/.test(lower);
  const claimsAvailable = /\b(available|free|open)\b/.test(lower.replace(NEGATIVE_G, " "));
  if (!input.isAvailable && claimsAvailable) {
    return { ok: false, error: "Explanation says available but the room is unavailable." };
  }
  if (input.isAvailable && claimsUnavailable) {
    return { ok: false, error: "Explanation says unavailable but the room is available." };
  }
  if (input.isAvailable && /\b(booked|occupied)\b/.test(lower)) {
    return { ok: false, error: "Explanation says booked or occupied but the room is available." };
  }

  // Reason: a keyword of the right code is required when a reason is given (always for AVAILABLE),
  // and a distinctive keyword of another code is always rejected.
  if ((input.isAvailable || /\bbecause\b/.test(lower)) && !REASON_KEYWORDS[input.reasonCode].test(lower)) {
    return { ok: false, error: "Explanation does not give the reason for the decision." };
  }
  for (const code of DISTINCT_REASONS) {
    if (code !== input.reasonCode && REASON_KEYWORDS[code].test(lower)) {
      return { ok: false, error: `Explanation gives a reason that does not match ${input.reasonCode}.` };
    }
  }

  const times = lower.match(TIME_IN_TEXT) ?? [];
  for (const t of times) {
    if (t !== input.start && t !== input.end) {
      return { ok: false, error: `Explanation mentions an unsupplied time (${t}).` };
    }
  }
  return { ok: true };
}
