import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl" } as const;

/** Initials only — the product has no photos, anywhere. */
export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary-hover", SIZES[size])}>
      {initials(name)}
    </span>
  );
}
