#!/usr/bin/env node
/**
 * Patch expo-modules-jsi for Xcode 26.2.
 *
 * WHY THIS EXISTS
 * ---------------
 * `RuntimeScheduler.h` annotates two constructors `SWIFT_RETURNS_RETAINED`.
 * Xcode 26.2's Swift/C++ interop rejects that outright:
 *
 *   'RuntimeScheduler' cannot be annotated with either SWIFT_RETURNS_RETAINED
 *   or SWIFT_RETURNS_UNRETAINED because it is not returning a
 *   SWIFT_SHARED_REFERENCE type
 *
 * The class IS declared SWIFT_SHARED_REFERENCE, but a class is incomplete while
 * its own members are parsed, so the check can never pass on a constructor.
 * Moving the attribute ahead of the class name was tried first and changed
 * nothing — the error simply moved with the line numbers.
 *
 * It is a hard error: the iOS build cannot complete at all. Nothing in this
 * repo causes it. expo-modules-jsi 57.1.0 AND 58.0.2 ship identical code, so
 * upgrading does not help, and SDK 58 would break the pinned stack anyway.
 *
 * WHAT IT DOES
 * ------------
 * Removes the two annotations. Nothing else.
 *
 * THE TRADE-OFF — read this before "tidying it up"
 * ------------------------------------------------
 * `SWIFT_RETURNS_RETAINED` tells Swift the object arrives already +1 retained
 * (the class starts `refCount{1}`). Without it, ARC treats the pointer as +0
 * and retains again, so the count never returns to zero: the scheduler leaks.
 *
 * That is ONE small object, created about once per React runtime, which lives
 * for the app's lifetime regardless. It is accepted deliberately.
 *
 * The obvious "proper" fix — also changing `refCount{1}` to `refCount{0}` so
 * ARC's retain balances it — is NOT done here. Any C++ caller constructing the
 * scheduler directly would then start at zero and the first release would free
 * a live object. A bounded leak is strictly better than a use-after-free, and
 * this is a prebuilt xcframework whose callers we cannot fully audit.
 *
 * Remove this patch once Expo ships a fix. Idempotent; no-ops if upstream changes.
 */

const fs = require("fs");
const path = require("path");

const HEADER = path.join(
  __dirname,
  "..",
  "node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h",
);

const NEEDLE = "SWIFT_RETURNS_RETAINED RuntimeScheduler";

if (!fs.existsSync(HEADER)) process.exit(0); // not installed; nothing to do

const source = fs.readFileSync(HEADER, "utf8");

if (!source.includes(NEEDLE)) {
  console.log("[patch-expo-modules-jsi] nothing to patch (already applied, or upstream fixed)");
  process.exit(0);
}

fs.writeFileSync(HEADER, source.split(NEEDLE).join("RuntimeScheduler"));
console.log("[patch-expo-modules-jsi] removed SWIFT_RETURNS_RETAINED from 2 constructors (Xcode 26.2)");
