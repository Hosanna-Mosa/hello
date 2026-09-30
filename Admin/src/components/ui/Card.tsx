import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type Props = HTMLAttributes<HTMLDivElement> & { padded?: boolean };

export function Card({ padded = true, className, ...rest }: Props) {
  return <div className={cn("rounded-card border border-line bg-surface shadow-card", padded && "p-5 sm:p-6", className)} {...rest} />;
}
