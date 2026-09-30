/**
 * Who is signed in. The SERVER decides — this only mirrors it.
 *
 * On load it asks `/auth/session`; the HttpOnly cookie either opens a session
 * or it does not. Nothing about the session is kept in localStorage, so there
 * is nothing on this device for anyone else to lift.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AuthContext, type AuthStatus } from "@/auth/AuthContext";
import { onUnauthorized } from "@/lib/api";
import { disconnectAdminSocket } from "@/lib/socket";
import { authService } from "@/services/admin.service";
import type { Admin } from "@/types/admin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");

  const signedOut = useCallback(() => {
    // The live connection goes with the session — never a socket without one.
    disconnectAdminSocket();
    setAdmin(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    onUnauthorized(signedOut);
    authService
      .session()
      .then((a) => {
        setAdmin(a);
        setStatus("signedIn");
      })
      .catch(signedOut);
    return () => onUnauthorized(null);
  }, [signedOut]);

  const login = useCallback(async (email: string, password: string) => {
    const a = await authService.login(email, password);
    setAdmin(a);
    setStatus("signedIn");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      signedOut();
    }
  }, [signedOut]);

  const value = useMemo(() => ({ status, admin, login, logout }), [status, admin, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
