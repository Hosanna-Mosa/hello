import { cn } from "@/lib/cn";

const LABELS = ["Sign in", "Confirm"];

/** 1 · 2 progress for the deletion form. `current` is 0-based; 2 = finished. */
export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
      {LABELS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                state === "todo" ? "bg-sunken text-muted" : "bg-primary text-on-primary",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("text-sm font-medium", state === "todo" ? "text-muted" : "text-ink")}>{label}</span>
            {i < LABELS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}
