/**
 * The sidebar. Fixed from `lg` up; below that the same component slides in
 * as a drawer, so desktop and phone navigate through identical items.
 */

import { NAV_ITEMS } from "@/components/layout/navigation";
import { NavItem } from "@/components/layout/NavItem";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useSupportSummary } from "@/hooks/useSupportSummary";
import { cn } from "@/lib/cn";

type Props = { open: boolean; onClose: () => void };

export function Sidebar({ open, onClose }: Props) {
  const support = useSupportSummary();

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn("fixed inset-0 z-30 bg-ink/40 transition-opacity lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Close menu" onClick={onClose} icon={<Icon name="close" />} />
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map(({ badge, ...item }) => (
            <NavItem key={item.to} {...item} badge={badge === "support" ? (support?.unread ?? 0) : 0} onNavigate={onClose} />
          ))}
        </nav>
        <UserMenu />
      </aside>
    </>
  );
}
