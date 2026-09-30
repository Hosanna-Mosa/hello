import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const WIDTHS = { narrow: "max-w-3xl", default: "max-w-6xl" } as const;

type Props = HTMLAttributes<HTMLDivElement> & { width?: keyof typeof WIDTHS };

/** The page gutter and max width. Every page's content sits inside one. */
export function Container({ width = "default", className, ...rest }: Props) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", WIDTHS[width], className)} {...rest} />;
}
