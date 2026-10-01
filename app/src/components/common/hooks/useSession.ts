/**
 * Who is signed in, and how far through onboarding they are.
 *
 * Phase 2 held the state inline because the store layer did not exist yet.
 * Phase 3 moved it to `src/stores/session.store.ts` and this is now a thin read
 * over it, which is the layering PLAN asks for: screens → hooks → stores →
 * services.
 *
 * Honest note: the shape did change slightly in the move. `signIn(user)` became
 * `verifyCode(code)` (since replaced by `login` / `signup`) and `user` is now the full `User` entity rather than a
 * structural stand-in, because the store talks to real services. Nothing
 * consumed the old shape — no screens exist yet — so nothing broke.
 */

import { useSessionStore, type SessionState, type SessionStatus } from "@/stores/session.store";

export type { SessionState, SessionStatus };

export function useSession(): SessionState {
  return useSessionStore();
}

export { useSessionStore };
