# CLAUDE.md

Claude Code loads this file automatically. The project's full rules are in `AGENTS.md`; the parts that matter most for every session are pasted below so they apply even if `AGENTS.md` is not read. If the two disagree, `AGENTS.md` wins.

## Project
Smart Campus room availability checker (React + TypeScript + Vite). The deterministic rules in `src/availability.ts` decide Available / Unavailable. The optional "Explain availability" feature only explains that decision and must never change it. No backend, login, database, or booking creation.

## Safe commands (may run)
- `npx vitest run`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `npm ci` (only from the existing `package-lock.json`)
- read-only file search

## Forbidden actions
- No secrets, API keys, tokens, or `.env` files; no network calls to external services.
- No production deployments or publishing (Netlify, Vercel, GitHub Pages, Bolt Publish). Only the human owner publishes.
- No dependency changes (add, upgrade, remove) without explicit owner approval. Do not run `npm audit fix --force`.
- No destructive commands (`rm -rf`, `git reset --hard`, `git push --force`, `git clean`) or edits outside the requested change.
- Do not edit or delete existing test assertions, fixtures, or acceptance criteria AC1–AC6.

## Review gates
1. `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` all pass; paste the real output.
2. The owner reviews every diff; unrelated refactoring is rejected.
3. AC6 is checked at desktop and 375 px width.
4. Changed files, rationale and remaining risks are listed.

## Coding conventions
Prefer pure functions and minimal changes. At most two justified patterns; no Singleton, Factory or class hierarchies without a concrete need. The output validator must treat "available", "free" and "open" as availability claims.
