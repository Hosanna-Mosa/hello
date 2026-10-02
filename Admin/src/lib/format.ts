/** Display formatting, in one place so every page renders values alike. */

const number = new Intl.NumberFormat();
const date = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const dateTime = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatNumber = (n: number) => number.format(n);
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
/** Integer paise → "₹299.00". The product's only currency. */
export const formatInr = (paise: number) => inr.format(paise / 100);
export const formatDate = (iso: string | null) => (iso ? date.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null) => (iso ? dateTime.format(new Date(iso)) : "—");

export function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days}d ago` : formatDate(iso);
}

/** "pendingDeletion" → "Pending deletion". */
export function humanize(value: string): string {
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
