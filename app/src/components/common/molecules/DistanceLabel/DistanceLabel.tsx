/**
 * "2 km away".
 *
 * Exists so no screen ever formats a distance itself. Switching to miles is a
 * change in `formatDistance` and nothing here.
 */

import { Caption, type CaptionProps } from "@/components/common/atoms/Caption";
import { formatDistance } from "@/components/common/utils/formatDistance";

export type DistanceLabelProps = Omit<CaptionProps, "children"> & {
  /** Distance in metres. */
  metres: number;
};

export function DistanceLabel({ metres, ...rest }: DistanceLabelProps) {
  return <Caption {...rest}>{formatDistance(metres)}</Caption>;
}
