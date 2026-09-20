/**
 * Distance, as a phrase.
 *
 * A2: kilometres, from one place. Switching the product to miles is a change
 * to this file and nothing else.
 *
 * Never renders a precise point. "2 km away" is deliberately coarse — exact
 * distance is a location-privacy leak, and the onboarding primer promises we
 * only ever show roughly how far.
 */

export type DistanceUnit = "km";

export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres) || metres < 0) return "Nearby";

  const km = metres / 1000;

  // Anything inside a kilometre is "less than", never "0 km" and never metres.
  if (km < 1) return "Less than 1 km away";

  // Under 10 km people care about the half; above it they do not.
  if (km < 10) {
    const rounded = Math.round(km * 2) / 2;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} km away`;
  }

  if (km < 100) return `${Math.round(km)} km away`;

  return "Over 100 km away";
}
