/**
 * The loading / error / ready switch every data view goes through, so all of
 * them fail and load the same way.
 */

import type { ReactNode } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type Props<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: (data: T) => ReactNode;
};

export function AsyncContent<T>({ data, loading, error, onRetry, children }: Props<T>) {
  if (error) {
    return (
      <Alert action={<Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}>
        {error}
      </Alert>
    );
  }
  if (data === null) {
    return (
      <div className="grid place-items-center py-16 text-primary">
        <Spinner size="lg" />
      </div>
    );
  }
  return <div className={loading ? "opacity-60 transition-opacity" : undefined}>{children(data)}</div>;
}
