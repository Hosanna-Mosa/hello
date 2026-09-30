import { createContext } from "react";

import type { Admin } from "@/types/admin";

export type AuthStatus = "checking" | "signedIn" | "signedOut";

export type AuthValue = {
  status: AuthStatus;
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);