import { cn } from "@/lib/cn";

const SIZES = { sm: "size-4 border-2", md: "size-6 border-2", lg: "size-10 border-[3px]" } as const;

export function Spinner({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin rounded-full border-current border-t-transparent", SIZES[size], className)}
    />
  );
}
