/**
 * Every fact about the product and the company the site states, in ONE place.
 *
 * ⚠ Before submitting to Google Play, replace every value marked TODO. The
 * policy pages quote these verbatim — a placeholder email in a privacy policy
 * is a rejection reason on its own.
 */

export const site = {
  appName: "Hello",
  tagline: "Make friends nearby",
  /** TODO: the legal name of the developer, exactly as on the Play Console. */
  company: "Hello App",
  /** TODO: a monitored inbox. Play checks that this works. */
  supportEmail: "support@hello-app.example",
  /** TODO: a monitored inbox for privacy and data-protection requests. */
  privacyEmail: "privacy@hello-app.example",
  /** TODO: the named child-safety point of contact Google Play requires. */
  safetyEmail: "safety@hello-app.example",
  /** TODO: the company's postal address, for legal notices. */
  address: "Address to be added",
  /** TODO: the jurisdiction whose law governs the Terms. */
  governingLaw: "India",
  androidPackage: "com.hosanna4189.Hello",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.hosanna4189.Hello",
  minimumAge: 18,
  /**
   * Account deletion is INSTANT (2026-10-02): no grace period, no restore. A
   * copy is archived server-side (`deletedaccounts`).
   * TODO(legal): state how long that archive is kept, here and in the privacy
   * policy, before launch.
   */
  /** The date the current policies took effect. */
  effectiveDate: "30 September 2026",
} as const;

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/safety", label: "Safety" },
  { to: "/privacy-policy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/contact", label: "Support" },
] as const;

export const LEGAL_LINKS = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/community-guidelines", label: "Community Guidelines" },
  { to: "/child-safety", label: "Child Safety Standards" },
  { to: "/delete-account", label: "Delete Account" },
] as const;
