/** The frame every signed-in page renders inside. */

import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { connectAdminSocket, disconnectAdminSocket } from "@/lib/socket";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [live, setLive] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // One live connection for as long as someone is signed in — this shell only
  // renders behind <RequireAuth>. Pages mount after it exists, so their
  // subscriptions have a socket to bind to.
  useEffect(() => {
    connectAdminSocket();
    setLive(true);
    return () => disconnectAdminSocket();
  }, []);

  if (!live) return null;

  return (
    <div className="min-h-dvh">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
