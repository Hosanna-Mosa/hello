/**
 * Which of the four states a screen is in.
 *
 * Every list surface in this product has the same four: loading, error, empty,
 * content. PLAN treats each as a real screen, so deriving them in one place
 * stops each screen inventing its own precedence — and the precedence is the
 * part that goes wrong. Error beats empty: a failed fetch returns no rows, and
 * showing "no one nearby" for a network failure tells the user a lie.
 */

export type AsyncStatus = "loading" | "error" | "empty" | "content";

export type AsyncStatusInput<T> = {
  isLoading: boolean;
  error?: unknown;
  data?: T | readonly T[] | null;
};

export function useAsyncStatus<T>({
  isLoading,
  error,
  data,
}: AsyncStatusInput<T>): AsyncStatus {
  if (isLoading) return "loading";
  if (error) return "error";

  if (data == null) return "empty";
  if (Array.isArray(data) && data.length === 0) return "empty";

  return "content";
}
