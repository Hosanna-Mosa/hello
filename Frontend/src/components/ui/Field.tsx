/** Label + control + hint/error. Every form control sits inside one. */

import type { ReactNode } from "react";

type Props = { id: string; label: string; hint?: string; error?: string | null; children: ReactNode };

export function Field({ id, label, hint, error, children }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
