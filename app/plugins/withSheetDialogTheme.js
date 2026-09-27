/**
 * Stop a form sheet flashing WHITE when it is dismissed by tapping outside it.
 *
 * On Android a `presentation: "formSheet"` screen is a Material
 * `BottomSheetDialog` — its own window, so the activity's `windowBackground`
 * (app.json `backgroundColor`) does not reach it.
 *
 * Tapping the scrim takes a different path from closing the sheet yourself.
 * `BottomSheetDialogScreen.cancel()` in react-native-screens reads:
 *
 *     override fun cancel() {
 *         fragmentRef.get()!!.dismissFromContainer()
 *         this.show()
 *     }
 *
 * It hands the dismissal to the ScreenStack and then RE-SHOWS the dialog, so
 * the native teardown cannot desynchronise the stack. For a moment the dialog
 * window is up with its React content already gone, and what shows is the
 * Material defaults underneath: `Theme.Design.Light.BottomSheetDialog`, whose
 * sheet background is a light `?android:colorBackground`. On a dark app that
 * is a full screen of white. Closing with the footer button never calls
 * `cancel()`, which is exactly why only one of the two paths flashes.
 *
 * Neither the dialog theme nor `sheetClosesOnTouchOutside` (hardcoded `true`
 * in `Screen.kt`) is reachable from JavaScript, so this sets the theme
 * attribute the dialog resolves against instead. Both layers go transparent:
 * the screen paints its own surface — including the corner radius, which
 * react-native-screens draws on the Screen view's own `MaterialShapeDrawable`
 * — so there is nothing for these to contribute except the flash.
 *
 * A plugin rather than an edit to `android/`, because that folder is generated
 * and gitignored: a hand-edit lasts until the next prebuild.
 */

const { withAndroidStyles } = require("expo/config-plugins");

const DIALOG_THEME = "AppBottomSheetDialogTheme";
const SHEET_STYLE = "AppBottomSheetStyle";

/** xml2js shape: `{ _: value, $: { name } }`. */
const item = (name, value) => ({ _: value, $: { name } });

function upsertStyle(styles, name, parent, items) {
  const existing = styles.find((style) => style.$?.name === name);
  if (existing) {
    existing.$.parent = parent;
    existing.item = items;
    return;
  }
  styles.push({ $: { name, parent }, item: items });
}

module.exports = function withSheetDialogTheme(config) {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults.resources.style;

    const appTheme = styles.find((style) => style.$?.name === "AppTheme");
    if (!appTheme) {
      throw new Error("[withSheetDialogTheme] AppTheme not found in styles.xml");
    }

    appTheme.item = appTheme.item ?? [];
    if (!appTheme.item.some((i) => i.$?.name === "bottomSheetDialogTheme")) {
      appTheme.item.push(item("bottomSheetDialogTheme", `@style/${DIALOG_THEME}`));
    }

    upsertStyle(styles, DIALOG_THEME, "Theme.Design.BottomSheetDialog", [
      item("android:windowBackground", "@android:color/transparent"),
      item("bottomSheetStyle", `@style/${SHEET_STYLE}`),
    ]);

    upsertStyle(styles, SHEET_STYLE, "Widget.Design.BottomSheet.Modal", [
      item("android:background", "@android:color/transparent"),
    ]);

    return cfg;
  });
};
