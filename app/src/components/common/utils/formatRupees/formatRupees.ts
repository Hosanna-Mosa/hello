/**
 * Money, as the app shows it: Indian rupees, always.
 *
 * The ONE place a price becomes text — the same rule as `formatDistance` for
 * km. The product is INR-only, so the currency is fixed here rather than read
 * from the data: a stray non-INR value from the server still renders as
 * rupees instead of leaking a £ or $ into the UI.
 *
 * Amounts arrive in paise (integer minor units — money is never a float) and
 * show as whole rupees with Indian digit grouping: 149900 → "₹1,499".
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupees(paise: number): string {
  return INR.format(Math.round(paise) / 100);
}
