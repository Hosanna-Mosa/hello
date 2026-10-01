/**
 * A password field with a show / hide toggle.
 *
 * Hidden by default. The toggle exists because a mistyped password the person
 * cannot see is the most common reason a correct sign-up turns into a failed
 * sign-in a minute later.
 *
 * `autoCorrect` and `autoCapitalize` are forced off, and `secureTextEntry`
 * keeps the keyboard from learning the value or offering it as a suggestion.
 */

import { useState } from "react";

import { Box } from "@/components/common/atoms/Box";
import { Icon } from "@/components/common/atoms/Icon";
import { Input, type InputProps } from "@/components/common/atoms/Input";
import { Tappable } from "@/components/common/atoms/Tappable";
import { useTheme } from "@/components/common/hooks/useTheme";

export type PasswordInputProps = Omit<InputProps, "secureTextEntry" | "autoCorrect" | "autoCapitalize"> & {
  /** Accessibility labels for the toggle, from `copy`. */
  showLabel: string;
  hideLabel: string;
};

export function PasswordInput({ showLabel, hideLabel, style, ...rest }: PasswordInputProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Box style={{ justifyContent: "center" }}>
      <Input
        {...rest}
        secureTextEntry={!visible}
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        // Room for the toggle, so a long password never runs under it.
        style={[{ paddingRight: 44 + theme.spacing.sm }, style]}
      />
      <Tappable
        onPress={() => setVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={visible ? hideLabel : showLabel}
        hitSlop={8}
        style={{
          position: "absolute",
          right: 0,
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          name={
            visible
              ? { ios: "eye.slash", android: "visibility_off" }
              : { ios: "eye", android: "visibility" }
          }
          size={20}
          color="textSecondary"
        />
      </Tappable>
    </Box>
  );
}
