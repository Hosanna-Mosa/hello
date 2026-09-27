/**
 * `Image` from `expo-image`.
 *
 * Note what this is NOT for: there are no user photographs anywhere in this
 * product (PLAN §1). Every person is a preset illustrated avatar. This renders
 * those avatar assets and decorative illustration — never uploaded content.
 *
 * expo-image is used rather than RN's `Image` for its memory/disk cache, which
 * Phase 6 relies on to prefetch the next few deck avatars.
 */

import { Image, type ImageProps } from "expo-image";

export type PictureProps = ImageProps;

export function Picture(props: PictureProps) {
  return <Image {...props} />;
}
