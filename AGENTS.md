# AGENTS.md — repo root

A platonic friend-finding mobile app. **Frontend first, mock data, no backend.**

## Layout

| Path | What |
|---|---|
| `app/` | The Expo app. **All code lives here.** See `app/AGENTS.md` before writing any. |
| `docs/` | `api-contract.md` (for the future backend), `design-prompts.md` |
| `backend/` | Intentionally empty this phase |
| `PLAN.md` | Source of truth: scope, 11 phases, locked decisions, assumptions, risks |

**Working directory is `app/` for every build, test and typecheck command.**

## Before doing anything

1. Read `PLAN.md` — §1 locked decisions, §2 version-critical facts, §3 standing constraints.
2. Read `app/AGENTS.md` — the rules that apply while writing code.
3. Locked decisions are **settled**. Do not relitigate them mid-build.

## Hard rules — these apply everywhere

- **Never run a version-control command.** No commits, no branches, no staging.
  Work is left uncommitted in the working copy for its owner.
  *Copy a file before any destructive edit — "revert to last commit" is not available.*
- **A task is never ticked in PLAN.md until its phase's verification block passes.**
  "It compiles" is not done. "It renders on both platforms and I navigated to it
  by hand" is done.
- **Park what you find; never stop for it.** You broke it → fix it. You found it
  broken → log it in PLAN.md §8 and carry on.
- **Evidence** (screenshots) is kept in platform-labelled folders **outside the repo**.
- **Never compare iOS against Android.** Each platform matches only itself.
