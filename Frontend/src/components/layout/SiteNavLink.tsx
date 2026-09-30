import { NavLink } from "react-router";

import { cn } from "@/lib/cn";

type Props = { to: string; label: string; block?: boolean; onNavigate?: () => void };

/** One nav link; `block` for the stacked mobile menu. */
export function SiteNavLink({ to, label, block = false, onNavigate }: Props) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "rounded-full font-medium transition-colors",
          block ? "block px-4 py-3 text-base" : "px-3.5 py-2 text-sm",
          isActive ? "bg-primary-soft text-primary-deep" : "text-muted hover:bg-sunken hover:text-ink",
        )
      }
    >
      {label}
    </NavLink>
  );
}
