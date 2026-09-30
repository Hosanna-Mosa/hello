import { Link } from "react-router";

import { site } from "@/config/site";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${site.appName} home`}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-lg font-bold text-on-primary">
        {site.appName.charAt(0)}
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">{site.appName}</span>
    </Link>
  );
}
