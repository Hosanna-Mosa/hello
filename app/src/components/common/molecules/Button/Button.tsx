/**
 * The button.
 *
 * Four variants because there are exactly four jobs: the one action on a
 * screen (`primary`), an alternative to it (`secondary`), a quiet escape
 * (`ghost`), and something you cannot undo (`destructive` — unmatch, block,
 * delete account).
 *
 * While `loading`, it stays mounted at the same size and swaps the label for a
 * spinner. Collapsing it would reflow the screen under the user's thumb.
 */

import { Label } from "@/components/common/atoms/Label";
import { Spinner } from "@/components/common/atoms/Spinner";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";
import type { ColorTokens } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Full width is the default — these mostly sit pinned above the home indicator. */
  inline?: boolean;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  inline = false,
}: ButtonProps) {
  const theme = useTheme();

  const palette: Record<ButtonVariant, { background: string; text: keyof ColorTokens; border: string }> = {
    primary: { background: theme.color.accent, text: "onAccent", border: theme.color.accent },
    secondary: { background: theme.color.surface, text: "textPrimary", border: theme.color.borderStrong },
    ghost: { background: "transparent", text: "textSecondary", border: "transparent" },
    destructive: { background: theme.color.danger, text: "onDanger", border: theme.color.danger },
  };

  const { background, text, border } = palette[variant];
  const inert = disabled || loading;

  return (
    <Tappable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      style={({ pressed }) => ({
        backgroundColor:
          pressed && variant === "primary" ? theme.color.accentPressed : background,
        borderColor: border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        // 44pt minimum touch target (A10).
        minHeight: 48,
        paddingHorizontal: theme.spacing.xl,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: inline ? "flex-start" : "stretch",
        opacity: inert ? 0.5 : 1,
      })}
    >
      {loading ? <Spinner color={theme.color[text]} /> : <Label color={text}>{label}</Label>}
    </Tappable>
  );
}
