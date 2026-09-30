import type { InputHTMLAttributes, ReactNode } from "react";

import { controlClass } from "@/components/ui/controlStyles";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode; trailing?: ReactNode };

export function Input({ leading, trailing, className, ...rest }: Props) {
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint">{leading}</span>}
      <input className={cn(controlClass, Boolean(leading) && "pl-9", Boolean(trailing) && "pr-10", className)} {...rest} />
      {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
    </div>
  );
}
