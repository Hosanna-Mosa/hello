import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

/** Only below `lg`, where the sidebar is a drawer and needs a way to open. */
export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
      <Logo />
      <Button variant="ghost" size="sm" aria-label="Open menu" onClick={onMenu} icon={<Icon name="menu" size={20} />} />
    </header>
  );
}
