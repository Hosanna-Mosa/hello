import type { SelectHTMLAttributes } from "react";

import { controlClass } from "@/components/ui/controlStyles";
import { cn } from "@/lib/cn";

export type Option = { value: string; label: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & { options: Option[] };

export function Select({ options, className, ...rest }: Props) {
  return (
    <select className={cn(controlClass, "cursor-pointer pr-8", className)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
