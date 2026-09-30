import { NavLink } from "react-router";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type Props = { to: string; label: string; icon: IconName; end?: boolean; badge?: number; onNavigate?: () => void };

export function NavItem({ to, label, icon, end, badge = 0, onNavigate }: Props) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
          isActive ? "bg-primary-soft text-primary-hover" : "text-muted hover:bg-sunken hover:text-ink",
        )
      }
    >
      <Icon name={icon} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span
          aria-label={`${badge} need attention`}
          className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-xs font-semibold text-on-primary"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}
