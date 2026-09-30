import { useState } from "react";

import { useAuth } from "@/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/** The signed-in admin, and sign-out. Sits at the foot of the sidebar. */
export function UserMenu() {
  const { admin, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!admin) return null;

  const signOut = async () => {
    setBusy(true);
    await logout();
  };

  return (
    <div className="border-t border-line p-4">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={admin.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{admin.name}</p>
          <p className="truncate text-xs text-muted">{admin.email}</p>
        </div>
      </div>
      <Button variant="secondary" size="sm" fullWidth loading={busy} onClick={signOut} icon={<Icon name="logout" size={16} />}>
        Sign out
      </Button>
    </div>
  );
}
