import type { IconName } from "@/components/ui/Icon";

/** The sidebar, in one list. Add a page here and it appears on every device. */
export const NAV_ITEMS: { to: string; label: string; icon: IconName; end?: boolean; badge?: "support" }[] = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/users", label: "Users", icon: "users" },
  { to: "/reports", label: "Reports", icon: "flag" },
  // The badge counts tickets with a user reply nobody has opened — kept live.
  { to: "/support", label: "Support", icon: "message", badge: "support" },
];
