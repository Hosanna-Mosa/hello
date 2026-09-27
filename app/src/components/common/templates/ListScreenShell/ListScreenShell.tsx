/**
 * A list screen and its four states.
 *
 * PLAN treats loading, empty, error and content as four real screens. This is
 * where that branch lives, once, so twenty screens cannot each invent their own
 * precedence — and the precedence is the part that goes wrong. `useAsyncStatus`
 * puts error ahead of empty: a failed request returns no rows, and rendering
 * "no one nearby" for a network failure tells the user something untrue.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/common/atoms/Box";
import type { AsyncStatus } from "@/components/common/hooks/useAsyncStatus";
import { useTheme } from "@/components/common/hooks/useTheme";
import { EmptyState, type EmptyStateProps } from "@/components/common/molecules/EmptyState";
import { ErrorState, type ErrorStateProps } from "@/components/common/molecules/ErrorState";
import { TabScreenShell } from "@/components/common/templates/TabScreenShell";

export type ListScreenShellProps = {
  status: AsyncStatus;
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
  leading?: ReactNode;
  /** Skeleton rows or tiles — shaped like the content they stand in for. */
  loading?: ReactNode;
  empty: EmptyStateProps;
  /**
   * Replaces the default `EmptyState` entirely, and drops the header with it.
   * Home uses this: the design gives its empty state the whole screen.
   */
  emptyNode?: ReactNode;
  error?: ErrorStateProps;
};

export function ListScreenShell({
  status,
  children,
  title,
  actions,
  leading,
  loading,
  empty,
  emptyNode,
  error,
}: ListScreenShellProps) {
  const theme = useTheme();

  function body() {
    if (status === "loading") {
      return (
        <Box style={{ flex: 1, padding: theme.spacing.xl, gap: theme.spacing.md }}>
          {loading}
        </Box>
      );
    }
    if (status === "error") return <ErrorState {...error} />;
    if (status === "empty") return emptyNode ?? <EmptyState {...empty} />;
    return children;
  }

  return (
    <TabScreenShell title={title} actions={actions} leading={leading}>
      {body()}
    </TabScreenShell>
  );
}
