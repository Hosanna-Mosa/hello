/**
 * Routes. Everything except /login sits behind <RequireAuth>, and the server
 * independently refuses every data call without a live session — the guard
 * here is for the operator's convenience, not the security boundary.
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { AuthProvider } from "@/auth/AuthProvider";
import { RedirectIfAuthed } from "@/auth/RedirectIfAuthed";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { FullPageLoader } from "@/components/ui/FullPageLoader";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const UsersPage = lazy(() => import("@/pages/UsersPage"));
const UserDetailPage = lazy(() => import("@/pages/UserDetailPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const SupportTicketPage = lazy(() => import("@/pages/SupportTicketPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            <Route element={<RedirectIfAuthed />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="users/:id" element={<UserDetailPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="support/:id" element={<SupportTicketPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
