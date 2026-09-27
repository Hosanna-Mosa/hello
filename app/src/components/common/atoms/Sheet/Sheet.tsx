/**
 * `Modal`, and nothing more.
 *
 * The thinnest possible layer: every prop passes through untouched. It exists
 * so that no component ever imports `Modal` directly — the last primitive that
 * was still reached for raw, in five places.
 *
 * Named `Sheet` rather than `Modal` because `Modal` is also the name of the
 * React Native export it wraps, and a wrapper that shadows its own import reads
 * as a mistake at every call site.
 *
 * `transparent` defaults to true: every overlay in this app draws its own
 * scrim, and the one prop everybody forgets turns the scrim into an opaque
 * full-screen page.
 */

import { Modal, type ModalProps } from "react-native";

export type SheetProps = ModalProps;

export function Sheet({ transparent = true, ...rest }: SheetProps) {
  return <Modal transparent={transparent} {...rest} />;
}
