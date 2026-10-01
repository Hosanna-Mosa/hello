/**
 * "New here? Create an account" — a quiet prompt and the link that answers it.
 *
 * The prompt is a plain `Text` inside the `Body`, not a second text wrapper:
 * wrappers never nest (M2), and keeping it one line lets the pair wrap as a
 * sentence on a narrow phone.
 */

import { Body } from "@/components/common/atoms/Body";
import { Label } from "@/components/common/atoms/Label";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type TextLinkProps = {
  prompt: string;
  link: string;
  onPress: () => void;
};

export function TextLink({ prompt, link, onPress }: TextLinkProps) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${prompt} ${link}`}
      hitSlop={12}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignSelf: "center",
        gap: theme.spacing.xs,
        minHeight: 44,
        alignItems: "center",
      }}
    >
      <Body color="textSecondary">{prompt}</Body>
      <Label color="accent" style={{ textDecorationLine: "underline" }}>
        {link}
      </Label>
    </Tappable>
  );
}
