#!/usr/bin/env bash
# run-signals.sh — playbook §13
#
# RECONSTRUCTED. The playbook PDF was not present in this workspace, so this is
# rebuilt from the signals PLAN.md actually references: `started`, `phase_done N`
# and `completed`. Replace it with the canonical §13 version if that differs.
#
# Usage:  . ./run-signals.sh

export RUN_EVIDENCE="${RUN_EVIDENCE:-/Users/hosanna/TRIOZEN/Frd-app/2/Hello-evidence}"

# --- Android / Java environment (Phase 0 finding: installed but unexported) ---
export ANDROID_HOME="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}"
export JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH"

_signal() { printf '\n=== %s :: %s ===\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

started()    { _signal "started"; }
phase_done() { _signal "phase_done $1"; mkdir -p "$RUN_EVIDENCE/ios/phase-$1" "$RUN_EVIDENCE/android/phase-$1"; }
completed()  { _signal "completed"; }

# --- gates ---
gates() {
  pmset -g therm | head -3
  pmset -g batt  | tail -1
  pgrep -x caffeinate >/dev/null && echo "caffeinate: HOLDING" || echo "caffeinate: NOT RUNNING"
}

# --- capture helpers: $1 = phase, $2 = screen name ---
ios_shot() {
  mkdir -p "$RUN_EVIDENCE/ios/phase-$1"
  xcrun simctl io booted screenshot "$RUN_EVIDENCE/ios/phase-$1/$2.png"
}
android_shot() {
  mkdir -p "$RUN_EVIDENCE/android/phase-$1"
  adb exec-out screencap -p > "$RUN_EVIDENCE/android/phase-$1/$2.png"
}

# --- M6: the smallest capture in a batch is a blank screen ---
smallest() { find "$RUN_EVIDENCE/$1" -name '*.png' -exec ls -lS {} + | tail -5; }
