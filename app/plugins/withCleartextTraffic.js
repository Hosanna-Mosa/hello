/**
 * Let the app talk to an `http://` backend.
 *
 * Android 9 (API 28) blocks cleartext HTTP unless an app opts in. A DEBUG
 * build gets `usesCleartextTraffic="true"` for free — React Native adds it so
 * Metro works — but a RELEASE build does not, and the difference is invisible
 * until you install one: every request fails inside the platform, before it
 * reaches the network, with nothing in the backend log because nothing arrives
 * (PLAN #172).
 *
 * `expo.android.usesCleartextTraffic` in app.json is NOT honoured by SDK 57 —
 * prebuild leaves the attribute off the `<application>` tag — so this sets it
 * directly.
 *
 * THIS IS FOR TESTING AGAINST A LAN BACKEND and must not survive going public.
 * Once the API is HTTPS on the VPS, delete this plugin and its app.json entry:
 * an app that permits cleartext will happily send a bearer token over a hotel
 * wifi if a redirect ever points it at one.
 *
 * Scoping it to one address instead was considered and rejected: Android's
 * network security config takes individual hosts, not ranges, and this Mac's
 * DHCP address has already changed once mid-project.
 */

const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error("[withCleartextTraffic] no <application> in AndroidManifest");
    }

    application.$["android:usesCleartextTraffic"] = "true";
    return cfg;
  });
};
