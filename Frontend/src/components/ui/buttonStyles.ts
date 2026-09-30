/**
 * The button look, shared by <Button> and <ButtonLink> so a link that looks
 * like a button is exactly the same button, on every page.
 */

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-sunken",
  ghost: "bg-transparent text-muted hover:bg-sunken hover:text-ink",
  danger: "bg-danger text-white hover:brightness-95 shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-6 text-base gap-2",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", full = false): string {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition duration-200",
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:scale-100",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
  );
}
