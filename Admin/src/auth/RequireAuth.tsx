/** Wraps every panel route. Signed out → the sign-in page, remembering where they were going. */

import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "@/auth/useAuth";
import { FullPageLoader } from "@/components/ui/FullPageLoader";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") return <FullPageLoader />;
  if (status === "signedOut") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
