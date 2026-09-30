import { useEffect } from "react";

import { site } from "@/config/site";

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · ${site.appName}`;
  }, [title]);
}
