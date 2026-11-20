import { describe, it, expect } from "vitest";
import type { ReasonCode } from "@/types";
import { ExplainInput, REASON_CODES, validateExplanation } from "./contract";
import { fallbackExplanation } from "./explainAvailability";

// Audit risk R-01: the output validator rejected "available" for an unavailable
// decision but accepted the synonyms "free" and "open" (confirmed by probe).
// Audit risk R-02: REASON_CODES was not linked to the ReasonCode union, so a new
// code could be missing from the runtime list without any failing check.

const unavailable: ExplainInput = {
  roomLabel: "Aurora Hall",
  start: "10:30",
  end: "11:30",
  isAvailable: false,
  reasonCode: "OVERLAP",
};

describe("R-01 synonym claims of availability are rejected for unavailable decisions", () => {
  it("rejects 'free' for an unavailable decision", () => {
    const text = "Aurora Hall is free from 10:30 to 11:30 because it overlaps an existing booking.";
    expect(validateExplanation(text, unavailable).ok).toBe(false);
  });

  it("rejects 'open' for an unavailable decision", () => {
    const text = "Aurora Hall is open from 10:30 to 11:30 because it overlaps an existing booking.";
    expect(validateExplanation(text, unavailable).ok).toBe(false);
  });

  it("still rejects 'available' for an unavailable decision (control)", () => {
    const text = "Aurora Hall is available from 10:30 to 11:30 because it overlaps an existing booking.";
    expect(validateExplanation(text, unavailable).ok).toBe(false);
  });

  it("accepts a correct negative explanation for an unavailable decision", () => {
    const text = "Aurora Hall is not available from 10:30 to 11:30 because it overlaps an existing booking.";
    expect(validateExplanation(text, unavailable).ok).toBe(true);
  });

  it("accepts a correct positive explanation for an available decision", () => {
    const available: ExplainInput = { ...unavailable, isAvailable: true, reasonCode: "AVAILABLE" };
    const text = "Aurora Hall is available from 10:30 to 11:30. This is only a check, not a booking.";
    expect(validateExplanation(text, available).ok).toBe(true);
  });
});

describe("R-02 reason-code list stays complete", () => {
  // Typed as a Record over the ReasonCode union: adding or removing a code in types.ts
  // fails `npm run typecheck` until this object is updated.
  const allCodes: Record<ReasonCode, true> = {
    AVAILABLE: true,
    NO_ROOM: true,
    INVALID_TIME: true,
    INVALID_RANGE: true,
    PAST_START: true,
    TOO_LONG: true,
    ROOM_BLOCKED: true,
    OVERLAP: true,
  };

  it("REASON_CODES lists exactly the ReasonCode union", () => {
    expect([...REASON_CODES].sort()).toEqual(Object.keys(allCodes).sort());
  });

  it("every reason code has a specific fallback, not the generic text", () => {
    const generic = fallbackExplanation("__unknown_code__");
    for (const code of REASON_CODES) {
      expect(fallbackExplanation(code)).not.toBe(generic);
    }
  });
});
