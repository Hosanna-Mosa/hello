/** The sign-in page is only for the signed-out. */

import { Navigate, Outlet } from "react-router";

import { useAuth } from "@/auth/useAuth";
import { FullPageLoader } from "@/components/ui/FullPageLoader";

export function RedirectIfAuthed() {
  const { status } = useAuth();
  if (status === "checking") return <FullPageLoader />;
  if (status === "signedIn") return <Navigate to="/" replace />;
  return <Outlet />;
}
