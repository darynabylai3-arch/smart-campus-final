import { Booking, Decision, Room } from "@/types";
import { MAX_BOOKING_MINUTES, MINUTES_PER_DAY, minutesToLabel } from "@/timeUtils";

export function checkAvailability(
  room: Room | null,
  start: number,
  end: number,
  currentMinutes: number,
  bookings: Booking[]
): Decision {
  if (!room) {
    return { status: "unavailable", reason: "Please select a room.", code: "NO_ROOM" };
  }

  // AC1: valid interval, start after current time
  if (!(Number.isFinite(start) && Number.isFinite(end))) {
    return { status: "unavailable", reason: "Enter valid start and end times.", code: "INVALID_TIME" };
  }
  if (!(0 <= start && start < end && end <= MINUTES_PER_DAY)) {
    return {
      status: "unavailable",
      reason: "Interval must have start before end, within 00:00-24:00.",
      code: "INVALID_RANGE",
    };
  }
  if (start <= currentMinutes) {
    return {
      status: "unavailable",
      reason: `Start time must be after the current time (${minutesToLabel(currentMinutes)}).`,
      code: "PAST_START",
    };
  }

  // AC2: max 120 minutes
  if (end - start > MAX_BOOKING_MINUTES) {
    return { status: "unavailable", reason: "Bookings cannot exceed 120 minutes.", code: "TOO_LONG" };
  }

  // AC3: blocked room
  if (room.blocked) {
    return {
      status: "unavailable",
      reason: `${room.name} is currently blocked and cannot be booked.`,
      code: "ROOM_BLOCKED",
    };
  }

  // AC4: overlap check (touching endpoints allowed)
  const roomBookings = bookings.filter((b) => b.roomId === room.id);
  const overlap = roomBookings.find((b) => start < b.end && end > b.start);
  if (overlap) {
    return {
      status: "unavailable",
      reason: `Overlaps existing booking "${overlap.title}" (${minutesToLabel(overlap.start)}-${minutesToLabel(overlap.end)}).`,
      code: "OVERLAP",
    };
  }

  return { status: "available", roomName: room.name, code: "AVAILABLE" };
}

// AC1 inline hints for the form; same start/end rules as checkAvailability. null = field not parsed yet.
export function getInputHints(
  startMin: number | null,
  endMin: number | null,
  currentMinutes: number | null
): { startInvalid: boolean; intervalInvalid: boolean; currentMissing: boolean } {
  return {
    currentMissing: currentMinutes === null,
    startInvalid: startMin !== null && currentMinutes !== null && startMin <= currentMinutes,
    intervalInvalid: startMin !== null && endMin !== null && !(startMin < endMin),
  };
}

export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}
