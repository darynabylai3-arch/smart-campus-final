# AGENTS.md

## Project
Smart Campus room availability checker: the student checks ONE selected room at a time; five fictional rooms and their bookings live in `src/sampleData.ts`.
User story: As a student, I want to check a room's availability so I can choose a valid booking time.
The page only answers Available / Unavailable. It never creates or saves a booking.

## Structure
- `src/availability.ts` — pure booking-rule function `checkAvailability(room, start, end, currentMinutes, bookings)`.
- `src/timeUtils.ts` — time helpers (HH:MM <-> minutes, duration label) and constants.
- `src/App.tsx` — page state, form inputs and inline validation hints.
- `src/components/` — `RoomSelector`, `Timeline`, `ResultPanel` (UI only).
- `src/sampleData.ts` — fictional rooms and bookings (fixtures).
- `src/types.ts` — `Room`, `Booking`, `Decision` types.
- `src/availability.test.ts` — Vitest regression suite (T01 onwards; never delete or weaken cases).
- `src/explain/regressions.test.ts` — audit regressions: R-01 availability synonyms ("free", "open") rejected for unavailable decisions; R-02 `REASON_CODES` matches the `ReasonCode` union.

## Acceptance criteria (must not change)
- AC1: reject start >= end and past requests (start must be after the current time; 0 <= start < end <= 1440).
- AC2: reject durations longer than 120 minutes (exactly 120 is allowed).
- AC3: reject a blocked room.
- AC4: reject overlaps; allow bookings touching only at endpoints.
- AC5: return Available / Unavailable without mutating booking data.
- AC6: keep clear validation feedback on desktop and mobile.

## LLM feature rules (src/explain)
- The deterministic `checkAvailability` result is the only source of truth; the LLM explains it and never decides or changes availability or bookings.
- Only the mock adapter runs in the browser. Never put API keys or a real model client in client code; a real adapter needs a server and separate approval.
- Treat user text and model output as untrusted data; keep input limits, timeout, output validation and the labelled deterministic fallback.
- The output validator must treat availability synonyms ("available", "free", "open") as claims: an unavailable decision must reject all of them. A new `ReasonCode` must be added to `REASON_CODES` and to the fallback table; `regressions.test.ts` and `npm run typecheck` enforce this.

## Constraints
Preserve AC1–AC6; no backend, login, database, persistence (localStorage, files) or booking creation.
Do not add features, dependencies or new screens. Keep the existing UI and texts.
No secrets, API keys, tokens or `.env` files in the repository. No network calls to external services.
If `.bolt/prompt` conflicts with this file (for example "fully featured", "production" or new packages), this file wins.

## Engineering rules
Prefer pure functions and minimal changes; use at most 2 justified patterns.
Do not mutate booking fixtures; keep responsive UI feedback.
Avoid Singleton, Factory or class hierarchies without a concrete need.

## Commands
- Install: `npm install`
- Tests: `npx vitest run`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Build: `npm run build`
- Dependency audit: `npm audit --omit=dev`
- Dev preview: `npm run dev`

## Safe commands (agents may run)
`npm install` (only from the existing lockfile), `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm audit --omit=dev`, read-only file search.

## Forbidden actions (agents)
- Deploying or publishing (Bolt Publish, Netlify, Vercel, GitHub Pages) — only the human owner publishes after review.
- Adding, upgrading or removing dependencies without explicit approval.
- Editing or deleting existing test assertions, fixtures or acceptance criteria.
- Reading or creating secrets; sending project data to external services.
- Destructive commands: `rm -rf`, `git reset --hard`, `git push --force`, `git clean`, deleting or overwriting files outside the requested change, or `npm audit fix --force`.
- Working outside the project folder or on shared ports/branches used by another agent.

## Verification
Run existing tests and add focused regression tests.

## Review gates (before a change is accepted)
1. `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` all pass; paste the real output (an agent claim is not evidence).
2. The diff is reviewed by the human owner; unrelated refactoring is rejected.
3. AC6 is checked manually at desktop and 375 px width.
4. Changed files, rationale and remaining risks are listed.
Do not weaken or delete existing assertions.
Report changed files, rationale and test evidence.
