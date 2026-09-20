/**
 * `KeyboardAvoidingView`.
 *
 * Defaults `behavior` per platform because the correct value genuinely differs
 * — iOS wants `padding`, Android wants `height` — and getting it wrong is the
 * usual reason a form's submit button hides under the keyboard.
 *
 * NOTE: this works for the wizard and auth forms, whose content can compress.
 * It does NOT work for the chat thread, where the content is a list that
 * absorbs any amount of space — see `useKeyboardInset`, which that screen uses
 * instead.
 */

import { KeyboardAvoidingView, type KeyboardAvoidingViewProps, Platform } from "react-native";

export type KeyboardAwareProps = KeyboardAvoidingViewProps;

export function KeyboardAware({ behavior, ...rest }: KeyboardAwareProps) {
  return (
    <KeyboardAvoidingView
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : "height")}
      {...rest}
    />
  );
}
