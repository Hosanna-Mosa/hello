# PLAN.md — Friend-Connection App, MVP

> A platonic friend-finding mobile app. **Frontend first, mock data, no backend.**
> Built strictly component-based per `Mobile-Component-Refactor-Playbook-FULL-AUTONOMOUS.pdf`.

**Stack** — Expo SDK `~57.0.24` · expo-router `~57.0.22` · React Native `0.86.3` · React `19.2.3` · Reanimated `4.5.1` + gesture-handler `~2.32.0` + worklets `0.10.1` · TypeScript `~6.0.3`
**Routes** — `app/src/app/` · **Alias** — `@/*` → `./src/*` · **Experiments** — `typedRoutes`, `reactCompiler` both ON

**Progress: 336 / 414**  ·  414 checkboxes across 11 phases, 43 routes, 18 assumptions and 15 risks

---

## Status legend

| Mark | Meaning |
|---|---|
| `- [ ]` | Open — not started |
| `- [~]` | In progress |
| `- [x]` | Done **and verified** |
| `- [!]` | Blocked — a reason must be written inline |

**A task is never ticked until its phase's verification block is ticked.** "It compiles" is not done. "It renders on both platforms and I navigated to it by hand" is done.

---

## 1. Locked decisions

These came out of the requirements interview. They are settled — do not relitigate them mid-build.

| Area | Decision |
|---|---|
| **Positioning** | Platonic friends only. **No romance framing anywhere** — copy, fields, matching, or imagery. "Romantic/flirty advance" is an explicit report reason. |
| **Age** | **18+, hard stop.** Under-18 birthday hits a dead-end screen. Age filter floors at 18. |
| **Photos** | **None, anywhere.** Users are a **preset avatar** only. No upload, crop, gallery, camera, or photo verification. Interests + bio carry the card instead. |
| **Tabs** | **4** — Home · Match · Chat · Profile. Search and Likes are **Home header entries**. |
| **Auth** | **Phone + OTP only.** Mocked: any number, any 6 digits. |
| **Onboarding** | **7 steps** — name → birthday → gender → avatar → interests → bio → location. |
| **Notifications permission** | Primed **after the first match**, not during onboarding. |
| **Deck** | Like / Pass / tap-to-expand / **like-with-a-note**. No undo, no superlike. |
| **Message requests** | **Like + note** model. Lands in recipient's Requests segment. Accept → match + thread seeded with the note. Decline → silent discard. **Match gate is preserved.** |
| **Chat extras** | Typing indicator · emoji reactions · scripted auto-replies. |
| **Voice calls** | **Voice only**, fully mocked. Ringing → connected → system message. Plus a demo-triggerable incoming call. No video, no WebRTC, no mic permission. |
| **Filters** | Distance · age · interests · active-recently. Last two are premium-gated. |
| **Ads** | **Placeholders only**, no ad SDK. Three placements: Home banner · deck card every 10 profiles · chat-list row. |
| **Premium** | In-session toggle, no billing. Gates: no ads · unblur likes · unlimited likes · advanced filters. |
| **State** | Screens → hooks → Zustand stores → mock service layer. **TanStack Query deferred** to when the real backend lands. |
| **Data lifetime** | In-memory. Resets on app restart. (See **R7** — recommend revisiting.) |
| **Theme** | Light **and** dark from day one. Every value a semantic token. Zero hardcoded styles. |
| **Design** | **Does not exist yet.** Placeholder palette. Client supplies later. (See **R1**.) |
| **Name** | "Hello" is a placeholder. Keep the product name out of all user-facing copy. |
| **Delivery** | Live demo **and** installable builds. **Verification is Android-only** (operator decision 2026-09-19) — iOS cannot build under Xcode 26.2, see parking #16. Android APK only until the toolchain is resolved. |
| **Backend** | Later. This phase ships `docs/api-contract.md` for it to be built against. |

### Out of scope for v1

Photos · groups · events · video calls · open (non-match-gated) messaging · undo/rewind · superlike · Hinge-style prompts · map view · contacts blocking · incognito · i18n · real ad network · real billing · real call infrastructure · real backend.

### Approved dependencies — this list and nothing else

- [x] `zustand`
- [x] `expo-location`
- [x] `expo-haptics`
- [x] `react-test-renderer` *(devDependency)*
- [x] `jest-expo` *(devDependency)*
- [x] Write this list into `app/AGENTS.md` so it is enforced

`expo-symbols` is already installed and replaces `@expo/vector-icons` (no longer bundled since SDK 56, and being deprecated). **Anything beyond this list needs explicit sign-off.**

Ads, premium and calls add **no** dependencies — all three are mocked UI. An ad SDK, a billing provider and WebRTC are each native modules requiring a rebuild and New-Architecture verification. That is future work.

---

## 2. Version-critical facts

Verified against <https://docs.expo.dev/versions/v57.0.0/>. **These contradict what a model produces from memory.** Re-read this table before writing navigation, animation or auth code.

| Fact | Consequence |
|---|---|
| `src/app` is auto-discovered and **takes precedence over root `app/`** | No config needed. A stray root `app/` is **silently ignored**. |
| Auth gating is **`<Stack.Protected guard={…}>`** | NOT `useEffect` + `useSegments` + `router.replace`. That pattern is obsolete. |
| Reanimated 4: **`runOnJS` → `scheduleOnRN`**, `runOnUI` → `scheduleOnUI`, `useScrollViewOffset` → `useScrollOffset` | Every pre-2025 swipe-deck tutorial is wrong. |
| **`useAnimatedGestureHandler` is REMOVED** | Deck must use the gesture-handler 2 `Gesture.Pan()` API. |
| Worklets live in **`react-native-worklets`**; Babel plugin auto-configured by `babel-preset-expo` | **Do not hand-add a Babel plugin.** |
| `@react-navigation/*` imports from app code **stopped working in SDK 56** | Import from `expo-router/react-navigation`. |
| New Architecture is **always on, cannot be disabled** (SDK 55+) | Never write `newArchEnabled: false`. |
| Native tabs import from **`expo-router/unstable-native-tabs`** in SDK 57 | Renamed to `expo-router/native-tabs` only in 58+. |
| `presentation: 'formSheet'` + `sheetAllowedDetents` is native and dependency-free | Use for the profile sheet and filter sheet. **No bottom-sheet library needed.** |
| typedRoutes forbids **relative** hrefs | Use `href={{ pathname: '/user/[id]', params: { id } }}`. |
| `.expo/types` and `expo-env.d.ts` **do not exist in this repo yet** | Run `npx expo start` once in Phase 0 or every `Href` type is wrong. |
| React Compiler is **`@beta`**; manual `useMemo`/`useCallback`/`React.memo` discouraged | Escape hatch: `"use no memo"` file directive. **Never mutate objects/arrays in place** — the #1 compiler breakage. |
| **Expo Go is not viable** | Development build required on both platforms. Matches the playbook's own rule. |

---

## 3. Standing constraints (playbook rules)

Not tasks — conditions that hold for the entire project. Violating one invalidates the work.

### Kept verbatim

- [ ] Route files are **never moved or renamed.** A file's path IS its route (M5).
- [ ] **One component per file, one folder per component.**
- [ ] **Named exports everywhere** except route files (which require a default).
- [ ] **Never create an empty folder.** Create it when the first thing lands in it.
- [ ] **Verify after every step.** Cheap one step back, expensive twenty steps back.
- [ ] **Park what you find; never stop for it.** You broke it → fix. You found it broken → log it and carry on.
- [ ] **100%, and repeat until you get it.** Not 99%. Fix the cause, then re-run the *whole* comparison.
- [ ] **Keep the evidence** in platform-labelled folders, stored outside the repo.
- [ ] **Never run a version-control command.** No commits, no branches, no staging. Work is left in the working copy for its owner. *Consequence: copy a file before any destructive edit — "revert to last commit" is not available.*
- [ ] **The `Text` wrapper never nests inside itself** (M2). A bold word inside a sentence uses a plain `Text`.

### Adapted for greenfield — deliberately, and here is why

- [ ] *"No new dependencies"* → **an approved short list** (§1). The rule exists to stop a refactor smuggling in a second change; it cannot mean a greenfield app has no router.
- [ ] *Playbook phases 1–5* (inventory / thin routes / split kit / extract / repoint) → **dropped.** We build directly in the end state, so nothing is ever in the wrong place.
- [ ] *"Rendered output must not change"* → there is no "before". Replaced by: **once a screen's baseline is captured, later phases must not change it.** Any diff is intentional and re-baselined deliberately, never absorbed.
- [ ] *"Ask the owner nothing after phase 0"* → the requirements interview **was** the pre-phase-0 window. From Phase 0 on, decisions are made and logged, not escalated.

---

## 4. The verification block

This exact block closes **every** phase. It is reproduced inline in each phase below so it cannot be skipped.

```sh
# gates before any boot
pmset -g therm            # "no thermal warning level has been recorded" = clear
pmset -g batt             # stop the loop at 10%
pgrep -x caffeinate       # still holding?

# iOS — alone
xcrun simctl boot "<device>"
xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4
xcrun simctl io booted screenshot evidence/ios/<phase>/<screen>.png
xcrun simctl shutdown all

# Android — alone, only after iOS is shut down
emulator -avd <avd> -no-snapshot -no-audio &
adb exec-out screencap -p > evidence/android/<phase>/<screen>.png
adb emu kill
```

**Mechanical guards — not habits:**

- **Check the smallest capture in every batch (M6).** A file far smaller than its siblings is a blank screen. *A blank screen matching a blank screen is not a pass.*
- **Pin or crop the status bar (M7)**, or every run reports 100% failure.
- **Navigate to every route by hand, on both platforms (M5).** A screen can vanish while the build stays green. There is no error anywhere.
- **Clear the Metro cache (`--clear`) after any bulk edit (M1)** before investigating anything that looks impossible.
- Deep links use the dev-build scheme `hello:///…`. **Route groups like `(tabs)` do not appear** in a real scheme's URL.
- **Never compare iOS against Android.** Each platform matches only itself.
- **Never run both simulators at once.** Heat, ambiguity, memory, and stale state — in that order of damage.
- Include platform-suffixed files (`.ios.tsx` / `.android.tsx`) in every sweep and count (M4).

---

## Phase 0 — Pre-flight & baseline (19/29)

Nothing else starts until every box here is ticked.

**Operator gates**
- [!] Ask the operator to run `caffeinate -i -t 300` in its own window — **ask, then wait for confirmation.** Do not start without it.
- [x] `pmset -g therm` clear
- [!] `pmset -g batt` above 10% and charging — **56% but DISCHARGING.** Needs the charger before any build.

**Toolchain — iOS**
- [x] `xcrun simctl list devices available` lists at least one iPhone — `Flavour iPhone`
- [ ] `xcrun simctl boot "<device>"` boots
- [ ] `xcrun simctl shutdown all` stops it
- [x] Working iOS commands written into the parking log

**Toolchain — Android** *(the one that is usually not ready)*
- [x] `adb --version` present — 1.0.41 / 36.0.0
- [!] `echo $ANDROID_HOME` set and exported in the shell profile — SDK exists at `/opt/homebrew/share/android-commandlinetools`, exported by `run-signals.sh` but **not yet in the shell profile** (operator's file)
- [x] `emulator -list-avds` lists at least one device — `Flavour_320`, `Flavour_Pixel`
- [x] AVD uses an **arm64-v8a** system image (x86 on an ARM Mac runs under emulation — painfully slow)
- [!] `JAVA_HOME` points at **Java 17**, not whichever JDK is first on `PATH` — Temurin 17.0.19 **is** installed; default on `PATH` is JDK 25. Exported by `run-signals.sh`, **not in the shell profile**.
- [ ] Emulator boots and `adb emu kill` stops it
- [x] Working Android commands written into the parking log

**Project baseline**
- [x] Record the existing typecheck error count — **0** — the gate is **"no *new* errors"**, not "zero errors"
- [x] Record the existing lint warning count — **0**
- [x] Run `npx expo start` once to generate `.expo/types` and `expo-env.d.ts` (typedRoutes)
- [x] Confirm `.expo/` and `expo-env.d.ts` are git-ignored
- [x] Install approved deps: `npx expo install expo-location expo-haptics`, `npm i zustand`, `npm i -D react-test-renderer jest-expo`
- [x] `npx expo install --check` passes — **do not "fix" the Reanimated 4.5.1 / RN 0.86.3 pairing** (see R6)
- [x] `npx expo-doctor@latest` reviewed, findings parked — **21/21 passed**

**Development builds** *(never both at once)*
- [x] `npx expo install expo-dev-client`
- [ ] `npx expo run:ios` — **wait for it to finish completely**
- [ ] `npx expo run:android` — only after iOS has finished
- [x] Confirm the generated `ios/` and `android/` folders are git-ignored (build artefacts)

**Open the run**
- [x] Save `run-signals.sh` (playbook §13) beside the parking log; `. ./run-signals.sh` — **reconstructed**, see parking log #1
- [x] Create the parking log with the working commands for both platforms at the top
- [x] Create `evidence/ios/` and `evidence/android/` — at `../Hello-evidence/`, outside the repo
- [ ] Print `started`

---

## Phase 1 — Theme + primitives (33/37)

Tokens and the wrapper set. **Nothing else.** No screens, no features.

**Theme (`src/theme/`)**
- [x] `tokens.light.ts` — colour, spacing, radii, shadow, z-index
- [x] `tokens.dark.ts` — same keys, dark values
- [x] `typography.ts` — type scale by role, not by size
- [x] `index.ts` — semantic token contract, typed so a missing dark value is a compile error
- [x] `useTheme()` in `components/common/hooks/`
- [x] Root `_layout.tsx` wires the theme provider and respects `userInterfaceStyle: "automatic"`

**Primitive wrappers (`components/common/atoms/`)** — one thin layer, every prop passed through
- [x] `Box` ← `View`
- [x] `Heading` ← `Text`
- [x] `Body` ← `Text`
- [x] `Label` ← `Text`
- [x] `Caption` ← `Text`
- [x] `Scroller` ← `ScrollView` (keep `contentContainerStyle` passing through)
- [x] `List` ← `FlatList`, generic over the row type
- [x] `SectionedList` ← `SectionList`
- [x] `Tappable` ← `Pressable`
- [x] `Touchable` ← `TouchableOpacity` *(kept distinct — press feedback differs)*
- [x] `Picture` ← `expo-image`
- [x] `Input` ← `TextInput`, styled
- [x] `BareInput` ← `TextInput`, unstyled
- [x] `SafeArea` ← `SafeAreaView` *(structural — belongs in a template, never scattered)*
- [x] `KeyboardAware` ← `KeyboardAvoidingView`
- [x] `Spinner` ← `ActivityIndicator`

**App atoms**
- [x] `Icon` — `expo-symbols` wrapper (SF Symbols on iOS, Material on Android)
- [x] `Avatar`
- [x] `Chip`
- [x] `Badge`
- [x] `Divider`
- [x] `Stamp` — the LIKE / NOPE deck overlay

**Guards**
- [x] Lint rule: no bare RN primitives outside `components/common/atoms/`
- [x] Lint rule: **no text wrapper nested inside another text wrapper** (M2)
- [x] `components/common/index.ts` barrel

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0**
- [x] Render-tree snapshots captured for every atom — **62 snapshots, 64 tests, light + dark**
- [!] iOS: boot → check → capture → **shut down** — deferred: operator gates (charger + caffeinate)
- [!] Android: boot → check → capture → **shut down** — deferred: operator gates
- [!] Both platforms match their own baselines, 100% — deferred with the captures
- [!] `phase_done 1` — code complete (33/37); blocked only on the two simulator sweeps

---

## Phase 2 — Shared kit (37/41)

**Molecules (`common/molecules/`)**
- [x] `Button`
- [x] `Field`
- [x] `SearchBar`
- [x] `EmptyState`
- [x] `ErrorState`
- [x] `Skeleton`
- [x] `ListRow`
- [x] `SettingsRow`
- [x] `ToggleRow`
- [x] `SectionHeader`
- [x] `WizardProgress`
- [x] `DistanceLabel` — formats as "2 km away", never a point
- [x] `InterestChips`
- [x] `CountBadge`
- [x] `RangeSlider`

**Organisms (`common/organisms/`)** — the cross-screen ones only
- [x] `ConfirmDialog`
- [x] `ProfileCard`
- [x] `AvatarPicker`

**Templates (`common/templates/`)**
- [x] `ScreenShell` — SafeArea + header + slot
- [x] `TabScreenShell`
- [x] `FormShell`
- [x] `WizardShell`
- [x] `SheetShell`
- [x] `ListScreenShell`
- [x] `CallShell`

**Hooks (`common/hooks/`)**
- [x] `useSession`
- [x] `useAsyncStatus` — loading / error / empty / content
- [x] `useDebouncedValue`
- [x] `usePermission` — the **ask → refusal → never-ask-again** dance, written once
- [x] `usePullToRefresh`
- [x] `useSearchFilter`

**Utils (`common/utils/`)**
- [x] `formatDistance` (km; miles is a one-line change — A2)
- [x] `formatRelativeTime`
- [x] `calculateAge`
- [x] `profileCompleteness`

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0**
- [x] Render-tree snapshots for every molecule, organism and template — **90 kit snapshots, light + dark** (152 total with Phase 1)
- [!] iOS: boot → check → capture → **shut down** — deferred: operator gates
- [!] Android: boot → check → capture → **shut down** — deferred: operator gates
- [!] Both platforms 100% — deferred with the captures
- [!] `phase_done 2` — code complete (37/41); blocked only on the two simulator sweeps

---

## Phase 3 — Data layer (39/39) ✅

No UI in this phase. Types, services, stores, fixtures, contract.

**Entity types (`src/services/types.ts`)**
- [x] `User` — id, name, birthday, gender, avatarId, bio, interests[], location, lastActiveAt, createdAt. **No photo fields.**
- [x] `Interest` — id, label, category
- [x] `Avatar` — id, asset, label
- [x] `Like` — + optional `note`
- [x] `MessageRequest` — likeId, fromUserId, toUserId, note, status
- [x] `Match`
- [x] `Thread`
- [x] `Message` — + status, reactions[], optional `system` kind for call records
- [x] `CallSession` — threadId, direction, startedAt, durationSec, outcome
- [x] `Entitlements` — isPremium, likesRemaining, likesResetAt
- [x] `Plan` — id, label, price, period
- [x] `Block`, `Report`, `Notification`, `Session`

**Mock service layer (`src/services/`)**
- [x] `client.ts` — 300–800ms latency, injectable failures behind a dev-only switch
- [x] `auth.service.ts`
- [x] `me.service.ts`
- [x] `profiles.service.ts`
- [x] `likes.service.ts` — includes requests
- [x] `matches.service.ts`
- [x] `chat.service.ts`
- [x] `calls.service.ts`
- [x] `billing.service.ts`
- [x] `notifications.service.ts`
- [x] `safety.service.ts`

**Stores (`src/stores/`)** — Zustand
- [x] `session.store.ts`
- [x] `deck.store.ts`
- [x] `filters.store.ts`
- [x] `chat.store.ts`
- [x] `entitlements.store.ts`
- [x] `ui.store.ts` — theme override, dev failure switch, dev incoming-call trigger

**Fixtures (`src/mocks/`)**
- [x] `interests.ts` — ~60 tags across ~8 categories (A6)
- [x] `avatars.ts` — ~30 placeholder avatars (A7)
- [x] `profiles.ts` — ~40 seeded users (A8)
- [x] `threads.ts` — ~8 conversations, ~6 inbound likes
- [x] `replies.ts` — scripted auto-reply scripts

**Contract + copy**
- [x] `docs/api-contract.md` — routes, request/response shapes, error codes, pagination, auth header
- [x] `src/copy/` — all user-facing strings, product-name-free (A1, A3)

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0**
- [x] Unit checks on services: latency, failure injection, request accept/decline, quota decrement — **36 service + fixture tests**, plus the 18+ gate, the match gate and blocked-user filtering
- [x] `phase_done 3` *(no screens yet — snapshot/screenshot gates resume in Phase 4)* — **208 tests pass across the whole suite**

---

## Phase 4 — Auth + onboarding (23/25)

**Routing skeleton**
- [x] `src/app/_layout.tsx` — `GestureHandlerRootView` + `SafeAreaProvider` + theme provider + `<Stack>`
- [x] **`<Stack.Protected guard={…}>`** for `(auth)` / `(onboarding)` / `(tabs)` — NOT effect-based redirects
- [x] `src/app/+not-found.tsx`
- [x] Confirm `SafeAreaProvider` is mounted explicitly (expo-router is not documented to mount it)

**`(auth)` group**
- [x] `_layout.tsx`
- [x] `index.tsx` — welcome / value carousel
- [x] `phone.tsx` — country-code picker + number entry
- [x] `otp.tsx` — 6-box code, resend countdown, SMS-autofill affordance

**`(onboarding)` group** — one question per screen, progress bar
- [x] `_layout.tsx` — `WizardShell` + progress
- [x] `name.tsx`
- [x] `birthday.tsx` — **18+ gate**
- [x] `age-restricted.tsx` — dead end, no way forward
- [x] `gender.tsx` — Woman / Man / Non-binary / self-describe / prefer-not-to-say + show-on-profile toggle (A5)
- [x] `avatar.tsx` — preset picker
- [x] `interests.tsx` — minimum 3
- [x] `bio.tsx` — character counter
- [x] `location.tsx` — **permission primer before the OS dialog**, with "Not now" and a manual-city fallback

**Screen-local components**
- [x] `components/otp/`, `components/birthday/`, `components/interests/`, `components/avatar/` as each screen needs them — **create the folder only when the first component lands in it**

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0** · component score **0**
- [x] Render-tree snapshots for all 12 auth/onboarding screens — **24 snapshots, light + dark** (176 total)
- [!] iOS: boot → **navigate to every route by hand** → capture → shut down — **BLOCKED: expo-modules-jsi vs Xcode 26.2** (parking #16)
- [x] Android: boot → **navigate to every route by hand** → capture → shut down — **13 captures, all 12 routes walked by hand on `Flavour_Pixel`**
- [x] Smallest-capture check passed — no blank screens counted as passes — **smallest is 56KB (`+not-found`, genuinely sparse); no duplicate hashes**
- [!] Both platforms 100% — **N/A: Android-only verification** (operator decision). Android is 100%.
- [x] `phase_done 4` — **Android verified end to end**; iOS out of scope by decision

---

## Phase 5 — Home (21/23)

**Tab shell**
- [x] `(tabs)/_layout.tsx` — 4 tabs, icons via `expo-symbols`
- [x] Home header: search entry + likes entry (heart + unread count) + filter entry

**Screens**
- [x] `(tabs)/index.tsx` — nearby **2-column grid** (A9), pull-to-refresh
- [x] `filters.tsx` — `formSheet`: distance slider with live count, age range, interests, active-recently
- [x] `search.tsx` — **people by name only**, recent searches
- [x] `likes.tsx` — inbound likes grid
- [x] `notifications.tsx` — activity feed grouped by day, deep links
- [x] `user/[id].tsx` — full profile, `formSheet`

**States — every one of these is a real screen**
- [x] Nearby: loading skeletons
- [x] Nearby: empty ("no one nearby" → widen radius CTA)
- [x] Nearby: error + retry
- [x] Nearby: location permission denied → explainer + Open Settings + manual city
- [x] Search: empty query / no results
- [x] Likes: empty
- [x] Notifications: empty
- [x] Notifications-disabled recovery state

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0** · component score **0**
- [x] Render-tree snapshots for every screen **and every state** — **30 snapshots, light + dark** (206 total). Content states verified real, not stuck loading.
- [!] iOS: boot → navigate every route by hand → capture → shut down — **BLOCKED** (parking #16)
- [x] Android: boot → navigate every route by hand → capture → shut down — **11 captures on `Flavour_Pixel`**
- [x] Smallest-capture check passed — smallest 58KB (chat placeholder, genuinely sparse); no duplicate hashes
- [!] Both platforms 100% — **N/A: Android-only verification** (operator decision). Android is 100%.
- [x] `phase_done 5` — **Android verified end to end**; iOS out of scope by decision

---

## Phase 6 — Match deck (19/23)

The largest single change, and the one every gate was built for.

**Deck mechanics**
- [x] `SwipeCard` organism — avatar, name, age, distance, interest chips, bio excerpt
- [x] `SwipeDeck` organism — `Gesture.Pan()` + `useSharedValue` + `useAnimatedStyle`
- [x] **Use `scheduleOnRN`, not `runOnJS`** — Reanimated 4
- [x] LIKE / NOPE `Stamp` overlays driven by drag distance
- [x] Haptics on decision (`expo-haptics`)
- [x] Card-stack depth: 2–3 cards visible with scale/offset
- [x] Tap buttons mirror the gestures exactly

**Screens**
- [x] `(tabs)/match.tsx`
- [!] Expanded profile via `presentation: 'formSheet'` with sticky action bar — tap-to-expand opens `user/[id]` as a form sheet; **the sticky like/pass action bar inside the sheet is not built**
- [x] `like-note/[id].tsx` — note composer, `formSheet`
- [x] `matched/[id].tsx` — celebration, `transparentModal`, routes straight to chat

**States**
- [x] Deck loading skeleton
- [x] Out-of-cards ("you're all caught up" + widen filters)
- [x] Deck error + retry

**Performance**
- [!] Prefetch the next N avatars via `expo-image` cache statics — **cannot be written**: the preset avatar artwork does not exist (R2), so there are no sources to warm. Deliberately not stubbed.
- [x] Confirm no in-place mutation of the card array (React Compiler breakage)

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0** · component score **0**
- [x] Render-tree snapshots for deck, sheet, note composer, celebration, all states — **20 snapshots, light + dark** (236 total)
- [!] iOS: boot → swipe by hand both directions → capture → shut down — **out of scope** (Android-only verification)
- [x] Android: boot → swipe by hand both directions → capture → shut down — **5 captures**, LIKE and NOPE stamps caught mid-drag
- [x] Gesture behaviour exercised by hand — **and it found a bug snapshots could not**: card tracks the drag and rotates, stamps fade in proportionally, sub-threshold drag springs back without deciding, both buttons advance through the same animation, stack depth reveals the card behind
- [!] Both platforms 100% — **N/A: Android-only verification**
- [x] `phase_done 6` — **Android verified end to end**; iOS out of scope by decision

---

## Phase 7 — Chat + calls (32/34)

**Conversation list**
- [x] `(tabs)/chat.tsx` — **Messages | Requests** segmented control
- [x] New-matches avatar carousel above the thread rows
- [x] `ThreadRow` — avatar, snippet, time, unread dot
- [x] `RequestRow` — avatar, note preview, Accept / Decline
- [x] Accept → creates match + thread **seeded with the note as its first message**
- [x] Decline → silent discard, sender never told (A18)

**Thread**
- [x] `thread/[id].tsx`
- [x] `ChatBubble` — sent / received, day separators, timestamps
- [x] `ChatComposer` — with `KeyboardAware`
- [x] `TypingIndicator` — animated, driven by the mock reply script
- [x] Scripted auto-replies after a short delay
- [x] `ReactionPicker` — long-press to react
- [x] Reaction display on bubbles
- [x] In-chat profile peek from the header
- [x] Overflow menu: unmatch / block / report / mute
- [x] Unmatch confirm — destructive guard, "this can't be undone"

**Voice calls — mocked, no audio, no mic permission (A17)**
- [x] Call button in the thread header
- [x] `call/[id].tsx` — `fullScreenModal`: ringing → connected
- [x] `CallControls` — mute, speaker, end
- [x] `useCallTimer` + connected-state timer display
- [x] `incoming-call/[id].tsx` — `fullScreenModal`, accept / decline
- [x] Dev-only trigger to fire an incoming call on demand for the demo
- [x] `Voice call · 2:14` system message written back into the thread on end

**States**
- [x] No matches yet
- [x] No messages in a thread
- [x] No pending requests
- [x] Unmatched-by-them

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0** · component score **0**
- [x] Render-tree snapshots for list, both segments, thread, all call states, all empty states — **54 new, 290 total, stable over 3 runs**
- [!] iOS: boot → send a message, react, accept a request, place and receive a call → capture → shut down — **OUT OF SCOPE** (Android-only, operator decision 2026-09-19; parking #16)
- [x] Android: same, by hand → capture → shut down — **21 captures, 0 duplicate hashes, no blanks**
- [x] Keyboard, back-button and call-screen behaviour differ per platform — exercise both — **Android only: composer clears the keyboard; back cancels the unmatch dialog rather than confirming it; `fullScreenModal` back ends the call**
- [!] Both platforms 100% — **cannot be ticked under the Android-only decision**
- [x] `phase_done 7`

---

## Phase 8 — Profile, settings, safety (25/27)

**Profile**
- [x] `(tabs)/profile.tsx` — own profile + completeness ring
- [x] `edit-profile/index.tsx`
- [x] `edit-profile/avatar.tsx`
- [x] `edit-profile/interests.tsx`
- [x] `edit-profile/bio.tsx`

**Settings tree**
- [x] `settings/index.tsx` — grouped rows
- [x] `settings/account.tsx` — phone, sign-in method
- [x] `settings/discovery.tsx` — distance, age, "show me on app" toggle
- [x] `settings/notifications.tsx` — per-channel toggles
- [x] `settings/blocked.tsx` — list + unblock
- [x] `settings/safety.tsx` — safety tips, meeting-in-person guidance
- [x] `settings/help.tsx`
- [x] `settings/legal.tsx` — terms, privacy, licences, app version
- [x] `settings/delete-account.tsx` — reason → consequences → typed confirm
- [x] Logout confirm action sheet

**Safety flows**
- [x] `report/[id].tsx` — reason picker. **Reasons include "romantic or flirty advance"** — this is the positioning, not a nicety
- [x] Report details + optional context
- [x] Report submitted confirmation + also-block option
- [x] Block confirm with consequences
- [x] Safety entry reachable from profile, thread overflow and settings

**Permissions**
- [x] Notification permission primer fires **after the first match** (A4) — UI only; the OS request needs `expo-notifications`, a native module off the approved list (parking)

**Verification**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0** · component score **0**
- [x] Render-tree snapshots for all ~20 screens — **50 new, 340 total, stable over 3 full runs**
- [!] iOS: boot → navigate every route by hand → capture → shut down — **OUT OF SCOPE** (Android-only, operator decision 2026-09-19; parking #16)
- [x] Android: boot → navigate every route by hand → capture → shut down — **28 captures, 0 duplicate hashes, no blanks**
- [!] Both platforms 100% — **cannot be ticked under the Android-only decision**
- [x] `phase_done 8`

---

## Phase 9 — Monetisation (21/23)

Deliberately last, as **one coherent change across surfaces** now that they all exist.

**Entitlements**
- [x] `useEntitlements()` hook — the single source every gated surface reads
- [x] Dev-only premium toggle for demoing

**Ad placeholders** — inert mock components, no ad SDK (A14)
- [x] `AdBanner` — Home nearby, standard 320×50 slot
- [x] `AdCard` — injected into the deck **every 10 profiles**, tunable from one constant
- [x] `AdRow` — chat conversation list
- [x] Every slot carries a "Remove ads" CTA into the paywall
- [x] All slots unmount when premium flips on — **no screen decides for itself**

**Paywall**
- [x] `paywall.tsx` — `formSheet`: three placeholder plans, feature comparison, benefit-led CTA
- [x] `settings/subscription.tsx` — current plan, **Restore Purchases**, deep link to store
- [x] Paywall reachable from: every ad slot, blurred likes, out-of-likes, locked filters, profile

**Gates**
- [x] Blurred like tiles + count on free; revealed on premium
- [x] Daily like quota — **15/day**, resets at local midnight (A16)
- [x] Out-of-likes state with countdown to reset
- [x] Interests + active-recently filters locked on free, with a lock affordance
- [x] Premium badge on own profile

**Verification — every affected screen checked TWICE**
- [x] Typecheck: no new errors — **0, baseline 0** · lint **0** · component score **0**
- [x] Render-tree snapshots, free tier
- [x] Render-tree snapshots, premium tier — **38 new, 378 total, stable over 3 full runs**
- [!] iOS: boot → walk every ad surface and gate in **both** entitlement states → capture → shut down — **OUT OF SCOPE** (Android-only, operator decision 2026-09-19; parking #16)
- [x] Android: same → capture → shut down — **16 captures across both tiers, 0 duplicate hashes, no blanks**
- [x] Confirm zero ad slots render when premium is on — **asserted in the suite: both ad surfaces go 2 markers → 0, and the free case is checked first so the premium check cannot pass for the wrong reason**
- [!] Both platforms 100% — **cannot be ticked under the Android-only decision**
- [x] `phase_done 9`

---

## Phase 10 — Score, de-duplicate, report (16/17)

**Component score**
- [x] Count bare `View` / `Text` / `Pressable` / `TouchableOpacity` / `Image` / `ScrollView` / `FlatList` / `TextInput` in `src/app/**` — **imports do not count, only usage in the rendered tree**
- [x] Include platform-suffixed files in the sweep (M4) — **none exist**
- [x] **Score is zero.** Not "nearly zero" — **0 across 48 route files, and 0 outside `atoms/` in `src/components/**`**
- [x] Every route file reads as a list of named things

**Duplication — three passes, not two**
- [x] **Structural**: hash windows of consecutive meaningful lines, group by shared files → extract to a component — **`Card` extracted, replacing 10 hand-written copies across 6 files** — 6 inline, plus 4 more in `settings/index.tsx` that a first pass missed because they shared a local style *variable* rather than an inline object
- [x] **Style objects**: normalise each entry (sort keys, drop whitespace), then hash → shared constants or theme entries — **20 → 18 repeated groups; the two largest (card ×6, inset divider ×4) are gone. What remains is generic flex idiom (`row + center + gap`), judged not worth a passthrough component**
- [x] **Logic**: the same handler/filter/state on two screens → a hook — **`useFocusLoad`, from 2 identical copies**
- [x] One pattern at a time, verified between each — never six screens in one step
- [x] Every new hook does **exactly** what its copies did, including the parts you disagree with. Differences are kept and recorded, never quietly "corrected" — **Account keeps its no-divider grouping, Legal keeps its full-bleed rule; see parking #56**
- [x] Every path touched by a new hook exercised **by hand on both platforms** — **Android only: all 9 touched paths walked and captured (phase-10, 8 captures, 0 duplicates)**

**Handover**
- [x] Evidence folders complete and labelled per platform, stored outside the repo — **`Hello-evidence/android/` phases 4–10; `phase-3` and every `ios/` folder are empty stubs and stay that way (see below)**
- [x] Every capture checked for being genuinely rendered rather than blank — **MD5 duplicate detection plus a smallest-capture check per phase; 0 duplicates in every batch**
- [x] Every route navigated to by hand on both platforms and confirmed present — **Android only: 43/43, see §5**
- [x] No new build errors vs the Phase 0 baseline — **typecheck 0, lint 0, 452 tests, 378 snapshots**
- [x] Parking log handed over as **"everything is done except these"** — **59 entries, §8**
- [x] **No version-control command was run** — work left uncommitted for its owner
- [!] `completed` printed — only at a real 100% — **NOT printed. This is not 100%: iOS is unverified by operator decision, and §6 assumptions and §7 risks remain open for the client. See the handover note below.**

---

## 5. Screen checklist (43/43 Android)

"Route exists and is reachable" is what a green build does **not** prove (M5). Tick only after navigating to it by hand on **both** platforms.

**Android only**, per the operator decision of 2026-09-19 (parking #16). Every
route below was navigated to by hand on the emulator during its own phase's
verification and has a capture in `Hello-evidence/android/` to show for it —
105 captures across phases 4 to 10. iOS is unverified and cannot be ticked.

**Auth & onboarding**
- [x] `(auth)/index` — welcome
- [x] `(auth)/phone`
- [x] `(auth)/otp`
- [x] `(onboarding)/name`
- [x] `(onboarding)/birthday`
- [x] `(onboarding)/age-restricted`
- [x] `(onboarding)/gender`
- [x] `(onboarding)/avatar`
- [x] `(onboarding)/interests`
- [x] `(onboarding)/bio`
- [x] `(onboarding)/location`

**Tabs**
- [x] `(tabs)/index` — Home nearby
- [x] `(tabs)/match` — deck
- [x] `(tabs)/chat` — Messages segment
- [x] `(tabs)/chat` — Requests segment
- [x] `(tabs)/profile`

**Home satellites**
- [x] `search`
- [x] `likes`
- [x] `notifications`
- [x] `filters`

**Deck & profile**
- [x] `user/[id]`
- [x] `like-note/[id]`
- [x] `matched/[id]`

**Chat & calls**
- [x] `thread/[id]`
- [x] `call/[id]`
- [x] `incoming-call/[id]`

**Safety**
- [x] `report/[id]`

**Edit profile**
- [x] `edit-profile/index`
- [x] `edit-profile/avatar`
- [x] `edit-profile/interests`
- [x] `edit-profile/bio`

**Settings**
- [x] `settings/index`
- [x] `settings/account`
- [x] `settings/discovery`
- [x] `settings/notifications`
- [x] `settings/blocked`
- [x] `settings/safety`
- [x] `settings/help`
- [x] `settings/legal`
- [x] `settings/subscription`
- [x] `settings/delete-account`

**Monetisation & system**
- [x] `paywall`
- [x] `+not-found`

---

## 6. Assumptions — confirm with client (0/18)

Each was a gap in the requirements. Tick when the client confirms or corrects it.

- [ ] **A1** — "Hello" is a placeholder name. No product name in user-facing copy, so renaming is `app.json` + one strings file.
- [ ] **A2** — Distance in **km**, via one centralised formatter. Miles is a one-line change.
- [ ] **A3** — English only. All copy in `src/copy/` so i18n is additive, not a sweep.
- [ ] **A4** — Notification permission primed **after the first match**. iOS allows one ask, so the moment matters.
- [ ] **A5** — Gender options: Woman / Man / Non-binary / self-describe / prefer-not-to-say, with a show-on-profile toggle.
- [ ] **A6** — ~60 interest tags across ~8 categories; minimum 3 at onboarding. Placeholder taxonomy.
- [ ] **A7** — ~30 placeholder avatars as local assets, referenced by id. Real art drops in as data.
- [ ] **A8** — Seed data: ~40 profiles, ~8 threads, ~6 inbound likes.
- [ ] **A9** — Home nearby is a **2-column grid**.
- [ ] **A10** — Accessibility baseline: labels and roles on every interactive element, 44×44 minimum targets, Dynamic Type respected. Not a full audit.
- [ ] **A11** — `backend/` stays empty. The contract ships as `docs/api-contract.md`.
- [ ] **A12** — `expo-location` used for the permission dance and a coarse coordinate; displayed distances come from mock data.
- [ ] **A13** — Web is not a target. `web.output: "static"` stays but is unverified.
- [ ] **A14** — Ad placeholders are inert mock components. No ad SDK. Deck ads every **10** profiles.
- [ ] **A15** — Premium is a session toggle, not a purchase. Three placeholder plans, no real prices, no billing provider chosen.
- [ ] **A16** — Free daily like quota is **15**, resetting at local midnight.
- [ ] **A17** — Calls produce no audio and request no mic permission. Incoming call fires from a dev-only control.
- [ ] **A18** — Requests do not expire. A declined request is discarded silently. Accepting seeds the thread with the note.

---

## 7. Open risks — resolve or accept (0/15)

- [x] **R1 — No designs exist.** Everything is on a placeholder palette. Tokens absorb colour, type and spacing cheaply; they **cannot** absorb a design implying different *structure*. **The single largest risk in the project.** — **RESOLVED 2026-09-19**: the client supplied `app/design/design-system.png` plus 10 of 11 Phase 4 screens. Palette, type scale, spacing, radii and components are all adopted; Phase 1 tokens were deliberately re-baselined. Structure did not change, which is the outcome this risk was watching for.
- [ ] **R2 — Avatar art is a dependency.** A real set with a different aspect ratio or style may change card layout, not just assets.
- [ ] **R3 — Installable builds need accounts.** iOS TestFlight/internal distribution requires an Apple Developer Program membership and an Expo account. **Not confirmed to exist.** Android APK has no such gate.
- [ ] **R4 — Android simulator readiness unknown.** `ANDROID_HOME`, an arm64 AVD, `emulator` on `PATH`, JDK 17. Phase 0 finds out; if Android can't boot, the core loop is blocked on day one.
- [x] **R5 — React Compiler is beta** and its interaction with Reanimated worklets is undocumented by both Expo and Software Mansion. Escape hatch: `"use no memo"` per file. **Reproduced in Phase 2** (`RangeSlider`): `react-hooks/immutability` flags `sharedValue.value = x` as mutating React-owned state. `"use no memo"` governs the compiler transform and does **not** silence the lint rule — a scoped `eslint-disable-next-line` is also needed. See parking log #9; Phase 6's deck will hit the same thing.
- [ ] **R6 — Reanimated 4.5.1 vs RN 0.86.3.** Software Mansion's table says 4.5.x supports RN 0.82–0.85 and 0.86 needs 4.7.x; Expo ships this pair deliberately. **Do not "fix" it by bumping.** `npx expo install --check` is the authority. If the deck misbehaves, look here first.
- [ ] **R7 — In-memory-only state** means a client poking at the installed build loses their signup on every restart. Persisting just the session via `expo-sqlite/kv-store` is ~10 lines and zero new deps. **Recommended; flagged rather than decided because it contradicts the stated "resets on restart".**
- [ ] **R8 — "No photos" is an untested product hypothesis.** Every comparable app leans on photos to carry the card. If it lands badly at demo the fix is design, not architecture — but it is a demo risk.
- [ ] **R9 — Two discovery surfaces** (Home nearby + Match deck) can feel redundant. Mitigated by making Home *browse* and Match *decide*. Watch it at demo.
- [ ] **R10 — Greenfield verification is structurally weaker** than the playbook's. With no "before", screenshot comparison only protects against regression *after* a screen is signed off — not against building it wrong the first time.
- [ ] **R11 — `+middleware.ts`** appears in expo-router 57's notation but its docs page 404s. We use documented `Stack.Protected` guards instead.
- [ ] **R12 — Ads, billing and calls are all mocked, and all three become native dependencies later** — an ad SDK, StoreKit/Play Billing (or RevenueCat), and WebRTC (or Agora/Twilio). Each needs a **rebuild**, not a reload, and New-Architecture compatibility checking on RN 0.86. The UI is reusable; the integration is separate work.
- [ ] **R13 — App Store subscription rules are strict.** In-app upgrades must use in-app purchase, the paywall must state price/period/renewal terms, and Restore Purchases is mandatory. **The placeholder paywall will not pass review as-is** — tell the client explicitly.
- [ ] **R14 — Ads are a design problem before a revenue one.** A deck ad every 10 cards is the most intrusive placement in the app, on the one surface with no photos to hold attention. Tunable from one constant — expect to tune after the demo.
- [ ] **R15 — The chat-list ad row sits in the most personal surface in the app.** Most likely of the three to draw a negative reaction, and the easiest to drop.

---

## 8. Parking log

Faults **found but not caused** by this work. Per the playbook: *you broke it → stop and fix; you found it broken → write it down and carry on.* Tell them apart by checking a clean copy of the original.

Handed over at the end as **"everything is done except these"**.

| # | Date | Phase | What | Where | Why it was parked |
|---|---|---|---|---|---|
| 1 | 2026-09-19 | 0 | Playbook PDF not present in the workspace, so `run-signals.sh` (§13) is a **reconstruction** from the signals PLAN.md references (`started`, `phase_done N`, `completed`) | `run-signals.sh` | Found missing, not caused. Replace with the canonical §13 file if it differs. |
| 2 | 2026-09-19 | 0 | Android SDK is at the Homebrew path `/opt/homebrew/share/android-commandlinetools`, not the usual `~/Library/Android/sdk`; `ANDROID_HOME`/`JAVA_HOME` are unset and the emulator is not on `PATH` | shell profile | Editing the operator's shell profile is their call. `run-signals.sh` exports all three per-session. |
| 3 | 2026-09-19 | 0 | Default JDK is 25; Gradle needs 17. Temurin 17.0.19 **is** installed | shell profile | Same as #2 — exported per-session, not persisted. |
| 4 | 2026-09-19 | 0 | ~~`react-test-renderer@19.3.0` vs `react@19.2.3` minor skew~~ — **FIXED** at the first EAS build, which it broke outright: `^19.3.0` resolves to 19.3.0, whose peer is `react@^19.3.0`, and the pinned `react@19.2.3` cannot satisfy it | `app/package.json` | Pinned to exactly `19.2.3`; the two must always match. Snapshots never misbehaved, so the local tree hid it — `npm ci --dry-run` against an existing `node_modules` reports "up to date" and re-resolves nothing. Only a clean install surfaces it. |
| 5 | 2026-09-19 | 0 | NativeWind v5 RC + Tailwind 4 added ahead of the §1 approved list, on operator instruction | `app/` | Signed off in session. Its `@theme` variables still need reconciling with the Phase 1 token contract. |
| 6 | 2026-09-19 | 0 | `eslint` + `eslint-config-expo` self-installed by `expo lint` on first run | `app/package.json` | Tooling the plan's own command requires; not a product dependency. |
| 7 | 2026-09-19 | 1 | `jest`, `@react-native/jest-preset` and `@types/jest` installed — `jest-expo` and `react-test-renderer` are only a preset and a renderer, neither runs tests alone | `app/package.json` | Required to make two already-approved deps function. Dev-only, ships nothing. |
| 8 | 2026-09-19 | 1 | `tsconfig.compilerOptions.types` pinned to `["jest"]` — `@types/jest` was not auto-discovered under TS 6 | `app/tsconfig.json` | Narrows global type packages. Revisit if another global-types package is added later. |
| 9 | 2026-09-19 | 2 | **R5 materialised.** React Compiler's `react-hooks/immutability` rule reports `sharedValue.value = x` as illegal mutation. `"use no memo"` does NOT suppress it — that governs the compiler transform, not the lint rule | `molecules/RangeSlider` | Scoped `eslint-disable-next-line` with the reason inline, rather than switching the rule off globally. Phase 6's swipe deck will need the same at each shared-value write. |
| 10 | 2026-09-19 | 2 | `jest.resolver` set to `react-native-worklets/jest/resolver.js` and `jest.setup.js` requires `react-native-gesture-handler/jestSetup` | `app/package.json` | Without the resolver, importing Reanimated under Jest loads `NativeWorklets.native.ts` and throws. Undocumented in PLAN; needed by any test touching the animation layer. |
| 11 | 2026-09-19 | 4 | **The design system is light-only.** `design-system.png` specifies no dark palette, but PLAN §1 requires dark from day one | `src/theme/tokens.dark.ts` | Dark is derived from the light tokens, not supplied. Needs client review before it is treated as approved. |
| 12 | 2026-09-19 | 4 | **30 avatar images do not exist.** They appear only baked into `step4.png` and `design-system.png`, so they cannot be extracted cleanly | `assets/images/` | `Avatar` falls back to the initial on a tinted circle. This is R2 — the most visible remaining art gap. |
| 13 | 2026-09-19 | 4 | **No design for step 5 (interests).** Also `onboarding/step5.png` actually contains Step 6 (bio) — the filename is off by one | `app/design/onboarding/` | Interests built from the design system + the wizard frame, per operator decision. Worth renaming the file to `step6.png` to stop the next person losing the same 10 minutes. |
| 14 | 2026-09-19 | 4 | Welcome carousel slides 2 and 3 reuse slide 1's illustration | `components/welcome/ValueCarousel` | Only one hero illustration was supplied. Structure is complete; two more images drop in as data. |
| 15 | 2026-09-19 | 4 | Design system nav bar says **"Discover"**; PLAN §1 locks the tab as **"Match"** | `design-system.png` | Operator confirmed PLAN wins. Noted so the discrepancy is not rediscovered as a bug in Phase 5. |
| 16 | 2026-09-19 | 4 | **iOS cannot build.** `expo-modules-jsi@57.1.0` is incompatible with Xcode 26.2 on two counts: `SWIFT_RETURNS_RETAINED` on constructors (patched), then Swift 6 strict-concurrency errors in `JavaScriptRuntime.swift` (not patched) | `node_modules/expo-modules-jsi` | Found broken, not caused. 58.0.2 ships identical code; only Xcode 26.2 is installed. Options: Swift-6 opt-out for the pod, or install Xcode 26.0/26.1. `scripts/patch-expo-modules-jsi.js` carries the first fix. |
| 17 | 2026-09-19 | 4 | Emulator reports **"Reduced motion is enabled on this device"** — Reanimated disables animations by default | `Flavour_Pixel` AVD | Harmless for Phase 4. **Matters for Phase 6** — the swipe deck would look broken rather than disabled. Turn off Developer Options → Remove animations before deck work. |
| 18 | 2026-09-19 | 4 | `AvatarPicker` still renders 4 tiles per row with `columns={5}` after the gap fix; not re-verified post-reload | `organisms/AvatarPicker` | Cosmetic. The gap removal is in the source and typechecks; needs one look after a clean reload. |
| 19 | 2026-09-19 | 4 | `+not-found` shows a native header bar despite `headerShown: false` on both the Stack and the screen | `src/app/+not-found.tsx` | Cosmetic, and only reachable via a bad deep link. Likely expo-router's internal not-found wrapper. |
| 20 | 2026-09-19 | 5 | ~~Nearby grid cards are uneven height~~ — **FIXED 2026-09-19**: fixed avatar block and a text block sized for two chip rows, so the grid stays uniform whatever the interest labels are | `organisms/ProfileCard` | Closed during the Home design pass. |
| 21 | 2026-09-19 | 5 | On the bio step, the pinned footer **overlaps the "Need a hand?" prompt chips** when the keyboard is up | `(onboarding)/bio.tsx` | Chips are still reachable by scrolling. Low impact; worth a look when the keyboard handling is revisited. |
| 22 | 2026-09-19 | 5 | The dev-client floating gear button **covers the Home filter entry**, so it cannot be tapped in a dev build | dev client only | Not a product bug — the overlay does not exist in a release build. Reach `filters` by deep link when sweeping. |
| 23 | 2026-09-19 | 5 | **Snapshots were not deterministic.** Fixtures anchor to `Date.now()` (Phase 3, deliberately), and `refreshControl` takes a React element whose internal `_debug*` fibre fields move between runs — so 6 snapshots failed on a second run with no code change | `app/jest.serializers.js` | Fixed, not parked: two snapshot serializers redact ISO timestamps and collapse React elements to their type name. Verified stable across three consecutive runs. A baseline that churns cannot catch a regression. |
| 24 | 2026-09-19 | 5 | **Gender filter added** ("Show / All genders") from the Home design — not in PLAN's locked scope. Touches `profiles.service`, `filters.store`, two new routes and `docs/api-contract.md` | `filters/genders` | Operator approved. Needs client confirmation as a scope addition; recorded as an assumption below. |
| 25 | 2026-09-19 | 5 | The Home design shows **no likes entry** in the header, but PLAN §1 makes Likes a Home header entry | `home/HomeHeader` | PLAN wins (same precedence as "Match" vs "Discover"). Dropping it would leave `/likes` unreachable. |
| 26 | 2026-09-19 | 5 | The filters design shows **no live count**; PLAN §5 requires one | `app/filters.tsx` | Operator ruled the count stays. Design row layout adopted, count kept under the distance value and in the CTA. |
| 27 | 2026-09-19 | 6 | **Avatar prefetch cannot be implemented.** PLAN asks for the next N avatars to be warmed through `expo-image`, but the preset artwork does not exist (R2) so there are no sources | `(tabs)/match.tsx` | Left out with a note in the code rather than stubbed as a no-op effect. Reinstate when the avatar assets land. |
| 28 | 2026-09-19 | 6 | The expanded-profile sheet has **no sticky like/pass action bar** — tapping a card opens `user/[id]`, but you must close it to decide | `user/[id].tsx` | PLAN asks for one. Deferred rather than claimed; it changes that screen's role from "view" to "decide" and is worth designing before building. |
| 29 | 2026-09-19 | 6 | The design's celebration coins **"It's a Connect!"** for a match, and the tab reads "Discover" | `design/match/` | Celebration copy adopted (PLAN never locked it, and it de-romanticises the moment). Tab stays "Match" per PLAN §1 and the earlier ruling — see #15. |
| 30 | 2026-09-19 | 6 | ~~**Haptics could silently break the whole deck**~~ — **FIXED**: on a device with no vibrator `Haptics.impactAsync` threw synchronously inside `commit`, killing it before `onLike`. The card animated, the stamp appeared, and the deck refused to advance, with no error anywhere | `deck/SwipeDeck` | Caused here, so fixed not parked. Recorded because it is invisible to tests and to any device that *has* haptics — it would only have appeared on an emulator or a phone with haptics disabled. |
| 31 | 2026-09-19 | 7 | **Fixture addendum to A8**: a 9th seeded match, `thread-fresh`, with a thread and **no messages** | `mocks/threads.ts` | Not parked — done deliberately, recorded because A8 says "8 threads". With 8 fully-populated conversations the new-matches carousel and the "no messages in a thread" state are both unreachable, and PLAN Phase 7 requires each. Needs a nod, not a rework. |
| 32 | 2026-09-19 | 7 | ~~**Unstable zustand selector re-rendered the thread forever**~~ — **FIXED**: `state.messages[id] ?? []` returns a new array on every call, so `useSyncExternalStore` never saw a stable snapshot ("The result of getSnapshot should be cached") | `app/thread/[id].tsx` | Caused here, so fixed not parked. Recorded because the `?? []` idiom is everywhere and reads as harmless — it is only a bug inside a store selector. |
| 33 | 2026-09-19 | 7 | **Report from the thread overflow files a `other`-reason report** instead of opening a reason picker | `app/thread/[id].tsx` | Phase 8 builds `report/[id]` with "Romantic or flirty advance" leading the list, and PLAN Phase 8 already lists the thread overflow as an entry point. An interim working path beats a menu item pointing at a route that does not resolve yet. |
| 34 | 2026-09-19 | 7 | **Test clocks are only partly deterministic.** Wall-clock times in chat snapshots go through `redactClockTimes`; day separators still depend on the run not starting within ~30 min of midnight | `renderAtom.tsx` | Freezing `Date` globally in `jest.setup.js` fixes it at the source, but it also shifts fixture ages by one year-boundary and churned 16 established Phase 1–6 snapshots. Not worth rewriting a frozen baseline for a narrow flake; revisit if the boundary is ever actually hit. |
| 35 | 2026-09-19 | 7 | ~~**Accepting a request sat for ~3s doing nothing before the thread opened**~~ — **FIXED**: `onAccept` awaited a full list reload before `router.push`, and that reload only fetched a name for a row the user was navigating away from | `app/(tabs)/chat.tsx` | Caused here, so fixed not parked. Found by hand on device; every test passed either way, because a snapshot cannot see a delay. |
| 36 | 2026-09-19 | 7 | The **dev-client gear overlays the thread header's overflow button**, not just Home's filter button (parking #22) | dev client | Same overlay, one more screen. Dragged aside to verify. It is a dev-client affordance and is absent from a release build, so nothing to fix in our code. |
| 37 | 2026-09-19 | 7 | The **`ReactionPicker` is centred on screen, not anchored to the bubble** it acts on | `chat/ReactionPicker` | Works (the reaction lands on the right message, verified on device) but with the list dimmed you cannot see which bubble you are reacting to. Anchoring needs the bubble's measured position; worth doing, not worth blocking the phase. |
| 38 | 2026-09-19 | 7 | The **thread overflow sheet fits five rows**; a sixth lands under the bottom inset | `chat/ThreadMenu` | Found by adding the dev row and watching it vanish. Dev row moved to the top. If a real sixth item is ever added, the sheet needs to scroll. |
| 39 | 2026-09-19 | 8 | The profile design's stat row reads **"24 Friends · 56 Likes · 8 Connections"** — none of which this product counts, and two of which would be the match count twice | `profile/ProfileStats` | Shipped as **Matches · Likes**, the two figures that are real. Three invented numbers is the kind of detail a client asks about in a demo and nobody can answer. |
| 40 | 2026-09-19 | 8 | The safety design's first card uses a **red heart** for "Be respectful" | `settings/safety.tsx` | Swapped for a waving hand. A heart is the most romance-coded glyph there is and this product is platonic only — the same reason there is no heart in the chat reaction picker. |
| 41 | 2026-09-19 | 8 | The settings design lists **Privacy, Location, App preferences, Data & storage, Community guidelines, About** — a generic skeleton, not this product's tree | `settings/index.tsx` | PLAN names the nine screens the product needs and PLAN wins, as with "Match" vs "Discover" (#15). The design's *treatment* — grouped rows, icon + label + chevron, red logout alone at the bottom — is adopted in full. |
| 42 | 2026-09-19 | 8 | **"Show me on app" has no observable effect.** It changes what other people see, and there are no other people in a mock | `settings/discovery.tsx` | Deliberately not faked into a local filter, which would hide other people from *you* — the opposite of what it means. The setting is stored and its state is shown on the Settings row ("Visible" / "Hidden") so it is at least legible in a demo. |
| 43 | 2026-09-19 | 8 | **The notification primer does not request the OS permission.** `expo-notifications` is a native module and is not on the approved dependency list | `notifications/NotificationPrimer` | Same treatment as calls, premium and ads: the UI is real, the integration is future work and adds a dependency plus a rebuild. Accepting or declining still records `notificationPrimerShown`, which is what stops it asking twice (A4). |
| 44 | 2026-09-19 | 8 | ~~**Six screens turned a failed fetch into an unhandled promise rejection**~~ — **FIXED**: `useFocusEffect` and `useEffect` can only be handed a `void` call, and none of the new loads caught | profile, edit-profile ×4, settings/account | Caused here, so fixed not parked. Found because the leaked rejection surfaced on an *unrelated* test three cases later — in a release build it is a silent blank screen, which is worse. |
| 45 | 2026-09-19 | 8 | ~~**Two profile snapshots were byte-identical**~~ — **FIXED**: `CURRENT_USER` ships blank (it is the pre-onboarding state), so "filled in" and "nothing filled in" tested the same thing | `__tests__/profile.test.tsx` | Caught by the MD5 duplicate check, not by the tests, which both passed. The filled case now runs the profile through what the wizard would have written. |
| 46 | 2026-09-19 | 8 | ~~**`nextId` ids churned between runs**~~ — **FIXED**: the id is `prefix-<base36 now>-<counter>`, so it moves with the clock *and* with how many ids the whole suite minted first — stable alone, different in a full run | `jest.serializers.js` | Caused here. A fourth serializer redacts minted ids and leaves seeded ones (`thread-1`, `user-07`) alone, since those are the ones worth asserting on. |
| 47 | 2026-09-19 | 8 | The profile design shows **pastel interest chips**; the profile screen was rendering them grey | `(tabs)/profile.tsx` | Fixed during the sweep — `InterestChips` already had `coloured`, already used by the deck card, and the profile simply was not passing it. One word. |
| 48 | 2026-09-19 | 8 | **`adb shell input text` silently drops characters** on long strings — the same bio landed as 18 chars, then 9, then complete | verification harness | Not an app defect: typed in chunks the full string lands every time, and the field's own `maxLength` is 300. Worth knowing before reading a truncated value in a capture as a bug. |
| 49 | 2026-09-19 | 8 | **"The primer asks only once" was verified by test, not on device** — the deck ran out of cards before a second match | `notifications/NotificationPrimer` | It fired exactly once on device and the dismissal was recorded; the second-match case is covered by a behaviour test asserting `notificationPrimerShown` persists through the service. Worth one more pass when the deck has more cards. |
| 50 | 2026-09-19 | 9 | **The ad card is a real card in the deck, which needed its own index arithmetic** — an ad must not spend a like or burn a profile | `(tabs)/match.tsx` | Not parked, just worth explaining: `SwipeDeck` is generic so the ad is swipeable rather than an overlay, and a local `adsDismissed` counter keeps the store's profile index and the visual index in step. |
| 51 | 2026-09-19 | 9 | **No `blurRadius` on the locked likes tiles** — PLAN says "blurred", the implementation locks instead | `app/likes.tsx` | `blurRadius` is an `Image` prop and there are no photographs in this product (PLAN §1). There is nothing to blur: the tile shows an initial, so it is replaced by a lock glyph and the name by a grey bar. Same intent, honest about what is hidden. |
| 52 | 2026-09-19 | 9 | ~~**The real quota countdown made two Phase 6 snapshots churn**~~ — **FIXED**: replacing the hardcoded word "midnight" with a live countdown is correct behaviour and a different string every run | `renderAtom.tsx` | Caused here. `redactCountdown` promoted to the shared test helper and applied in both suites, scoped to the sentence that carries it so a "12m" elsewhere survives. |
| 53 | 2026-09-19 | 9 | **R13 still stands: this paywall will not pass App Store review.** Real in-app purchase, stated renewal terms, real prices and a working Restore are all required | `paywall.tsx` | Unchanged from Phase 3's risk register — recorded again here because the screen now exists and looks finished, which is exactly when this gets forgotten. The `terms` line says so in the UI, not just in a comment. |
| 54 | 2026-09-19 | 9 | **The out-of-likes gate is nearly unreachable in the demo.** The deck runs out of cards before the 15/day quota runs out — anyone who passes on a few people exhausts 40 seeded profiles first | `mocks/profiles.ts`, A16 | Found trying to reach the state on device and failing twice, even after widening the distance filter to 85 km. Snapshot-verified instead (the test spends the real quota through `consumeLike`). Either the seed needs more people or the demo quota needs lowering — that is a product call, not a code one. |
| 55 | 2026-09-19 | 9 | **The deck's pan gesture ignores `adb shell input swipe`** — it needs `motionevent DOWN/MOVE/UP` with intermediate moves | verification harness | Same as the Phase 6 finding, and it caught me again on the ad card and then on the distance slider. Both are pan-gesture surfaces. Worth remembering before reading "the card would not move" as a bug. |
| 56 | 2026-09-20 | 10 | **Two card call sites disagree with the other four, and both were kept.** Account draws no dividers at all between its three rows; Legal uses a full-bleed rule because its rows have no icon gutter to clear | `settings/account.tsx`, `settings/legal.tsx` | `Card` deliberately does not insert dividers. A version that did would have silently changed two screens while claiming to deduplicate a third — the "quiet correction" PLAN forbids. Whether Account *should* have dividers is a design call, not a refactor call. |
| 57 | 2026-09-20 | 10 | ~~**The snapshot baseline expired at midnight**~~ — **FIXED**: six snapshots broke overnight with no code change. The birthday wheel scrolls to a today-relative offset, the notifications feed groups by relative day, and Account renders "Member since" | `jest.setup.js` | The clock freeze deferred in Phase 8 (parking #34), done now that the cost is justified. A baseline that expires daily cannot catch a regression. Two client tests that genuinely measure elapsed time moved to `performance.now()`. |
| 58 | 2026-09-20 | 10 | ~~**The shared kit barrel must not depend on navigation**~~ — **FIXED**: exporting `useFocusLoad` from `components/common/index.ts` dragged `expo-router` and its untransformed `standard-navigation` dependency into every suite touching the kit, breaking the pure atom tests at parse time | `components/common/index.ts` | Caused here. The hook is imported by path instead, and the invariant is now written down in the hook's own header — it was previously enforced only by two test suites failing in a confusing way. |
| 59 | 2026-09-20 | 10 | **The hand-rolled dividers were also a small regression.** Nine sites wrote `height: 1`; the `Divider` atom has used `StyleSheet.hairlineWidth` since Phase 1 | 7 files | Replaced with the atom, which makes the rule one physical pixel instead of thickening on 2x/3x screens — visible as `height: 1 → 0.5` across 24 snapshots. DaySeparator's two are left alone: they are `flex: 1` rules flanking text, which the atom cannot express. |
| 60 | 2026-09-20 | post-10 | **Dark is now the default theme, on operator request**, with a two-way switch in Settings → Appearance | `stores/ui.store.ts`, `settings/index.tsx` | Not parked — a requested change, recorded because it moves a §1 decision. Dark mode itself was already built (both token sets since Phase 1, every snapshot captured in both). What changed is the default and the control. |
| 61 | 2026-09-20 | post-10 | **"Follow the system theme" is no longer reachable from the UI.** The store still accepts `null`, but Settings offers dark/light rather than dark/light/system | `settings/index.tsx` | A switch is what was asked for. Worth knowing it is a deliberate narrowing, not an oversight — a third "Follow system" row is a few lines if the client wants it. |
| 62 | 2026-09-20 | post-10 | **A dark default needs three native changes, not just a token swap** — `userInterfaceStyle`, the splash background and the status-bar glyph colour | `app.json`, `theme/ThemedStatusBar.tsx` | Without them the splash flashes light before a dark app, and the status-bar icons render dark-on-dark and vanish. Both are invisible to the test suite, which never renders native chrome. The dark palette itself is still derived rather than supplied — the client's design system is light-only (see the `tokens.dark.ts` header). |
| 63 | 2026-09-20 | post-10 | **`eas.json` pins `"node": "24.11.1"` and that pin is load-bearing.** The EAS worker image ships Node 22 / npm 10.9.8; this project develops on Node 24 / npm 11.6.2, and the two npms write incompatible lockfiles — npm 10 wants optional **peers** recorded, npm 11 wants every **platform's** optional binaries. Each rejects the other's file, so `npm ci` fails whichever way it is generated | `app/eas.json` | JSON cannot carry a comment, so this is the only place the reason is written down. Removing the pin as tidying will break every build. |
| 64 | 2026-09-20 | post-10 | **Upstream bug: `react-native-worklets@0.10.1` declares `"@react-native/metro-config": "*"` as a non-optional peer.** A wildcard against a live registry resolves to whatever React Native published most recently — 0.87.1 today — dragging the entire metro 0.87 toolchain in against the 0.84.5 that RN 0.86.3 actually uses | `app/package.json` `overrides` | Not caused here and not fixable here. Pinned to `0.86.3` in `overrides` to stop it floating. This would bite **any** clean install, including a fresh `npm install` on this machine, and it will re-break every time RN ships a release until upstream tightens the range. |
| 65 | 2026-09-20 | post-10 | **The EAS build is NOT lockfile-locked, and this is the most important open item here.** `npm ci` on the Linux worker demands `@react-native/metro-config` in the lockfile; npm on macOS prunes it and will not record it (`--include=peer` and full regeneration both tried). No lockfile generated on this machine can satisfy it, so the build runs with `EAS_BUILD_SKIP_LOCKFILE_CHECK=1` and the lockfile moved aside, which makes EAS fall back to **yarn** and resolve transitives on the builder | `app/package.json`, build procedure | Direct deps are pinned or tilde-ranged and `expo`/`react`/`react-native`/`reanimated` are exact, so the protected stack is fixed — but transitives are not. **Fix before Play:** generate `package-lock.json` inside a Linux container and commit that; it restores `npm ci` and strict pinning. |
| 66 | 2026-09-20 | post-10 | **`overrides` is npm-only — yarn silently ignores it.** When EAS fell back to yarn, the `lightningcss@1.30.1` pin (§2, "leave it pinned") was dropped and a nested copy under `@expo/metro-config` failed to compile `global.css`: *failed to deserialize; expected an object-like struct named Specifier* | `app/package.json` `resolutions` | Both pins are now mirrored into `resolutions`, yarn's equivalent, so they hold whichever manager runs. Keep the two blocks in step — an override added to one and not the other is a pin that works locally and vanishes on the builder. |
| 67 | 2026-09-20 | post-10 | **`KeyboardAvoidingView` cannot work on the chat thread, and the fix has a 24dp trap.** It positions by measuring its own frame; a thread's content is a list, which absorbs any space handed to it, so the composer never moved and the keyboard covered it. All three behaviours were tried on device | `components/common/hooks/useKeyboardInset.ts` | Fixed by measuring **window bottom → keyboard top**, *not* `endCoordinates.height`: under edge-to-edge that height stops at the top of the gesture nav bar, leaving the element 24dp short (measured: keyboard top 577.9dp + height 312.4dp = 890.3dp against a 914.3dp window). The onboarding form screens are fine with `KeyboardAvoidingView` because their content can compress. |
| 68 | 2026-09-20 | post-10 | **`BareInput` promises "no padding" in its own docstring but never sets `padding: 0`**, so Android's native `EditText` supplies ~19dp of its own | `components/chat/ChatComposer` | Inflated the composer field to 61dp against a 44dp send button, which then bottom-aligned to a much taller box and read as sitting low. It also silently capped the field at ~2 lines rather than the 4 `maxHeight: 120` was sized for. Reset at the composer call site only — the atom is also used by the verified OTP cells and onboarding name field, so fixing it in the atom is a wider change than was asked for. |
| 69 | 2026-09-20 | post-10 | **`app/AGENTS.md` still states "Expo Go is not viable — Development build required". That is now demonstrably false** | `app/AGENTS.md` | Expo Go 57.0.9 runs this app and was used in this session. Left unedited because it is a rules file and its wording is the operator's call, but it should not stay as-is: the next person will skip a working, faster path on its authority. |
| 70 | 2026-09-22 | post-10 | **The component tree was organised by *topic*, not by *screen*** — 8 of 16 folders (`chat/`, `deck/`, `calls/`, `ads/`, `premium/`, `brand/`, `notifications/`, `interests/`) each held more than one screen's components, and **0 of 42** had an `atoms`/`molecules`/`organisms` tier | `src/components/**` | Reorganised on operator instruction: a component used by one screen lives in `components/<screen>/<tier>/`, one used by two or more in `components/common/<tier>/`. 46 folders moved, 29 files re-imported, 8 topic folders removed. `chat/` alone was two screens — the chat list and the thread — which is exactly the failure a topic name hides. The rule is now written into `app/AGENTS.md`. |
| 71 | 2026-09-22 | post-10 | ~~**Parking #58 recurred, from the other direction**~~ — **FIXED**: moving the ad family into `common/` and exporting it from the barrel dragged `expo-router` back in via `AdSlot`, breaking the pure atom tests at parse time with the same misleading *Cannot use import statement outside a module* | `components/common/index.ts` | Caused here. #58 fixed the symptom for one hook; the invariant lived only in that hook's header, so the next navigation-aware export walked into it. The barrel header now states the rule and names **both** exceptions. Every ad call site already imported by path, so the four barrel lines were removable with no call-site change. |
| 72 | 2026-09-22 | post-10 | **A selectable option row was hand-written on four screens, two of them character-for-character identical** | `report/[id].tsx`, `settings/delete-account.tsx`, `(onboarding)/gender.tsx` | Extracted as `common/molecules/SelectableRow` and adopted on three. Unifying the container cost the gender step `paddingHorizontal: 16 → padding: 16` plus `gap: 12`: **two snapshots deliberately re-baselined**. Row height is unchanged — `body` line-height 22 + 32 padding = 54 against a `minHeight: 56` that still wins, and the indicator is 24 + 32 = 56 exactly. The only real change is 12px off a flex label that holds one short word. |
| 73 | 2026-09-22 | post-10 | **The gender *filter* was deliberately left out of `SelectableRow`** | `filters/genders.tsx` | It looks similar and is not: no border, no surface, no selected background, and a `Divider` between rows. Folding it in needs a variant that changes every visual property, which is a worse abstraction than the duplication it removes. Same reasoning as #56 — a shared component that silently restyles a call site is the quiet correction PLAN forbids. |
| 74 | 2026-09-22 | post-10 | **Accessibility labels are hardcoded throughout the components, while §1 says every string lives in `src/copy/`** — `"More options"`, `"View profile."`, `"Dismiss"`, `"Close"` | `components/**` | Not caused here and not fixed here: it is the established pattern in every component written so far, so changing it is a sweep, not a side-effect of this one. Two *visible* strings found in the same pass **were** lifted, because they were being moved anyway: `"Sent a note"` → `copy.premium.sentNote` and `"Someone"` → `copy.notifications.unknownActor`. A screen reader is a user-facing surface; these should follow. |
| 75 | 2026-09-22 | post-10 | **A stray git worktree inside `app/` makes jest print a haste collision on every run** — `<rootDir>/.kilo/worktrees/adjoining-dirigible/package.json` shares the name `hello` with the real one | `app/.kilo/` | Harmless today (the suite passes) but it is noise on every run and a second `package.json` in the module map is a trap waiting for someone. Not removed here — deleting another tool's worktree is not this task's call. |
| 76 | 2026-09-22 | post-10 | ~~**A new test called `jest.useFakeTimers()`, against the documented invariant**~~ — **FIXED**: `jest.setup.js` freezes `Date` and leaves timers real *on purpose*, because `renderAtomAsync` flushes the mock client's `setTimeout` latency to reach content states | `NotificationRow.test.tsx` | Caused here. Surfaced as **38 snapshot failures in `home.test.tsx`** — a different suite from the cause — during a run where an Android emulator and Metro were also running, and it **passed on the next run**, which is the worst kind of failure. The test now derives its timestamp from the frozen clock instead. Contention was a contributing factor; the invariant breach was mine either way. |
| 77 | 2026-09-22 | post-10 | **That same bad run left a debris snapshot: `Phase 5 — Home — light theme likes 2` = `null`** — a second snapshot for a test that calls `toMatchSnapshot()` exactly once | `__tests__/__snapshots__/home.test.tsx.snap` | Removed by hand rather than with `-u`, which would have rewritten real baselines at the same time. Confirmed absent from the pre-refactor copy, so it was not pre-existing. All six screen snapshot key sets now match that copy exactly. |
| 78 | 2026-09-22 | post-10 | **Device verification of this refactor is PARTIAL — routes were not all walked by hand** | verification harness | Verified on Android (`goldie_pixel_10_pro`): Metro bundled all 2403 modules with no resolution error — the strongest single signal for an import-only change — and welcome, phone, OTP and the country-picker sheet were driven by hand, covering `Logo`, `ValueCarousel`, `CountryPicker`, `OtpInput` and the new `Sheet` atom. The emulator then degraded until `adb shell input text` returned SIGKILL, so gender, likes, notifications and thread were **not** reached. Against that: five of six screen snapshot files are byte-identical to the pre-refactor baseline and the sixth differs only by the intended gender re-baseline (#72). An ANR seen twice on the country picker did **not** reproduce once the tap sequence was corrected — it was landing on the wrong screen. |
| 79 | 2026-09-22 | backend-0 | **The local `mongod` is a shared standalone, which cannot do transactions** — no `replication:` section in `/opt/homebrew/etc/mongod.conf`, and it holds many other projects' collections with Compass attached | infrastructure | Accepting a message request must write a match, a thread, a seed message and a status flip **atomically**; a standalone cannot. Converting the shared instance would have restarted a service other projects depend on, so it was **not** done. **Operator chose MongoDB Atlas**, whose clusters are replica sets by definition — the blocker disappears and the local mongod is left untouched. **Atlas is not connected yet**: development continues against the local standalone in a dedicated database (`hello_dev`), which is correct because **Phases 1-3 write one document at a time and need no transaction**. The gate is the `REQUIRE_TRANSACTIONS` env var: `/ready` reports `transactions` always, and returns **503** only when they are required and missing. Production refuses to boot with it off. It gets flipped on the day Phase 4 starts, so the dependency cannot be forgotten rather than merely documented. |
| 80 | 2026-09-22 | backend-0 | **The root `.gitignore` covered `.env*.local` but not `.env`** — a backend `.env` holding four secrets would have been committed on the first run | `.gitignore`, `backend/.gitignore` | Fixed in both files before any secret was generated. The Atlas connection string carries the database password, so this was a real leak waiting to happen rather than a tidiness note. |
| 81 | 2026-09-22 | backend-1 | ~~**A deleted account kept working for up to 15 minutes**~~ — **FIXED**: `DELETE /me` revoked the refresh tokens but the outstanding **access** token stayed validly signed, and `requireAuth` only rejected `erased`, not `pendingDeletion` | `middlewares/auth.ts` | Caused here, found by driving the flow rather than by a test — `GET /me` returned **200 with the full profile** immediately after a successful delete. `requireAuth` now rejects any status that is not `active`, so the account state is the authority rather than the token's signature. Covered by a test that asserts 200 before and 401 after. |
| 82 | 2026-09-22 | backend-1 | ~~**Restoring a deleted account brought it back permanently invisible**~~ — **FIXED**: `requestDeletion` set `preferences.discoverable = false`, and the restore path did not put it back | `services/me.service.ts` | Caused here. Worse than an oversight: `discoverable` is a **user setting**, so clobbering it destroys a choice they may have made themselves, and restore cannot tell the two cases apart. Deletion now changes `status` and nothing else — hiding is `status != "active"`, which every discovery query filters on and which the compound index already leads with. |
| 83 | 2026-09-22 | backend-1 | **`POST /me/restore` was specified but is unreachable** — deletion revokes every session, so no valid token can exist to call it | `docs/api-contract.md` | Removed from the contract and never implemented. Restoring happens by **signing in again**, which needs no token. An endpoint nobody can reach is worse than no endpoint, because it reads as a working feature in the document the backend is built against. |
| 84 | 2026-09-22 | backend-2 | **The Atlas database password was pasted into a chat transcript and has NOT been rotated** — operator decision: rotate at production time, not now | Atlas, `backend/.env` | Recorded because it is invisible in the code and will be invisible again in three weeks. **Rotate before the cluster holds anything real, and before the VPS connects to it.** Atlas → Database Access → Edit user → Edit Password → Autogenerate; then `npm run set-mongo`, which takes the value on hidden stdin so it stays out of the shell history and any transcript. The current cluster is a demo M0 holding only seed data, which is what makes deferring defensible. |
| 85 | 2026-09-22 | backend-2 | ~~**The seed diverged from the app's mock from user-02 onward**~~ — **FIXED**: `mocks/profiles.ts` ends its loop with one more draw than it appears to, `distances.set(id, 400 + Math.floor(random() * 59_600))`, so a faithful-looking port ran one draw behind | `seed/profiles.seed.ts` | Caused here. The symptom was baffling: **user-01 and user-03 matched perfectly while user-02 did not** — an offset only bites on the NEXT iteration, and re-aligns wherever the interest count happens to compensate. Found by diffing interest ids and noticing the seed's picks were the app's picks with one extra before and one extra after. |
| 86 | 2026-09-22 | backend-2 | **The fix turned out better than reconciliation: seeded distances are now IDENTICAL to what the app already shows** | `seed/profiles.seed.ts` | That stray draw is `400 + random*59_600` — the exact number printed on every card today. Rather than inventing a distance curve, the seed consumes the same draw and uses it as the real `$geoNear` distance, placing the coordinate on a bearing taken from the draw the app spent on latitude. Same draws, same order, same count: names, bios, ages, genders, avatars and birthdays verify **40/40 identical** against the app's own mock, and so do the distances. 19 of 40 fall inside the 25 km default, so the slider still filters — seeding the app's raw coordinates would have put all 40 inside. |
| 87 | 2026-09-22 | backend-2 | ~~**A unique sparse index over an array rejected 59 of 60 interests**~~ — **FIXED**: `E11000 dup key: { aliases: undefined }` | `models/interest.model.ts` | An **empty array indexes as `undefined`, and `sparse` does not exclude it** — absent is excluded, empty is not. Two changes were needed, and the second is the non-obvious one: the seed omits `aliases` entirely rather than sending `[]`, **and** the schema sets `default: undefined`, because Mongoose gives every array path an automatic `[]` default, so declaring no default is not the same as having none. |
| 88 | 2026-09-22 | backend-3 | ~~**`$geoNear` results are plain objects, not hydrated documents**~~ — **FIXED**: the profile serializer called `doc.get("createdAt")` and every discovery request 500'd with `doc.get is not a function` | `serializers/profile.serializer.ts` | Caused here. `aggregate()` returns POJOs; `findOne()` returns a Mongoose document. The serializer takes both, so it now reads properties directly, which works for either. Worth remembering before writing any aggregation-backed serializer. |
| 89 | 2026-09-22 | backend-3 | ~~**Mounting the discovery router with `router.use(requireAuth)` turned every unknown path into a 401**~~ — **FIXED**: it mounts at `/v1`, so the blanket middleware ran on unmatched paths too and `GET /v1/nope` answered `unauthorized` instead of `notFound` | `routes/v1/discovery.routes.ts` | Caught by the Phase 1 error-envelope test, which is exactly why that test exists. Guards are now applied per route. A 401 on an unknown endpoint contradicts the contract's error table and hides real 404s. |
| 90 | 2026-09-22 | backend-3 | **The gender filter unions `preferNotToSay` in rather than filtering it out** | `services/discovery.service.ts` | Not a bug — a deliberate rule worth recording because it looks like one. Excluding hidden-gender users from a gender-filtered search would reveal the value they chose to hide: you would learn someone's gender by noticing they vanished. Asserted by a test, and the mock already behaved this way (`profiles.service.ts:70-75`). |
| 91 | 2026-09-22 | backend-3 | **Pagination is a signed keyset cursor, not an offset — and the difference is testable** | `utils/cursor.ts` | The mock's cursor is `String(offset)` parsed with `Number()`. An offset silently SKIPS a profile when anyone is inserted nearer than the current page boundary, and repeats one on a delete; neither throws. The cursor now encodes a position in a total order `(distance, _id)`, is HMAC-signed, and is bound to the owner and to the filter set. Covered by a test that inserts a profile mid-pagination and asserts no overlap, plus replay and tamper cases. |
| 92 | 2026-09-23 | backend-4 | ~~**`sanitizeFilter: true` broke every query that uses an operator**~~ — **FIXED**: set globally in Phase 0 as a query-injection defence, it cannot tell a server-built `$nin` from user input, so `{ fromUserId: { $nin: [...] } }` was cast as a literal and failed with *Cast to ObjectId failed for value `{ '$nin': [] }`* | `config/mongo.ts` | Caused here, and it lay dormant for two phases because discovery uses aggregations, which bypass it. It surfaced the moment `find()` needed an operator. Injection is now prevented **at the edge**, which is where it belongs: every body and query string is zod-parsed before reaching a service, ids go through `Types.ObjectId.isValid`, and the search term is regex-escaped. The standing rule is written into the file: no unvalidated input reaches a filter. |
| 93 | 2026-09-23 | backend-4 | **Phase 4 needs transactions and the local mongod is a standalone, so `withTransaction` degrades deliberately** | `utils/transaction.ts` | Accepting a request writes a match, a thread, a seed message and a status flip; a partial write is a corrupt account state nothing surfaces. On a replica set this is a real transaction. On a standalone it runs the same callback without a session and logs a warning once. The escape hatch is bounded by a startup assertion rather than by anyone remembering: `env.ts` refuses to boot when `NODE_ENV=production` and `REQUIRE_TRANSACTIONS` is off, and with the flag on `withTransaction` throws instead of degrading. |
| 94 | 2026-09-23 | backend-4 | **The quota spend is a Lua script, and the concurrency test is the point** | `services/quota.service.ts` | `GET` then `INCR` is a race: two concurrent likes both read 14, both write 15, and the user gets 16. Sequential tests pass either way, which is what makes this worth an explicit case — **20 simultaneous likes, exactly 15 accepted, 5 refused, and the like count in Mongo agrees**. Every failure path after the spend refunds, so a like that did not happen is free, and re-liking is idempotent and costs nothing. |
| 95 | 2026-09-23 | backend-4 | **"The pair cannot recur" is enforced by a unique index, not by a code path** | `models/match.model.ts` | `pairKey` is the sorted id pair with a unique index, and the match row is KEPT on unmatch with `endedAt` set — so a second insert for that pair fails structurally. The same index also settles a simultaneous mutual like: the loser catches E11000 and reads the winner's row, so no distributed lock is needed and the result is correct under concurrency, which a check-then-insert is not. |
| 96 | 2026-09-23 | backend-5 | **`Message.status` is derived per viewer, never stored** | `serializers/thread.serializer.ts` | The mock stores a status per message, which is wrong for one of the two readers by definition — "read" is a fact about who is looking. The server keeps a read and a delivered cursor per thread participant and computes the value when serializing. Two consequences worth stating: marking a 200-message thread read is **one write, not 200**, and `read` is finally produced at all, which the mock never did. A test asserts the same message serializes as `sent` to the sender and `delivered` to the recipient, then flips to `read` after the recipient reads it. |
| 97 | 2026-09-23 | backend-5 | ~~**A 30/min message rate limit fired on a legitimate conversation**~~ — **FIXED**: raised to 60/min | `middlewares/rateLimit.ts` | Found because a pagination test sent 45 messages and only 30 existed; the test was not wrong, the limit was. 30/min is one message every two seconds, which a heated back-and-forth genuinely reaches. A limit that fires on real use trains people to distrust the app, so it is now set to stop a script rather than to pace a person. |
| 98 | 2026-09-23 | backend-5 | **Message cursors are bound to the THREAD as well as the caller** | `utils/cursor.ts` | Without `tid` a cursor from one conversation replays into another: the signature still verifies and the keyset silently resolves against the wrong messages, so page two of a thread you can read returns a slice positioned by a thread you cannot. Asserted by a test that mints a cursor in one thread and presents it in another. |
| 99 | 2026-09-23 | backend-5 | **The app's scripted replies have no server equivalent, and that is now visible** | `services/chat.service.ts` | `nextReplySync` plus a typing delay is demo theatre: against the real API a sent message simply sends and nothing answers. A real conversation needs a second human — or the socket channel in Phase 6. Worth knowing before someone reads the silence as a bug. |
| 100 | 2026-09-23 | backend-6 | **Socket handlers call the SAME services as the REST routes, and the REST routes emit the same events** | `sockets/`, `controllers/` | Not a convenience — it is the only way a socket cannot become a route around the match gate. `threads.service` owns membership and both doors go through it, so a message sent over HTTP reaches a socket client and a message sent over the socket is subject to the identical check. A test sends from a non-participant's socket and asserts `notFound` plus **zero rows written**. |
| 101 | 2026-09-23 | backend-6 | **A18's "a decline is silent" is enforced by the ABSENCE of a channel** | `sockets/emitters.ts` | There is no `requestDeclined` emitter and the file says so. A test asserts the silence directly — it opens the sender's socket, has the request declined, and fails if `request:declined`, `thread:ended` or `match:new` arrives. Testing that nothing happens is awkward, which is exactly why the rule would otherwise rot. |
| 102 | 2026-09-23 | backend-6 | **The socket token travels in `handshake.auth`, never the query string** | `sockets/auth.socket.ts` | A query string lands in proxy access logs, browser history and error reports; an access token in any of those is a leak TLS does not prevent. The handshake also repeats the HTTP checks in the same order — signature, access denylist, account status — because **a socket that outlives a sign-out is precisely the hole `denylistAccess` exists to close**, and a test signs out then asserts the handshake is refused. |
| 103 | 2026-09-23 | backend-6 | **One receipt per cursor move, not one per message** | `sockets/emitters.ts` | Marking a thread read is a single cursor update, so fanning it out as one event per message would repeat the mistake that storing status per message makes. A test reads five messages and asserts the sender's socket receives **exactly one** `thread:receipt`. |
| 104 | 2026-09-23 | backend-6 | **Calls are signalling only, and `direction` is derived** | `models/call.model.ts`, `serializers/call.serializer.ts` | No audio, no mic, no WebRTC (A17) — but the RECORD is real, because it is what writes `Voice call · 2:14` into the thread. `direction` is not stored: the same call is outgoing to the caller and incoming to the callee, so persisting one is wrong for the other. Ending a call twice is idempotent and appends no second system message; declined and missed calls append none at all. |
| 105 | 2026-09-23 | app-6 | **`socket.io-client` wired into the app; live messages, typing and receipts now arrive without a refresh** | `services/socket.ts`, `stores/chat.store.ts`, `stores/session.store.ts` | Pure JS, so **Expo Go still works** — no native rebuild. The connection opens on verify and closes on sign-out and on auth-loss, because the socket's token is the access token and a socket outliving a sign-out is the hole the denylist exists to close. In mock mode every function is a no-op, which is why the 482 tests are untouched by any of it. |
| 106 | 2026-09-23 | app-6 | **Every socket handler MERGES rather than replaces, and guards against its own echo** | `stores/chat.store.ts` | An event carries one message while the store may hold a page. More subtly: the sender receives their own `message:new` on their other devices, and the device that sent it already appended the message from the HTTP response — so the handler drops a message whose id it already holds. Without that, your own message appears twice on the device you sent it from. |
| 107 | 2026-09-23 | app-6 | **The scripted auto-reply is suppressed against the real API** | `stores/chat.store.ts` | `nextReplySync` plus a typing delay is demo theatre with no server equivalent. Left on, it would fabricate a reply from a real person who never sent one. Against the real API a message sends and nothing answers until an actual second device does — which is now possible, and is what the live test exercises. |
| 108 | 2026-09-23 | app-6 | **FIXED — the thread header named the same person on both phones, and the composer was gone on both.** Two independent faults with one cause: the signed-in id was the hardcoded mock literal `"me"`, so `participantIds.find(each => each !== ME)` matched nobody against the real API and fell back to the FIRST participant; and `getMatchForThread` had no real-API branch at all, reading the mock array whose thread ids are `thread-01` style, so every live conversation rendered "This person is no longer available" | `app/src/app/thread/[id].tsx`, `app/src/services/matches.service.ts` | Caused by this work, so fixed not parked. Reported from two physical phones. The same literal also made every message render as incoming on both sides, and never highlighted your own reaction. |
| 109 | 2026-09-23 | app-6 | **FIXED — the same `"me"` literal in three more screens**: the active call and incoming call showed YOUR OWN name as the person you were talking to, and the match celebration picked the wrong participant | `app/src/app/call/[id].tsx`, `app/src/app/incoming-call/[id].tsx`, `app/src/app/matched/[id].tsx` | Found while fixing #108 and fixed in the same change — one-line each, and all three sit on the like → match → call path being tested right now. |
| 110 | 2026-09-23 | app-6 | **FIXED — the match celebration read the name from `mocks/profiles.userById`**, a synchronous lookup that only ever knew the 40 seeded people, so a genuine new match had no name on "It's a Connect!" | `app/src/app/matched/[id].tsx` | Switched to `profilesService.getProfile`. Mock snapshots unchanged, so the mock path is provably behaviour-preserving. |
| 111 | 2026-09-23 | app-6 | **CLOSED — the class is now enforced, not remembered.** `src/__tests__/conventions.test.ts` fails if any file under `src/app/**` compares an id against the literal `"me"`, if a screen resolves a partner with `.find` without going through `currentUserIdOrMe`, or if a dual-transport service gains an unbranched module-state read | `app/src/__tests__/conventions.test.ts` | Proven by re-introducing the shipped bug twice — once as a bare literal, once as the original `ME` constant with the accessor un-imported — and confirming a different guard caught each. The file was copied before the edit and restored byte-identical. Node types are referenced per-file so `tsconfig.types` stays `["jest"]` (#8). |
| 112 | 2026-09-25 | app-6 | **Typing removed end-to-end on the client, on request.** The three animated dots, the "Typing…" line in the thread header, the `typing` store slice, the `typing` socket handler and `emitTyping` are all gone; `TypingIndicator` deleted; `copy.chat.typing` removed; `ReplyScript.typingMs` renamed `replyAfterMs`, since it is still a real delay before the scripted reply lands | `app/src/app/thread/[id].tsx`, `components/thread/molecules/ThreadHeader`, `stores/chat.store.ts`, `services/socket.ts` | The outgoing emit went too: with nothing able to display it, broadcasting keystroke timing to the server is cost with no feature. **The backend still supports typing** — `typing:start`/`stop` and the 6s Redis key are untouched, so restoring it is a client-only change. |
| 113 | 2026-09-25 | app-6 | **FIXED — the composer and the "no longer available" bar sat on the Android gesture bar.** `ScreenShell` deliberately leaves "bottom" out of its safe-area edges, because `useKeyboardInset` measures from the WINDOW bottom and only works if its container reaches it. So the inset is applied by the bottom bar itself via a new `useBottomInset` hook, which returns zero while the keyboard is up — the keyboard is drawn over the gesture bar, and padding for both lifts the composer a nav bar too high | `components/common/hooks/useBottomInset`, `ChatComposer`, `app/thread/[id].tsx` | Padding inside the bar rather than around it, so its background still reaches the screen edge instead of leaving a strip of page behind it. |
| 114 | 2026-09-25 | app-6 | **Every other template clears the gesture bar by coincidence, not by design.** `FormShell`, `WizardShell`, `SheetShell` and `CallShell` all drop the bottom safe-area edge and pad with a fixed `xl`/`xxl`/`xxxl` (24–48dp), which happens to exceed the ~24dp gesture bar | `components/common/templates/*` | Found, not caused — nothing looks wrong today, which is exactly why it is worth writing down. A denser bottom bar, or a device with a taller inset, turns coincidence into a bug. The thread was the one screen with a bar that must touch the edge. |
| 115 | 2026-09-25 | app-6 | **#113 is verified by snapshot arithmetic, NOT on a device.** The composer moved `paddingVertical: 12` to `paddingTop: 12` + `paddingBottom: 46` (12 + a 34dp test inset) and the banner to 50 (16 + 34); no other line changed in any of the 10 updated snapshots | — | No phone was reachable over adb when the change was made — the operator's two devices are on Wi-Fi via Expo. Needs one look on hardware to close. |
| 116 | 2026-09-26 | app-6 | **Reopening a conversation no longer re-skeletons it.** `loading` now starts from a LAZY `useState` reading the store — the messages are already there, kept per thread and appended to by the socket while you are elsewhere, so covering them with a skeleton was a loading state for work that was not needed. A refresh that fails over a conversation already on screen no longer replaces it with an error either | `app/src/app/thread/[id].tsx` | Guarded by three tests asserting the SYNCHRONOUS first frame, since `renderAtomAsync` flushes the fetches and would make a screen that reloads from scratch indistinguishable from one painting from cache. Each was proven to fail against the behaviour it guards. |
| 117 | 2026-09-26 | app-6 | **FIXED (introduced by #116) — `markRead` became an unhandled rejection on reopen.** With cached first paint it now fires immediately rather than after a successful load, so offline it rejected with nobody catching it; awaited in the load path it could also put an error screen over a conversation that had loaded fine | `app/src/app/thread/[id].tsx` | Caught by the third reopen test, not by hand. Marking read is fire-and-forget at both call sites now: it changes a badge, not the conversation, and the badge clears on the next successful open. |
| 118 | 2026-09-26 | app-6 | **The thread no longer steals the scroll.** Opening a conversation that overflows now JUMPS to the newest message instead of animating down from the top, and a message landing only pulls the view down if the reader was already within 80dp of the bottom — previously any content-size change yanked them down mid-scroll. Sending always follows, since sending is intent to see your own message | `app/src/app/thread/[id].tsx` | `scrollEventThrottle` deliberately NOT set: FlatList defaults it to 0.0001 so its own viewability and `onEndReached` stay responsive, and messages are paginated 30/page, so `onEndReached` is a near-term addition. Raising it would slow the list to speed up three subtractions. |
| 119 | 2026-09-26 | app-6 | **Scroll behaviour is unverified on a device.** The jump-on-open and the 80dp follow threshold are logic, not snapshots — no test renderer produces a real scroll event, and no phone was reachable over adb | `app/src/app/thread/[id].tsx` | Needs one look on hardware with a conversation long enough to overflow: open it (should arrive at the bottom), scroll up, have the partner send (should NOT jump), then send yourself (should jump). |
| 120 | 2026-09-26 | app-6 | **FIXED — the socket connected with NOTHING listening, so no live feature worked.** `onSocket` bound straight to the socket and returned a no-op when it was null. `chat.store.ts` subscribes at MODULE LOAD, long before sign-in calls `connectSocket()`, so all four subscriptions — `message:new`, `message:reaction`, `thread:receipt`, `thread:ended` — were silently dropped. Subscriptions now live in a registry and the connection binds to them | `app/src/services/socket.ts` | Reported from two phones: "sender sent message but receiver not received, it is coming when we reopen the chat". Reopening refetches over HTTP, which is why the app looked like it worked. Proven server-side first — a scripted socket client received `message:new` both subscribed to the thread and merely in the user room — so the fault was provably client-side before a line was changed. |
| 121 | 2026-09-26 | app-6 | **The other three live features were dead too, and nobody had noticed.** Reactions, read receipts and "they unmatched you" all arrive over the same dropped subscriptions, so none of them updated without a screen reopen | `app/src/stores/chat.store.ts` | Same single cause as #120 and fixed by the same change, but worth recording separately: only the message symptom was ever reported, so a fix aimed narrowly at messages would have left three features broken and looking fine. |
| 122 | 2026-09-26 | app-6 | **Confirmed on hardware: the #108/#109 partner-id fix and the #113 safe area are correct.** Two phones show mirrored alignment — each person's own messages right-aligned and orange, the other's left — the right partner name in each header, and a composer clearing the gesture bar | `../Hello-evidence/android/` | Screenshots supplied by the operator, 2026-09-26 13:52. Closes the device check #115 was waiting on for the composer; the scroll behaviour of #119 is still unverified. |
| 123 | 2026-09-26 | app-6 | **A missing bubble in those screenshots was capture timing, not a bug.** Hosanna's phone showed 3 of 4 messages; the server held all four, her `lastReadAt` was 08:22:34.393 and the fourth was written at 08:22:38.720 — 4.3s later | — | Recorded because it looked exactly like a delivery failure and was not. The real delivery failure was #120, found by testing the server rather than reading the picture. |
| 124 | 2026-09-26 | app-6 | **FIXED — the Chat tab showed no conversations at all, only "New matches".** The app files a thread by one test, `lastMessage === null`. The backend MODEL denormalises `lastMessage` exactly as designed and the send path writes it, but `toThread` never serialized it, the wire `Thread` had no field for it, and the client then hardcoded `lastMessage: null` — so every thread read as a match with nothing said yet, however many messages it held | `backend/src/serializers/thread.serializer.ts`, `app/src/services/types.ts`, `app/src/services/chat.service.ts` | Three layers each dropping the same field; any one of them alone would have hidden it. The data was in Mongo the whole time — verified by query before a line was changed. `statusFor` now takes a structural `{senderId, createdAt}` so the preview's status derives from the same cursors as the thread it previews. |
| 125 | 2026-09-26 | app-6 | **`Thread.lastMessage` carries `reactions: []` always.** The conversation row renders a body and a time; copying reactions onto every thread write to render neither would be denormalisation for its own sake | `backend/src/serializers/thread.serializer.ts` | Documented on the wire type so a future reader does not treat the preview as a full message. Read the thread for real reactions. |
| 126 | 2026-09-26 | app-6 | **`scripts/partner.ts` failed backend lint on a pre-existing `any`** — a red gate on a file this work never touched | `backend/scripts/partner.ts` | Found broken, not caused. Silenced with a scoped disable and the reason inline rather than typing each call site of a throwaway manual-testing driver: the real response shapes are asserted in `tests/`, against the same endpoints. |
| 127 | 2026-09-26 | app-6 | **FIXED (exposed by #120) — the sender saw their own message TWICE.** The server echoes `message:new` to every participant including the sender, so their other devices stay in step; that echo RACES the HTTP response describing the same message. Only the socket handler deduped — `send` appended unconditionally — so whenever the echo won, the message was added twice | `app/src/stores/chat.store.ts` | Caused by this work: the echo never arrived while #120 was broken, so the missing dedupe could not show. All four append paths now go through one `appended()` helper that dedupes on the server id and assumes NO ordering. |
| 128 | 2026-09-26 | app-6 | **FIXED — your own message raised your OWN unread badge.** Same race: when the echo won, the handler incremented `unreadCount` without checking whose message it was. The server bumps only the other participant, so the badge disagreed with the server until the next refresh | `app/src/stores/chat.store.ts` | Found while fixing #127, never reported — it only showed in the same losing order, and a stale badge is easy to miss. |
| 129 | 2026-09-26 | app-6 | **`receiveMessage` extracted and exported from the socket handler** so the race can be tested without a live socket; the handler is now a one-line adapter | `app/src/stores/chat.store.ts` | The first version of the test reimplemented the dedupe inline, which tested the test. Driving the real `send` and the real receive path — with `chatService.sendMessage` stubbed so both carry the same id — is what makes the losing order reproducible at all. |
| 130 | 2026-09-26 | app-6 | **CONFIRMED ON HARDWARE by the operator: live delivery, single-send and the conversation list all work.** Closes the device check owed by #119 (scroll), #120 (live socket delivery), #124 (conversation rows) and #127/#128 (duplicate send, own unread badge) | `../Hello-evidence/android/` | Two physical phones, 2026-09-26. The last open device item from the app-6 run. |
| 131 | 2026-09-26 | be-7 | **Contract gap resolved: `GET /blocks` embeds a profile summary.** `settings/blocked.tsx` has to show a name, and a blocked user is excluded from `GET /profiles/:id` BY DEFINITION — so the one screen that must look them up could not. `Block.user` carries it, with `distanceMetres` forced to 0 | `backend/src/serializers/safety.serializer.ts`, `app/src/services/types.ts`, `app/src/stores/settings.store.ts` | Flagged during backend planning as one of two N+1/impossibility gaps found while reading the app. The store now prefers the embedded summary and keeps the injected `resolve` for mock mode, which preserves `safety.service` as a leaf — it imports nothing, so `profiles.service` can filter blocked people without a cycle. |
| 132 | 2026-09-26 | be-7 | **Blocking is a TEARDOWN, not a filter.** `POST /blocks` ends the match, deletes the thread and its messages, and removes likes and pending requests in both directions. A filter alone would leave the blocked person holding a live socket room, and their like would resurface in the blocker's Likes grid | `backend/src/services/safety.service.ts` | The match row is kept with `endedAt` so `pairKey` still stops the pair ever recurring in the deck. |
| 133 | 2026-09-26 | be-7 | **FIXED before shipping — a report that also blocked told nobody's socket.** `emitThreadEnded` lived only in `postBlock`, so reporting-with-`alsoBlock` deleted the thread and left the reported person in a live room for it. Found by running the phase against the RUNNING server, not by the suite, which had no socket case for the report path | `backend/src/controllers/safety.controller.ts` | Both paths now share `announceTeardown`. Three socket tests added; the one for the report path was proven to fail against the gap. `thread:ended` is indistinguishable from an ordinary unmatch, which is what makes it safe to send — the reported person is never told a report is why. |
| 134 | 2026-09-26 | be-7 | **`hiddenUserIds` was already wired into discovery, search, likes and requests in Phase 3**, so filling it in made blocking take effect in all of them at once | `backend/src/services/visibility.service.ts` | The seam was left deliberately in Phase 3 — "adding the exclusion later to four call sites is how one of them gets missed". It paid: Phase 7 changed one function and four features became correct. The thread list got a DELIBERATELY REDUNDANT exclusion on top, since a teardown can fail half-way on a standalone Mongo with no transaction. |
| 135 | 2026-09-26 | be-7 | **Re-running the live check with reused phone numbers signed into the SOFT-DELETED accounts** and every like 404'd | verification script | Not a product bug: sign-in inside the 30-day grace restoring an account is Phase 10, not built. Recorded because the failure looks exactly like a broken likes endpoint. |
| 136 | 2026-09-26 | app-6 | **R2 CLOSED — the 30 avatars exist.** Thirty illustrated characters, never photographs: six skin tones used five times each, hair from buzzed to waist-length, hijab, turban, cap and beanie, glasses, beards, grey and dyed. Drawn as SVG, rendered to 360px PNG with headless Chrome, bundled at `app/assets/avatars/` (572 KB total) | `app/assets/avatars/`, `app/src/mocks/avatars.ts` | Supersedes parking #12 ("30 avatar images do not exist… the most visible remaining art gap"). PNG rather than vector because `react-native-svg` is not on the approved dependency list and `expo-image` — already present — needs no sign-off. 360px is 3x the largest size `Avatar` draws. |
| 137 | 2026-09-26 | app-6 | **The artwork was never going to show up on its own — almost NOTHING passed a source.** Only `ProfileCard` and `SwipeCard` even had an `avatar` prop, and nothing built it; every other site rendered the initial fallback. Wiring it meant a new `avatarSource(id)` lookup plus 16 call sites, and a `source` prop on ThreadRow, RequestRow, LikeTile, NewMatchesCarousel, ThreadHeader and NotificationRow | `app/src/mocks/avatars.ts` + 16 files | Found by grepping every `<Avatar` for a `source=`, not by assuming the drop-in was enough. `matched/[id].tsx` also stopped showing a hardcoded "You" initial and now shows the signed-in person's own chosen avatar. |
| 138 | 2026-09-26 | app-6 | **FIXED — adding the artwork broke the backend seed-parity check.** `mocks/profiles.ts` imported `AVATARS` for its id list, which now `require()`s a PNG per row; the parity tool runs that file under plain Node, where only Metro can resolve an image. Ids split into `mocks/avatarIds.ts`, which requires nothing | `app/src/mocks/avatarIds.ts`, `mocks/profiles.ts` | Caught by the backend suite, not by the app's. A new test asserts the two modules hold the same thirty ids so the split cannot drift. |
| 139 | 2026-09-26 | app-6 | **`Avatar.source` widened to `AvatarSource = ImageSource \| number`.** `require()` of a bundled PNG evaluates to a number, which expo-image accepts at runtime but its own `ImageSource` type does not name | `components/common/atoms/Avatar` | Every preset avatar in this product is exactly that, so the narrow type was wrong rather than strict. |
| 140 | 2026-09-26 | app-6 | **Avatar labels now describe the person, not a palette.** "Sunrise" became "Short brown hair, light-medium skin" — the label is `accessibilityLabel` only and never shown, so a screen-reader user choosing between thirty avatars was getting nothing useful. The old word is kept as `name` for fixtures and logs | `mocks/avatars.ts`, `backend/src/seed/avatars.seed.ts`, `backend/src/models/avatar.model.ts` | The model's `label` was capped at 40 characters and the longest description is 48 — widened to 80, and `name` added, or `strict: "throw"` would have rejected every row. On a person's profile the label stays their NAME ("Ash's avatar"); the description is for the picker, where you are choosing between faces. |
| 141 | 2026-09-26 | app-6 | **FIXED — an EXISTING account was walked through onboarding again on every sign-in.** `verifyCode` set `status: "onboarding"` unconditionally, so signing in on a second device, after a reinstall, or simply after the in-memory token expired re-asked name, birthday, gender, avatar, interests, bio and location — and `PATCH /me` overwrote answers already given | `app/src/stores/session.store.ts` | The server has always returned `onboardingComplete` on `/auth/verify`; the client threw it away. `hydrate` right above it was already reading it correctly, which is what makes the line look right at a glance. Mock mode is unaffected — a fresh verify there is a new account — so the demo still walks the wizard. |
| 142 | 2026-09-26 | app-6 | **Interests are read as text now, not chips.** Operator decision: `InterestText` renders "Hiking · Board games · Live music" on the card, the deck, a profile and your own profile. A middot rather than commas, because several labels contain a comma's worth of pause already ("Film, TV and streaming") | `components/common/molecules/InterestText` | Chips remain the SELECTION surface — `InterestPicker` draws its own from the `Chip` atom and is untouched. |
| 143 | 2026-09-26 | app-6 | **`InterestChips` deleted — it was dead the moment display moved to text.** `InterestPicker` never used it; it draws chips from the `Chip` atom directly. The only thing left was its own looser `Interest` type (`category?: string`), duplicating the real one in `services/types.ts` | `components/common/molecules/InterestChips` (removed) | Three fixtures typed `category` as a bare string and only compiled because of that duplicate. Pointing them at the real union caught it. The `WizardShell` snapshot used the chips as filler and now uses `InterestText`, with a note that the real step mounts `InterestPicker`. |
| 144 | 2026-09-26 | app-6 | **A negative check that lied.** Re-introducing #141's bug to prove the new test catches it hit the FIRST of two identical `set({ status: … })` lines — the one in `hydrate` — so the suite stayed green and the test looked worthless | verification method | Recorded because the check was the thing that was broken, not the test. Targeting the line inside `verifyCode` made it fail as it should. Two identical lines in one file is exactly how a find-and-replace goes quietly wrong. |
| 145 | 2026-09-26 | app-6 | **FIXED — 48px of dead space under every home grid tile.** The text block was pinned at `height: 150`, a number chosen when interests were two rows of chips; one line of text needs 102 | `components/home/organisms/ProfileCard` | Now ADDED UP FROM THE TOKENS — padding + title + caption + body line heights — instead of a magic number, so the next change to the type scale moves the tile with it rather than reopening the same gap. It stays fixed rather than auto, because a person with no interests at all would otherwise leave their row ragged. |
| 146 | 2026-09-26 | app-6 | **`TypeStyle.fontSize` and `.lineHeight` made required.** They were `Pick<TextStyle, …>`, so optional, which is why #145 could not read the scale without three non-null assertions | `app/src/theme/index.ts` | Every role sets both. Layout that reserves space for text has to add line heights up, and that should read from the scale rather than restate it. |
| 147 | 2026-09-26 | app-6 | **REVERTED — `sheetAllowedDetents: "fitToContents"` on the profile sheet.** It sized the sheet correctly and caused a worse bug: a full screen of WHITE as the sheet slid away. The detent is `[0.6, 0.95]` instead, down from 0.75 | `app/src/app/_layout.tsx` | Kept as a record because the next person will reach for `fitToContents` for exactly the same reason. The `fitToContents` prop added to `SheetShell` went with it; a long profile scrolls as before. |
| 148 | 2026-09-26 | app-6 | **Why `fitToContents` exposed it, from the source — and why that was only half the story.** `ScreenStackItem.getPositioningStyle` gives an Android form sheet `position: absolute; top/start/end: 0` with DELIBERATELY no bottom and no height, so it derives from its children; the native sheet behind it shows whatever the WINDOW background is. I concluded that was unfixable white — it was unfixable only while the window background was unset (#150). With it dark, `fitToContents` may well be viable now | `node_modules/react-native-screens/.../ScreenStackItem.js` | Not re-applied: one unverified change at a time. Worth revisiting once #150 is confirmed on the device. |
| 149 | 2026-09-26 | app-6 | **FIXED (caused by #147) — a full screen of white while the profile sheet dismissed.** Reported from the device with a screenshot; the sheet had vacated the lower 58% of the screen and it rendered white, not the dimmed home behind it | `app/src/app/_layout.tsx` | Mine: dropping `flex: 1` from `SheetShell` to let `fitToContents` work is what exposed the native sheet. Every other screen hides that container by being `flex: 1` with a background of its own. |
| 150 | 2026-09-26 | app-6 | **THE REAL CAUSE — the Android WINDOW BACKGROUND was never set, so it was white.** `app.json` had `userInterfaceStyle: "dark"` and a `#141210` splash but no `backgroundColor`, so `AppTheme` carried no `android:windowBackground` and inherited AppCompat's default. Any region the React view hierarchy is not painting falls through to it — which is exactly what a dismissing sheet vacates | `app/app.json` | Found by reading the GENERATED `styles.xml`, not by guessing again. Fixed with `"backgroundColor": "#141210"`; a prebuild now emits `android:windowBackground → @color/activityBackground = #141210`. Predates all of this work and would have shown on any screen that stopped painting. |
| 151 | 2026-09-26 | app-6 | **The generated `android/` was STALE relative to `app.json`.** `splashscreen_background` was `#FAF8F5` while the config had said `#141210` for some time — so the native project had been generated before the dark splash was configured and never regenerated | `app/android/` (gitignored, generated) | Which is why a native config change looked like it did nothing. `npx expo prebuild --platform android` re-emitted both. Worth knowing: `expo run:android` does NOT prebuild when `android/` already exists, so an `app.json` change needs an explicit prebuild. |
| 152 | 2026-09-26 | app-6 | **Two wrong diagnoses before the right one, both mine.** First "`fitToContents` removed the background" — reverted, white persisted. Then `contentStyle` — which the library only applies to a child-sized wrapper | — | Recorded because the pattern is the lesson: the first two were reasoned from MY recent change, the third from reading the generated native project. The operator's "same issue" after a confident fix is the signal to stop reasoning from the diff and go find evidence. |
| 153 | 2026-09-26 | app-6 | **THE ACTUAL WHITE — an Android form sheet is a `BottomSheetDialog`, its own window, and its Material defaults are LIGHT.** `BottomSheetDialogScreen.cancel()` hands the dismissal to the ScreenStack and then calls `this.show()` — re-showing the dialog so native teardown cannot desync the stack. For a moment the dialog is up with its React content gone, and `Theme.Design.Light.BottomSheetDialog` paints a full screen of white | `app/plugins/withSheetDialogTheme.js` | **Explains the operator's decisive clue**: `cancel()` runs on a SCRIM TAP, never on the footer button — which is exactly the difference they reported. Fixed with a config plugin setting `bottomSheetDialogTheme`, both layers transparent; the screen paints its own surface and draws its own corner radius on a `MaterialShapeDrawable`. Verified by `./gradlew :app:processDebugResources` (exit 0), not by eye. |
| 154 | 2026-09-26 | app-6 | **#150 was a real bug but the WRONG bug.** The activity had no `windowBackground` and it is right that it now has one — but the activity's window is not the dialog's, so it was never going to fix this | `app/app.json` | Kept: it is correct on its own terms and would have shown on any screen that stopped painting. Recorded so the two are not confused later. |
| 155 | 2026-09-26 | app-6 | **`fitToContents` RE-APPLIED, now that the reason it looked broken is gone.** #147 reverted it believing it caused the white; #153 shows the white was the dialog theme all along. A single numeric detent is NOT an alternative — `ScreenModalFragment.configureBehaviour` sets `isFitToContents` either way, but a `flex: 1` child still fills whatever it is offered | `_layout.tsx`, `SheetShell`, `user/[id].tsx` | Shipped WITH #153 in one rebuild, deliberately: they need the same build and testing them apart costs the operator two cycles. If white returns, revert this one first — the plugin makes the dialog transparent, so white can no longer come from it. |
| 156 | 2026-09-26 | app-6 | **VERIFIED ON AN EMULATOR — no white, and no gap.** Built, installed and driven on `Flavour_Pixel`: opened a profile sheet, dismissed it by TAPPING THE SCRIM (the path that flashed), recorded the screen. Across all 434 frames of the 43s clip the mean brightness never exceeds 39; the operator's white screenshot measured well over 130 | `.argent/recordings/` | Measured rather than eyeballed — a flash is a handful of frames and a screenshot taken "just after" misses it. Frame RMSE confirms the clip really contains the transition (1191 at the dismissal) rather than a static window. |
| 157 | 2026-09-26 | app-6 | **VERIFIED — `fitToContents` sizes the sheet exactly.** The profile sheet ends at the Done button with no dead space, on a profile with a bio and four interests | emulator | The 0.6 detent guess is gone for good; #155 was right to re-apply it. |
| 158 | 2026-09-26 | app-6 | **VERIFIED — an existing account skips onboarding (#141).** Signed in as a pre-onboarded account and landed on Home, not the wizard | emulator | Tested by creating the account through the API and then signing in through the UI, which is the exact path a returning user takes. |
| 159 | 2026-09-26 | app-6 | **Emulator animations must be ON to test a dismissal flash.** Parking #17 records that this AVD had "Remove animations" enabled, which would have made the sheet vanish instantly and the test a false pass | `Flavour_Pixel` | Checked before building: all three scales already read 1. Worth re-checking on any machine where this is retested. |
| 160 | 2026-09-26 | app-6 | **`INSTALL_FAILED_UPDATE_INCOMPATIBLE` on the emulator** — an older build of `com.hosanna4189.Hello` was signed with a different key, so `expo run:android` built fine (4m39s) and then could not install | emulator | Uninstall first. Worth knowing before reading it as a build failure. |
| 161 | 2026-09-26 | be-6 | **FIXED — `call:accept` emitted into a room nobody was in.** `emitCallAccepted(toUserId, callId)` was handed the CALL id as the recipient, so the caller was never told they had been answered. Invisible because the app faked "connected" on a 2.2s timer regardless | `backend/src/sockets/calls.socket.ts` | Found while making calls real. `answeredAt` was on the model from Phase 6 and nothing ever set it — every call ever made had it null, which is what separates `completed` from `missed`. Two tests, both proven to fail against the old code. |
| 162 | 2026-09-26 | be-6 | **WebRTC signalling relay added: one `call:signal` channel, not three.** The server checks the sender is on the call and that the call is live, then passes the payload through UNPARSED — SDP and ICE candidates are not its business | `backend/src/sockets/calls.socket.ts`, `services/calls.service.ts` | One channel because the only thing that can be got wrong is WHO, and that check then lives in one place. Four tests cover a stranger's signal, an unknown kind, and a finished call. |
| 163 | 2026-09-26 | app-6 | **CALLS ARE REAL. Operator sign-off for `react-native-webrtc` and a mic permission.** Audio flows peer-to-peer (or via TURN), signalled over the socket that already carries messages; no voice data passes through our server. Scope chosen: ring only while both apps are open | `app/src/services/webrtc.ts`, both call screens | Supersedes A17 ("fully mocked") and the AGENTS line forbidding WebRTC and a mic permission — both rewritten with the decision and its date. |
| 164 | 2026-09-26 | app-6 | **The callee must accept the CALLER'S call.** The incoming screen started a call of its own and cancelled it on answer — fine when nothing was real, wrong with signalling, because the caller is left ringing. A `call:incoming` listener now navigates with the caller's `callId` | `app/src/stores/calls.store.ts` | The ring is the one flow that begins with the OTHER person acting, so the listener lives in a module the root layout imports and keeps alive. The dev trigger still works with no caller. |
| 165 | 2026-09-26 | app-6 | **FIXED before shipping — the real path broke the MOCK demo.** In mock mode `startCallMedia` returns false, and I ended the call on that: every mock call died the instant it started, and two snapshots caught it | `app/src/app/call/[id].tsx` | Mock mode is a first-class path here — the offline demo and all 506 tests run on it. It keeps its 2.2s faked pick-up; only the real transport got real. |
| 166 | 2026-09-26 | app-6 | **KNOWN GAPS in calls, stated rather than discovered later.** (a) Audio ROUTING — earpiece vs speaker — needs `react-native-incall-manager`, a second native dep NOT signed off, so the speaker button stays inert and the platform picks. (b) Ringing a closed or locked app needs push + ConnectionService, which is Phase 8. (c) A TURN server must exist on the VPS or calls behind a carrier NAT will not connect | `webrtc.ts` | `GET /calls/ice` already mints short-lived TURN credentials from a shared secret that never leaves the server — the app can never ship an open relay. It just needs a coturn to point at. |
| 167 | 2026-09-26 | be-6 | **The backend suite is FLAKY — roughly half of full runs fail one or two tests, in a different file each time.** Errors are network-level: `ECONNRESET`, `socket hang up`, a 30s timeout, a 401 where a 400 was expected. Every suite passes alone | `backend/tests/` | PRE-EXISTING — seen before the call work. One real contributor found and fixed: `afterEach` asked sockets to disconnect without awaiting it, so the next test's `wipe()` deleted users mid-handshake. Tried a single worker process for all files: no better, reverted. **"113 passed" should be read with this caveat** until it is chased down. |
| 168 | 2026-09-26 | app-6 | **A release APK fails to build for x86.** `assembleRelease` builds EVERY ABI, unlike a debug build which builds only the attached device's, and `expo-modules-core`'s C++ will not compile for x86 — 11 minutes to find out | `node_modules/expo-modules-core` | Found, not caused. Worked around with `-PreactNativeArchitectures=arm64-v8a`: every Android phone is arm64, so nothing is lost, the APK is smaller and the build is faster. An x86 emulator would need the debug build. |
| 169 | 2026-09-26 | app-6 | **Standalone test APK built and VERIFIED BY INSPECTION, not by assumption.** `~/Desktop/Hello-call-test.apk`, 58.6 MB: JS bundle embedded (so no Metro), WebRTC native library present, `192.168.1.4:4000` baked into the Hermes bundle, and `aapt2 dump permissions` shows RECORD_AUDIO present with CAMERA and SYSTEM_ALERT_WINDOW absent | `~/Desktop/` | The URL check mattered: had `.env` not been inlined, the APK would have silently run on MOCK data and every call would have "worked" while proving nothing. Hermes keeps strings in a table, so `strings` misses the URL — a raw grep finds it. |
| 170 | 2026-09-26 | app-6 | **The release APK is signed with the DEBUG keystore**, which is Expo's default and fine for sideloading to your own phones | `android/app/build.gradle` | It cannot go to the Play Store, and a later real keystore means users must uninstall first — signatures will not match. Worth knowing before anyone calls this build "the release". |
| 171 | 2026-09-26 | be-6 | **The OTP is now printed to the backend log in dev mode, by operator request, explicitly temporary.** A release build has no Metro, so the `console.warn` the app makes was unreachable | `backend/src/services/sms.service.ts` | Reverses my own earlier note ("a login code in a log file is the same leak as one in a response"). It is safe HERE because `OTP_DEV_MODE` already returns the code in the HTTP RESPONSE and `env.ts` refuses to boot with that flag in production — the log cannot exist in a build that is not already handing the code to any caller. To undo: delete one `logger.warn`. |
| 172 | 2026-09-26 | app-6 | **FIXED — the release APK could not reach the backend AT ALL: Android blocks cleartext HTTP.** A DEBUG build gets `usesCleartextTraffic="true"` free from React Native so Metro works; a RELEASE build does not, so every `http://192.168.1.4:4000` request failed inside the platform with nothing in the backend log, because nothing arrived | `app/plugins/withCleartextTraffic.js` | The operator reported it as "the backend call is not coming to backend" — precisely right. `expo.android.usesCleartextTraffic` in app.json is NOT honoured by SDK 57; prebuild leaves the attribute off. A plugin sets it. **Must be deleted once the API is HTTPS on the VPS.** |
| 173 | 2026-09-26 | app-6 | **`assembleRelease` is currently unreliable — 18 minutes to fail on `expo-dev-menu-interface` dexing.** It succeeded an hour earlier with the same toolchain, so it looks like a stale intermediate after a `prebuild` wipe rather than a real incompatibility | `node_modules/expo-dev-menu-interface` | Not chased: a DEBUG APK builds in under 6 minutes, already permits cleartext, and installs on both phones the same way — it only needs Metro running, which the backend requires anyway. Worth a `./gradlew clean` before trusting a release build again. |
| 174 | 2026-09-26 | app-6 | **A release APK is what production needs; a debug APK is what TESTING needs here.** Debug carries `SYSTEM_ALERT_WINDOW` (React Native's dev-menu overlay) and is 99 MB against 59 MB | — | Both were checked with `aapt2 dump permissions` on the real artifact. Neither carries `CAMERA`. |
| 175 | 2026-09-27 | app-6 | **Local APK distribution ABANDONED — operator is deploying to a server instead.** The debug APK works but opens on the `expo-dev-client` launcher (a debug build ships no JS and must ask which Metro to load from), and the release build that would avoid it kept failing on `expo-dev-menu-interface` dexing | — | The right call: a LAN-IP build was always a dead end — the address is baked in at build time, it needs this Mac awake, and it cannot leave the wifi. Build artefacts removed, Gradle stopped. `plugins/withCleartextTraffic.js` is KEPT for now: still needed if the deployed API is `http://` before TLS, and must be deleted once it is `https://`. |
| 176 | 2026-09-27 | be-11 | **`npm run build` had NEVER succeeded — the backend could not be deployed at all.** `src/types/wire.ts` re-exported the wire contract from `app/src/services/types.ts` via a `@contract/*` path alias; `tsconfig.build.json` sets `rootDir: ./src`, and TypeScript refuses a `.ts` input from outside it (TS6059). So `dist/` was never produced and `npm start` (`node dist/server.js`) had nothing to start | Fixed | Nothing caught it because nothing ever ran it: `dev` uses tsx (no rootDir), `typecheck` uses `noEmit` (no rootDir), and the tests use vitest. Fix: `scripts/sync-contract.mjs` copies the app file into `src/types/contract.generated.d.ts` — a declaration file emits nothing, so rootDir has nothing to place — run as `prebuild`. `tests/contract-sync.test.ts` fails when the copy is stale, so the app's `types.ts` is still the only definition; proven by drifting each side in turn. The `@contract` alias is deleted from both `tsconfig.json` and `vitest.config.ts` so there is no second route back to the bug. |
| 177 | 2026-09-27 | be-11 | **The compiled server could not start: `ERR_MODULE_NOT_FOUND: Cannot find package '@/app.js'`.** `tsc` uses `paths` to RESOLVE imports and then emits the specifier verbatim, so 219 `@/…` imports survived into `dist/`. tsx and vitest both apply the mapping at runtime; plain `node dist/server.js` — the only way the server runs on a host — does not | Fixed | Found immediately after #176, by booting `dist/` rather than trusting that a green build meant a working one. Fix: `scripts/fix-dist-aliases.mjs` as `postbuild`, rewriting each specifier to a relative path and **exiting non-zero if any alias remains**. No new dependency (`tsc-alias` would have been one), no churn in `src`, and it only touches generated output. Verified by boot: mongo connected, redis connected, listening, `/health` 200 `{"status":"ok"}`, `/ready` 200 `{"ready":true,"mongo":"up","redis":"up"}`. |
| 178 | 2026-09-27 | be-11 | **A production deploy could not log anyone in.** `env.ts` refuses to boot with `OTP_DEV_MODE=true` in production — correctly, since it returns the login code in the response body — and with it false `smsSender` is `productionSender`, which throws "No SMS provider is configured" on the first sign-in. So `NODE_ENV=production` meant no logins at all until Twilio was wired | Fixed | Added `OTP_LOG_ONLY`: logs the code and returns **nothing**, splitting the two things `OTP_DEV_MODE` conflated. Reading a code then needs shell access to the host, which is what makes it acceptable in production; echoing it to the caller never is. Costs nothing on the client — `app/src/services/auth.service.ts` only `console.warn`s `devCode`, it never autofilled. A production boot with it false now prints a warning naming the consequence rather than failing at someone's first sign-in. Verified by boot: response `{"resendAfterSec":30}` with no `devCode`, code present in the log. **The cost is real and stated in `.env.production.example`: whoever can read the logs can sign in as anybody.** |
| 179 | 2026-09-27 | be-11 | Phase 11 deploy kit written, host-agnostic, ahead of the server the operator is providing: `.env.production.example` (96 lines, reasons not just names), `deploy/hello-api.service` (systemd — SIGTERM *and waits*, which is the only hard requirement; hardened), `deploy/nginx-hello-api.conf` (TLS + the `/socket.io/` upgrade block), `deploy/README.md` (the procedure, including coturn), and **`scripts/smoke.sh`, which PLAN had asked for since Phase 0 and nobody had written** | — | smoke.sh proven against a real local build: 10 of 11 checks pass and the failure is a true fact about this Mac — `transactions: false`, the standalone mongod. It covers health, readiness, mongo, redis, transactions, all four envelope cases PLAN names verbatim, the rate limiter (a real 429 after 12 rapid OTP requests) and the Socket.IO handshake. That last one is the point: every REST check can pass while `/socket.io/` 404s at the proxy, and the symptom is not an error, it is "messages only arrive when I reopen the chat". Clean build + full suite after all of it: **116 passed, 9 files** — with #? flake caveat, one green run is not strong evidence. |
| 180 | 2026-09-27 | be-11 | Operator has a VPS and a domain; asked for a step-by-step. Deploy kit narrowed from branching options to ONE linear path after three decisions: **own domain with TLS**, **mongod on the VPS as a single-node replica set** (operator said "i dont know it support the transactions" — so the uncertainty was removed rather than worked around), **coturn now** | — | Added `deploy/provision.sh`: idempotent, one command, installs Node 24 / Redis / MongoDB 8 / nginx / certbot / coturn, binds Redis and mongod to loopback and **checks** it, initiates `rs0`, and **proves transactions by committing a real one** — probe tested against this Mac's standalone and it correctly reports failure, so it cannot false-positive into a broken deploy. It generates `.env` with four separate secrets on the box (never in a repo or a chat) and refuses to overwrite an existing one, since rotating those signs out every user. `nginx-hello-api.conf` rewritten HTTP-only: `certbot --nginx` parses the live config and refuses to run if it does not validate, so shipping a 443 block referencing a certificate that does not exist yet would lock you out of obtaining one. `deploy/README.md` rewritten as 8 steps, each ending in a check. Fixed before shipping: `rsync -R` path form (verified both forms locally), `sudo -u hello -H` (without `-H` npm writes its cache to the invoking user's home and fails EACCES), and `After=mongod.service` in the unit. |
| 181 | 2026-09-27 | be-11 | Operator follows GreatStack's `Deploy_MERN_on_VPS.md` and asked for the runbook in that shape. `deploy/README.md` rewritten to match it: bullet overview, `### 1.`–`### 19.` numbered sections, one small ```bash block per command, no shell prompts, plain-language notes between, "(Ctrl + X, then Y and Enter)" after every nano | — | Explicit commands replace `provision.sh` as the MAIN path — the operator learns by pasting one command and reading its output, and a black-box script that fails halfway is harder for them to debug. The script is kept, mentioned once at the end. Six places this deliberately departs from a MERN guide, each called out in the doc because habit would mislead: systemd not pm2, **MongoDB needs a replica set** (no MERN guide does this, and the server refuses to boot without it), two rsync commands instead of a git clone, the `/socket.io/` block above `location /`, coturn plus two extra firewall ranges, and `npm run build`'s pre/post steps. Both transaction checks — the script's and the doc's one-liner — tested against this Mac's standalone: each errors and neither prints success, so a bad Mongo cannot pass as good. |
| 182 | 2026-09-28 | be-11 | **Backend is LIVE at `https://api.hello.triozen.tech` and verified.** `smoke.sh` 11/11 — including `transactions available`, which was the one that could not pass on this Mac | Done | Four checks beyond smoke: valid Let's Encrypt cert to 2026-12-26; `POST /v1/auth/code` returns `{"resendAfterSec":30}` with **no `devCode`**, so `OTP_LOG_ONLY` is genuinely on; HTTP 301s to HTTPS; and a raw websocket handshake returns **`101 Switching Protocols`** — the real upgrade completes rather than silently degrading to polling, which is the failure mode that reads as "messages only arrive when I reopen the chat". Phase 11 deploy is done; the app cutover is what remains of it. |
| 183 | 2026-09-28 | app-6 | **The `assembleRelease` failure on `expo-dev-menu-interface` dexing (PLAN #172) was almost certainly the JDK.** `JAVA_HOME` was unset, so Gradle took Homebrew's default — **OpenJDK 25**, which the Android Gradle Plugin does not support. Temurin 17 was installed the whole time | Fixed | Every Android command now runs with `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home`. Also raised `org.gradle.jvmargs` from 2048m to 4096m — D8/R8 on a New Architecture app can exhaust 2GB and reports the OOM against whichever module it was processing, which is exactly how a heap failure disguises itself as a "dex-menu-interface" failure. **`android/` is generated and gitignored, so the jvmargs bump must be re-applied after every `prebuild`.** |
| 184 | 2026-09-28 | app-6 | `app/node_modules` was **missing entirely** — `npx expo prebuild` failed with "Cannot determine the project's Expo SDK version because the module `expo` is not installed" and started installing expo globally instead | Fixed | `npm ci`. Worth noting because the error names the wrong problem: it reads as a corrupt Expo install, not an absent `node_modules`. Checked afterwards that `@tailwindcss/oxide` resolves its darwin-arm64 native binding — npm skipped 3 install scripts, and without that binding NativeWind cannot compile `global.css` and the release bundle fails at the very end of a long build. |
| 185 | 2026-09-28 | app-6 | App cut over to the deployed API: `EXPO_PUBLIC_API=https://api.hello.triozen.tech`, and **`plugins/withCleartextTraffic.js` DELETED** along with its `app.json` entry | Done | The plugin existed only because Android blocks plain HTTP in release builds (PLAN #173); with TLS there is no cleartext to allow and keeping it would ship a needlessly permissive app. Regenerated manifest confirms it: 0 occurrences of `usesCleartextTraffic`, `RECORD_AUDIO` present, and `CAMERA` + `SYSTEM_ALERT_WINDOW` both carrying `tools:node="remove"` — so "no photos anywhere" still holds at the permission level. A copy of the deleted plugin is in the session scratchpad in case the API is ever served over plain HTTP again. |
| 186 | 2026-09-28 | app-6 | First `assembleRelease` attempt died in 1m12s: **"SDK location not found"**. `ANDROID_HOME` is unset in this shell and `prebuild --clean` had wiped `android/local.properties`, which is where the path normally lives | Fixed | SDK is at `/opt/homebrew/share/android-commandlinetools` (Homebrew, no Android Studio on this machine). Wrote `local.properties` **and** export `ANDROID_HOME` on the build command — `local.properties` is regenerated-and-wiped by every `prebuild`, the env var is not. Checked the SDK against what `expo-root-project` asks for before rebuilding rather than after: buildTools 36.0.0 ✓, compileSdk/targetSdk 36 ✓ (android-36 installed), NDK 27.1.12297006 ✓, cmake 3.22.1 ✓. |
| 187 | 2026-09-28 | app-6 | **My own reporting error, logged because it nearly hid a failure.** I ran the build as `./gradlew … \| tail -60`, which makes the pipeline's exit status that of `tail` — the harness reported **"completed (exit code 0)"** for a build whose log says `BUILD FAILED`. I told the operator "Build exited 0" before reading the log | Fixed | Never pipe a build to `tail` and read the exit code. Rebuilt as `./gradlew … > log 2>&1; echo "EXIT=$?"; tail -40 log` — no pipe, true status, and the full log stays on disk to watch while it runs. |
| 188 | 2026-09-28 | app-6 | `jest-haste-map` warns of a naming collision: `app/.kilo/worktrees/adjoining-dirigible/package.json` shares the name "hello" with `app/package.json` | Parked | A leftover Kilo agent worktree nested inside `app/`. `.kilo/` is gitignored so it is invisible to status, but Jest still walks it — 526 files checked for 23 test files. Harmless today (the suite passes), but it is a second copy of the project inside the project and could resolve a stale module. Deleting it is the operator's call. |
| 189 | 2026-09-28 | app-6 | Checked whether pointing `.env` at the live API would put the 506-test suite into real mode — `client.ts` reads `EXPO_PUBLIC_API` and defaults to `"mock"` only when it is absent, and `jest.setup.js` pins nothing | No change needed | It does not: `jest-expo` does not load `.env` (Expo CLI does, Jest does not). Proven rather than assumed — ran `services.test.ts` with the live URL in `.env` and all 28 passed against mock data, which could not happen in real mode. No pin added, because there is nothing to pin. |
| 190 | 2026-09-28 | app-6 | **Release APK built successfully — the first one this project has ever produced.** `BUILD SUCCESSFUL in 28m 28s`, 865 tasks, `:app:assembleRelease`. 59 MB, arm64-v8a only, at `~/Desktop/Hello-preview-20260928.apk` | Done | The fix was environmental, not code: JDK 17 instead of the JDK 25 Gradle was silently picking (#183), `ANDROID_HOME` + `local.properties` (#186), and `node_modules` restored (#184). `-PreactNativeArchitectures=arm64-v8a` kept from #170 — `expo-modules-core` C++ still will not compile for x86, so this will not run on an x86 emulator, only on real arm64 phones. |
| 191 | 2026-09-28 | app-6 | APK verified against the shipped artifact rather than the build config | Done | `aapt2 dump permissions` on the APK itself: **CAMERA absent, SYSTEM_ALERT_WINDOW absent, RECORD_AUDIO present** — `blockedPermissions` survived into the release, so "no photos anywhere" holds at the permission level on the store listing. `index.android.bundle` present (the debug APK of #174 had **0**, which is why it needed Metro) — this one is standalone. `grep -a` on the Hermes bundle finds `api.hello.triozen.tech` and **zero** occurrences of `192.168`, so the LAN URL is genuinely gone and the deployed one is genuinely baked in. Signed with the **debug keystore** (the Expo template default) — fine for internal testing, must be replaced with a real upload key before any store submission. |
| 192 | 2026-09-28 | app-6 | **Calls never rang: `app/src/services/calls.service.ts` was still the A17 mock IN FULL — zero `isMockMode` branches, zero HTTP.** `startCall` minted a CallSession in the phone's own memory, so `POST /calls` was never sent, the server never ran `emitIncomingCall`, and the callee had nothing to receive. Caller saw "Ringing…" for 45s, then missed | Fixed | Operator report: "when the sender is calling to receiver in receiver incoming call is not showing". Diagnosed by elimination rather than guessing — `call:incoming` goes to `userRoom(id)` via `toUsers`, the **identical path** `message:new` uses, and messages worked; `_layout.tsx:14` imports `calls.store` so the handler registers; payload `{call, fromUserId}` matches what the store destructures; all four routes exist server-side and only `GET /calls/ice` was ever called. Same bug class as `getMatchForThread` (#110): a service left on mock while everything above it was cut over. Fixed `startCall`/`endCall`/`listCalls` with the branch every other service has. `endCall` deliberately does NOT call `appendSystemMessageSync` in real mode — the server writes that message and broadcasts it, and writing it locally too would show the caller two. |
| 193 | 2026-09-28 | app-6 | `call:ended` has always carried `systemMessage` and **nothing read it**. The "Voice call · 2:14" line appeared only for whoever was on the call screen (that side re-reads the thread on hang-up) and never for the other person until they reopened the chat | Fixed | `calls.store.ts` now appends it via `receiveMessage`, which dedupes by message id — so the call screen's own re-read and this event cannot produce the line twice. Also split the two jobs in that handler: stopping the ring is now independent of recording the call, where before an id mismatch returned early and skipped both. |
| 194 | 2026-09-28 | app-6 | **The gap was never a wrong assertion — it was that no test ran in real mode at all.** All 506 tests run in mock mode, where not calling the API is the CORRECT behaviour, so no existing test could ever have caught #192 | Fixed | Added `services/__tests__/calls.service.test.ts`: 3 real-mode tests asserting method, path and body against a captured `fetch`, plus one asserting mock mode touches the network for nothing. **Proven against the bug** — restored the original file and got 3 failed / 1 passed, restored the fix and got 4 passed. Suite now 510 passing, 24 files, 402 snapshots, typecheck clean. |
| 195 | 2026-09-28 | app-6 | Jest prints "A worker process has failed to exit gracefully" on a full run | Parked | **Pre-existing, not from the new test** — verified by running the suite with `--testPathIgnorePatterns calls.service.test`, where it still appears with the original 23 suites and 506 tests. A leaked timer or handle somewhere in the existing suites. Harmless today (everything passes) but it is the kind of thing that later turns into an order-dependent flake. The new test restores `global.fetch` and `EXPO_PUBLIC_API` in `afterAll` regardless, since both are global state. |
| 196 | 2026-09-28 | app-6 | **Nothing ever requested `RECORD_AUDIO` at runtime — every answered call would have died on the spot.** `react-native-webrtc` does not ask (zero of its 20 Android source files mention `RECORD_AUDIO`, `checkSelfPermission` or `requestPermissions`) and neither did the app, which handles only location. A manifest entry grants nothing on Android 6+ | Fixed | Found by asking "what else must be true for audio" BEFORE spending 30 minutes on a build, not after. The failure would have been silent and confusing: ring appears, accept, `getUserMedia` throws, `startCallMedia` returns false, `beginMedia` calls `end("cancelled")` — call dies instantly with no error shown. Added `ensureMicrophone()` in `webrtc.ts`, called before `getUserMedia` (after it, a throw is indistinguishable from a device with no mic). Android only — iOS prompts inside `getUserMedia` and asking first would be two dialogs. Uses `PermissionsAndroid` from react-native core, so **no new dependency**. "Never ask again" returns false rather than hanging, because that case needs the system settings screen and a call that fails honestly beats one that connects in silence. 510 tests still pass — mock mode returns before reaching it. |
| 197 | 2026-09-28 | infra | **coturn on the VPS verified from the public internet** — a real RFC 5389 STUN binding request got a Binding Success Response over **both UDP and TCP on 3478** | Verified | Proves coturn is running, the config parses and ufw allows both. Does NOT prove the API hands the credentials to the app: that needs `TURN_URLS`/`TURN_SECRET` in `/srv/hello/backend/.env` and is a one-line check on the box (`grep TURN .env`). coturn reachable but unconfigured in the API is a call that still fails across mobile networks, with nothing in either log to say why. |
| 198 | 2026-09-28 | app-6 | **Every outgoing call was made TWICE.** `call/[id].tsx` built `end` from `phase`, so a phase change rebuilt `end` → rebuilt `beginMedia` → and `beginMedia` was a dependency of the effect that CREATES the call. The instant audio connected and phase went ringing → connected, that effect re-ran and sent a second `POST /calls` — the other phone rang again while its owner was already talking | Fixed | Operator report: "when the sender is trying to call it is sending double". The `cancelled` flag never helped: it is checked AFTER the await, so it discarded the response of a request that had already gone. Root fix, not a flag — `phaseRef` lets `end` read the phase without depending on it, so its deps drop to `[id, loadMessages]` and everything downstream (`beginMedia`, two socket subscriptions) stabilises. A `startedOnce` ref is added on top, because a call is a side effect someone ELSE experiences and should be un-repeatable by construction. Caller-only, as reported: the callee short-circuits on `callId` and never POSTs. |
| 199 | 2026-09-28 | app-6 | **Hanging up did not end the call for the other person.** The active call screen subscribed to `call:accepted` and `call:signal` and to `call:ended` **zero times**, so whoever did not press End sat on a running call with the timer ticking | Fixed | Operator report: "after the one person cutted the call still another person still in the call". The server was right all along — `emitCallEnded` fires from two places and the controller loops over every participant, so the event was already arriving at both phones with nobody listening. `end` split into `finish(outcome, notifyServer)`: our own hang-up posts, a remote one does not, because the end that reached us IS the server's and posting again would record a second end for one call. |
| 200 | 2026-09-28 | app-6 | **Cancelling a call left the other phone ringing** — found in the audit, not reported. `incoming-call/[id].tsx` read `clearIncoming` but never reacted to a call ending, so a caller giving up left the ring going, and answering it would accept a call the server had already ended | Fixed | Subscribed to `call:ended` directly rather than watching the store's `incoming` going null — `onAccept` clears that itself, so reacting to null would race our own answer and bounce us off the screen the instant we accepted. |
| 201 | 2026-09-28 | app-6 | Second, independent route to a double call: the Call button in `thread/[id].tsx` was a bare `router.push` with no in-flight guard, so a fast double-tap stacked two call screens and each started its own call | Fixed | Latched ref released on `useFocusEffect` rather than a timer, so it re-arms exactly when the screen becomes usable again and cannot re-arm while the call screen is still up. |
| 202 | 2026-09-28 | app-6 | Added `app/__tests__/call-lifecycle.test.tsx` — the snapshot tests could never have caught #198, because they capture a tree and unmount immediately, so the screen never lives long enough to change phase | Fixed | **Proven against the bug: Expected 1, Received 2.** Both renders unmount in a `finally` — the first attempt lacked that, a failing `expect` threw before `unmount()`, and the leaked CallScreen ran on inside the NEXT test where its fresh spy counted the old screen's calls. That made the answering-path test look broken too; with the leak closed it passes against the bug, so that path was always correct. **I nearly logged a bug that did not exist.** Suite now 512 passing, 25 files. |
| 203 | 2026-09-28 | app-6 | `match:new` and `request:new` are emitted by the server and **subscribed by nobody** — a new match or message request does not appear until a reload | Parked | Same class as #199, lower severity: stale rather than stuck. Operator chose to ship #198-#201 first. `notification:new` looks like a third instance but is NOT — `emitNotification` is defined and has **zero call sites**, so live notifications were never wired at either end. That is unbuilt Phase 8 work, not a missing listener. |
| 204 | 2026-09-29 | app-6 | **`call/[id].tsx` had NO unmount teardown — the microphone stayed open.** `stopCallMedia()` lived only inside `finish()`, so it ran only when someone pressed End or the other side hung up. Any other exit — the back gesture on a full-screen modal, the home button, the OS tearing the screen down — left the mic live and the call open on the server | Fixed | Found by reading, then seen happening: a device capture caught the operator pressing home while a call screen was up (frame 054 of `ring2`). The call did not just vanish from view, it kept running and listening. Cleanup touches no state and does no navigation — the component is already gone — and reads refs, which still hold their values at teardown. **My first version was wrong and the tests caught it**: `endCall` rejected unhandled, which is a red box in RN, and it is the ORDINARY path, since a callee holds the CALLER'S id that its own service never minted. Now `.catch(() => {})` with the reason written down. |
| 205 | 2026-09-29 | app-6 | **The incoming ring was a `router.push` from a socket handler, so it was a NAVIGATION event — and navigation events lose.** Operator: "the incoming is only coming when in chat screen only… it wants to come in any screen", and "when incoming call is coming we move to another screen that incoming is completely missing" | Fixed | Rearchitected rather than patched: `calls.store` now only sets `incoming`, and a new `IncomingCallOverlay` mounted in `_layout.tsx` **after `<Stack>`** renders from that state, above every screen and the native tab bar. A ring is a fact, not a destination. The shared body lives in `IncomingCallPanel` so the overlay and the surviving dev-trigger route cannot drift into ringing differently. **Not yet reproduced on hardware** — the second phone left the building mid-session — but the route-push design is fragile regardless of which navigator quirk caused it, and the overlay removes the whole class. 512 tests pass and **402 snapshots are unchanged**, so the extraction is behaviour-preserving. |
| 206 | 2026-09-29 | app-6 | Putting `IncomingCallOverlay` in the `components/common` barrel broke two test suites with `SyntaxError: Cannot use import statement outside a module` from `standard-navigation` | Fixed | The barrel is imported by the pure-UI tests; the overlay reaches `expo-router`, which drags in an ESM package Jest does not transform. **The barrel must stay navigation-free** — both new components are imported by path, with the reason written into `common/index.ts` so the next person does not re-add them. |
| 207 | 2026-09-29 | app-6 | **The double-tap "2 stacks" could NOT be reproduced on the shipped build.** Driven on the device: taps 90ms apart and 450ms apart each produced exactly ONE call screen, and End returned straight to the thread with nothing behind it | No change | Most likely the operator saw it on the build BEFORE `Hello-calls-fix-1601.apk`, which is when the guard landed. Logged rather than "fixed" — changing code that two direct tests say is correct would be guessing, and I have already been wrong once this session by assuming instead of measuring (#202). |
| 208 | 2026-09-29 | app-6 | **A cold start always lands signed out.** `expo-secure-store` is not installed and nothing persists tokens — grepped for `SecureStore`, `AsyncStorage` and zustand `persist`, all absent. PLAN R7, still open | Parked | Now a practical blocker, not just a gap: every app kill means both testers re-authenticate by reading an OTP off the VPS journal, and it stopped me driving the device to diagnose #205. `expo-secure-store` IS signed off in PLAN's backend plan, so this is implementation, not a new decision — awaiting the operator's go-ahead because it is scope they did not ask for. |
| 209 | 2026-09-29 | app-6 | **PLAN R7 closed: the session now survives closing the app.** `expo-secure-store` installed and wired — `src/services/secureSession.ts` keeps the whole `Session` in the device keychain, `auth.service.getSession()` restores it on a cold start, and sign-out clears it | Fixed | Operator: "fix that". The irony was that nothing was wrong server-side — `REFRESH_TTL_SEC` is 30 days and `/auth/refresh` already existed; the app simply threw away what it was given. **Persisted from `client.ts:setTokens`, not only at sign-in**, because that is also where a REFRESH lands: the refresh token rotates every use and the server destroys the whole session family if an old one is replayed (contract gap 1), so a stored copy that missed a rotation would be worse than none. Keychain not `AsyncStorage`: a 30-day refresh token is a credential, and `types.ts` had said so about that exact field since Phase 3. Every function swallows its errors — a keychain failure should mean "sign in again", never "the app cannot start". |
| 210 | 2026-09-29 | app-6 | Added `services/__tests__/secureSession.test.ts` — 5 real-mode tests: the write, the **cold start** (fresh module graph, nothing in memory), token ROTATION updating the stored copy, sign-out clearing it, and mock mode persisting nothing | Fixed | **Proven against the bug: 4 of 5 fail without persistence**, and the mock-mode one passes both ways, which is right — mock never persisted and must not start. Same lesson as #194 and #202: all 512 existing tests run in mock mode where NOT persisting is correct, so the gap was never a wrong assertion, it was the absence of a real-mode test. Suite now **517 passing, 26 files**, 402 snapshots unchanged. |
| 211 | 2026-09-29 | app-6 | **Store-review email sign-in added.** "Log in with email" link on Welcome → `(auth)/email` screen → `POST /auth/email`. The server compares against `REVIEW_LOGIN_EMAIL` / `REVIEW_LOGIN_PASSWORD` (constant-time) and opens a session on the EXISTING account for `REVIEW_LOGIN_PHONE`; it never creates or restores an account, and with the vars unset it refuses every attempt. Rate limited 10 / 15 min per IP | Added | Operator request, for Google Play review. Deliberately an exception to PLAN §1 "phone + OTP only", scoped to one server-configured credential. **Credentials are server-side only** — in the APK they would be extractable and the target is the operator's own account. Tests: `backend/tests/review-login.test.ts` (5 passing), app suite 519 passing with the new `(auth)/email` snapshot. Not yet driven on a device. |
| 212 | 2026-09-29 | app-6 | `backend/.env` has `OTP_DEV_MODE=flase` (typo). It parses as false, so `/auth/code` returns no `devCode` and 12 backend tests that sign in fail when run against this `.env` | `backend/.env` | Found, not caused. Tests pass with `OTP_DEV_MODE=true OTP_LOG_ONLY=false` on the command line. Fix the spelling, or pin `OTP_DEV_MODE` in `vitest.config.ts`. |
| 213 | 2026-09-29 | app-6 | With #212 overridden, 5 backend tests still fail, none on auth: `contract-sync` (generated `.d.ts` stale vs `app/src/services/types.ts`), 3 in `seed.test.ts`, 1 in `threads.test.ts` (clientMessageId idempotency) | `backend/tests/` | Found, not caused. Nothing in #211 touches types, seed or threads. |
| 214 | 2026-09-29 | app-6 | **Caller kept ringing after the callee picked up** (operator: Hosanna → Sunand). The callee emitted `call:accept` BEFORE opening its own microphone/peer connection, and `call:signal` was only listened to while the call screen was mounted. The caller answered the accept with an offer at once; on a phone still showing the mic prompt (or just slower) that offer hit no session in `webrtc.ts` and was dropped. Callee showed connected, caller showed "Ringing…" until the 45s timeout. Direction-dependent because it depends on which phone is slower / has not granted the mic yet | `stores/activeCall.store.ts` | Fixed: callee opens media FIRST, then accepts; signalling is listened to at module load for the whole session. Caller now shows "Connecting…" between accept and audio. Pinned by `stores/__tests__/activeCall.store.test.ts` ("accepts only AFTER the callee's media is ready"). |
| 215 | 2026-09-29 | app-6 | **Hardware back ended the call.** The call lived inside `call/[id].tsx` with an unmount cleanup that hung up (added by #204 to stop an orphaned open mic). Moved the whole call — phase, media, socket handlers, timers — into `activeCall.store`; the screen is now a view. Leaving it keeps the call running; `ActiveCallBar` (teal strip at the top of every screen, above the navigator) shows name + timer and returns to the call. Sign-out hangs up. `useCallTimer` moved to `common/hooks` (now 2 users) and counts from the call's `connectedAt`, so returning shows the real duration | `stores/activeCall.store.ts`, `common/organisms/ActiveCallBar` | Operator request. #204's concern (mic left open) is still covered: the mic now closes when the CALL ends, not when a screen does. Test: "leaving the screen does NOT end the call". App suite 527 passing, 404 snapshots unchanged. **Not yet driven on a device.** |
| 216 | 2026-09-29 | app-6 | **Speaker quiet at full volume; Speaker button inert** (#166 a). Nothing put the phone in call mode: WebRTC plays on the VOICE-CALL stream, the volume keys moved MEDIA volume. Added local native module `app/modules/call-audio` (Kotlin, autolinked from `modules/`, **no new npm dependency, no new permission** — `MODIFY_AUDIO_SETTINGS` already comes from the WebRTC plugin): MODE_IN_COMMUNICATION, volume keys → STREAM_VOICE_CALL, speaker ↔ earpiece (`setCommunicationDevice` on API 31+, `isSpeakerphoneOn` below), all restored on hang-up. JS face `services/callAudio.ts`, a no-op on iOS / Jest / older builds | `modules/call-audio` | Operator request. **Needs a new dev build.** Calls now start on the EARPIECE (normal phone behaviour); Speaker switches. Kotlin NOT compiled here: Gradle could not be downloaded in the sandbox — checked line-by-line against patterns in installed expo modules instead. First `expo run:android` is the real check. |
| 217 | 2026-09-29 | app-6 | **Open: a call while the app is in the BACKGROUND.** Pressing Home keeps the call object alive, but Android (11+) blocks microphone capture for a backgrounded app without a foreground service of type `microphone` — the other side hears silence. Swiping the app away kills the JS, so the call cannot continue at all | `modules/call-audio` | Needs `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MICROPHONE` (install-time, but AGENTS.md says RECORD_AUDIO is the *only* new permission accepted) plus a Play Console foreground-service declaration. Parked for operator sign-off; the service itself fits in the same local module. |
| 218 | 2026-09-29 | app-6 | **Voice messages, WhatsApp-style, both directions.** Hold the mic (it takes Send's slot when the field is empty) to record, release to send, slide left past 90px to cancel; timer + "Slide to cancel" replace the field while recording; 1s minimum, 120s auto-send. Bubble = play/pause + progress + time, one clip plays at a time, loaded lazily on first tap. Mic is disabled during a voice call. Backend: `kind: "voice"` messages; `POST /threads/:id/voice` (raw AAC/MP4 body, sniffed for `ftyp`, 2 MB / 120 s caps, membership checked BEFORE writing to disk, idempotent via `clientMessageId` with no orphan file); `GET /messages/:id/voice` streams with Range, gated like the thread; audio deleted on unmatch/block after commit. Files in `VOICE_DIR` (prod `/var/lib/hello/voice` via systemd `StateDirectory`) | `components/thread/*`, `backend/src/services/voice.service.ts` | Operator request. `expo-audio` signed off by the operator for this (AGENTS.md updated) with background playback/recording OFF so no foreground-service permissions are added. Tests: backend `tests/voice.test.ts` 8 passing; app 535 passing, 410 snapshots (6 new, 4 updated = mic in the empty composer). **Deploy needs the one-time steps in `deploy/README.md` §18** (unit, `VOICE_DIR`, nginx 3m on the voice route) and **a new app build**. Not yet driven on a device. |
| 219 | 2026-09-29 | app-6 | **A retried message send HUNG on a replica set** (production). Duplicate `clientMessageId` → the insert aborts the transaction → the code looked the original up INSIDE the aborted transaction → transient error → the driver retried the whole callback forever. This was the `threads.test.ts` idempotency failure in #213 | `backend/src/services/threads.service.ts` | Fixed: check for the original before inserting; resolve the rare race outside the transaction. Shared by text and voice. `threads.test.ts` now passes. |
| 220 | 2026-09-29 | app-6 | **A refreshed token was never persisted.** `client.refresh()` assigned `tokens` directly instead of `setTokens`, so the ROTATED refresh token lived only in memory; the next cold start replayed the old one, which the server treats as theft. #209's test called `setTokens` by hand and so never exercised it | `app/src/services/client.ts` | Fixed + real 401→refresh test in `secureSession.test.ts`, proven to fail without the fix. Mattered more now: `validAccessToken()` (for the audio player, which fetches clips itself) refreshes proactively. |
| 221 | 2026-09-29 | app-6 | Body-parser errors (malformed JSON, over-size body) answered **500 `server`** | `backend/src/middlewares/errorHandler.ts` | Fixed: now 400 `validation`. Found while capping voice uploads. #213 status after this work: `contract-sync` passes (contract regenerated for `voice`), `threads` passes (#219); the 3 `seed.test.ts` failures remain, untouched. |
| 222 | 2026-09-29 | app-6 | **Calls stuck on "Connecting…" (operator, release APK).** Revises #214: the old screen showed "Ringing…" until audio connected, so "caller keeps ringing" and this are the SAME failure — the audio path (ICE) never completing, not only a lost accept. Live TURN verified from outside with a real authenticated probe: coturn answers on UDP 3478, the `.env` secret is accepted, the relay address is public (200.234.39.223) and a packet sent into a relay port (49160-49200) arrives — so the relay itself is healthy. Not verifiable from here: whether the LIVE API's `TURN_SECRET` matches local `.env`. Client hardened: signals that arrive before a connection exists are buffered and replayed (not dropped); the caller re-sends its offer every 3s until answered, repeats are answered idempotently and stale answers ignored; `iceConnectionState` is a second source for "connected"; after 30s the call ends with "Couldn't connect" plus a diagnosis (`ice <state> · you <route types> · them <route types> · turn yes/no`) | `services/webrtc.ts`, `stores/activeCall.store.ts` | Root cause NOT yet confirmed on a device. The diagnosis line is what confirms it: `them none` = the other phone never got going (older build / signal lost); `turn no` = the phone got no relay from `/calls/ice`; `relay` present on both with `ice failed` = relay blocked on that network. Tests: `services/__tests__/webrtc.test.ts` (6, real mode — the WebRTC mock now tracks signalingState/descriptions) + connect-timeout store test; app 542 passing. |
| 223 | 2026-09-29 | app-6 | **The live socket went permanently deaf after 15 minutes.** `connectSocket` passed `auth: { token }` — the sign-in token, frozen for the socket's life. Access tokens live 15 min; the server re-checks on every handshake (its 2-min connection-state recovery skips that only for short drops). So after a lock-screen / network switch / backgrounding past 15 min, the reconnect was refused, and socket.io-client DESTROYS a socket whose handshake middleware refuses — no retry. That phone then received no rings, no call signalling and no live chat until restarted | `app/src/services/socket.ts` | Fixed: `auth` is now a callback taking `validAccessToken()` (refreshed if near expiry) on every handshake; a refused handshake is retried with backoff; coming back to the foreground reconnects. Tests in `socket.test.ts` (token read per connect; refusal retried). A likely contributor to calls failing in APK testing, where phones sit locked between attempts. |
| 224 | 2026-09-29 | app-6 | **Voice recording is now tap-to-start / tap-to-send** (operator request; replaces #218's hold-and-slide). Tap the mic → the field becomes 🗑 · ● "Recording… please speak" / "Tap the mic to send" · timer, and the mic turns red; tap the mic again → stop and send; 🗑 discards. First tap shows the mic permission prompt and recording starts once granted; a refusal, a failed start and a too-short (<1 s) recording each show a message instead of doing nothing. `RecordButton` is a plain tap target now (no gesture-handler) | `components/thread/*` | Tests: `useComposerVoice.test.tsx` (5: start, send, discard, denied, too short); snapshots updated (mic label + recording bar). App suite 549 passing. |
| 225 | 2026-09-29 | app-6 | **Call + voice logging in the backend console** (operator request — calls can only be tested on built APKs). Server logs every step with `[call]` / `[voice]` / `[socket]`: call start with the callee's live socket count, ICE servers handed out (turn yes/no, never the credential), accept with the caller's socket count, every relayed offer/answer/candidate (candidate TYPE only), every refusal with its reason, end with outcome; voice upload/store/play and each refusal. The PHONES now report their own side over a new `call:diag` socket event (media ready/failed, offer/answer sent/received/failed-to-apply with the error, ICE + connection state changes with route types, buffered/replayed signals, the give-up diagnosis) — logged server-side, size- and count-capped, no SDP or addresses. Also: a voice bubble whose first load failed now reloads (fresh token) on the next tap instead of staying dead | `backend/src/config/callLog.ts`, `sockets/calls.socket.ts`, `sockets/presence.ts`, `app/src/services/webrtc.ts` | How to read it: `deploy/README.md` §19 ("Following a call…"), including what each stopping point means. **Only visible once the new backend is deployed.** App 549 / backend 126 passing (3 seed failures pre-existing). |
| 226 | 2026-09-29 | app-6 | **ROOT CAUSE FOUND + FIXED (same day, reproduced against the local backend): SDK 57 installs `expo/fetch` as the global `fetch`, and it OVERWRITES a request's Content-Type with a Blob body's `type`. A Blob read from `file://` has type `""` (Expo's file interceptor sets no Content-Type header), so `audio/mp4` went out EMPTY, `express.raw({type: audio/*})` skipped the body, and every upload got `400 "The recording is empty."` (curl with an empty Content-Type reproduces it exactly). Fixed both sides: the app now reads and uploads a `Uint8Array` (`readRecording` / `RawBody`), which keeps our header; the route's raw parser accepts ANY content type — the MP4 sniff decides. Regression test added in `tests/voice.test.ts`. The notes below are the investigation that led here.** Original entry: **Voice messages fail on the release APK ("Couldn't send that voice message").** Ruled out from outside: nginx voice location is live (a 600 KB unauthenticated POST reaches the API and gets 401, not 413); the server path is correct (backend voice + thread suites 23/23 with `OTP_DEV_MODE=true`); expo-audio 57.0.5 records AAC in MPEG-4 on Android (passes the `ftyp` sniff); RN's BlobModule reads `file://` into a Blob. The live service is **`frnd-api`** (runs as root from `/var/www/Frnd_app/hello/backend`, no ProtectSystem) — NOT the `hello-api` unit in `deploy/`, so the read-only `VOICE_DIR` theory does not apply there. Blind spot found: production has NO per-request log (`useHumanRequestLog = !isProd`), so an upload refused by auth / rate limit / body parser left no trace | `backend/src/routes/v1/threads.routes.ts`, `middlewares/errorHandler.ts`, `services/voice.service.ts`, `config/env.ts`, `server.ts`, `sockets/calls.socket.ts`; `app/src/services/chat.service.ts`, `services/socket.ts`, `components/thread/hooks/useComposerVoice.ts` | Added: a `[voice] upload request arrived` / `upload FAILED with <status>` audit line on every upload (with the error code); boot-time `[voice] storage ready`/`NOT WRITABLE` probe; `VOICE_DIR` defaults to systemd's `STATE_DIRECTORY`; phones report each step over `voice:diag`; the on-screen error now carries the server's reason; the client normalises a bare path to `file://` and retries an empty read. **Next evidence:** `journalctl -u frnd-api -f -o cat \| grep voice` while sending from the new APK. Review login from here is refused on prod (`REVIEW_LOGIN_*` in local `.env` do not match the live server, or the target account is not active). |
| 227 | 2026-09-29 | app-6 | **The backend suite cannot run against this machine's `.env`: `OTP_LOG_ONLY=true` (a production value) makes `POST /auth/code` return no `devCode`, so every test that signs in gets 401.** `vitest.config.ts` pins `NODE_ENV`/`MONGO_DB`/review creds but not the OTP mode | `backend/vitest.config.ts` | Parked. Run as `OTP_DEV_MODE=true OTP_LOG_ONLY=false npx vitest run` → 126/129 (the 3 are the pre-existing seed failures). Fix: pin `OTP_DEV_MODE: "true"`, `OTP_LOG_ONLY: "false"` in the vitest `env` block. |

### Working commands (fill in at Phase 0)

```sh
# Source this first — it exports ANDROID_HOME/JAVA_HOME and defines the signals:
#   cd /Users/hosanna/TRIOZEN/Frd-app/2/Hello && . ./run-signals.sh

# iOS device name:  Flavour iPhone
# iOS boot:         xcrun simctl boot "Flavour iPhone"
# iOS status bar:   xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4
# iOS capture:      xcrun simctl io booted screenshot "$RUN_EVIDENCE/ios/phase-N/<screen>.png"
# iOS shutdown:     xcrun simctl shutdown all

# Android AVD name: Flavour_Pixel   (also: Flavour_320) — both arm64-v8a, android-35
# Android boot:     emulator -avd Flavour_Pixel -no-snapshot -no-audio &
# Android capture:  adb exec-out screencap -p > "$RUN_EVIDENCE/android/phase-N/<screen>.png"
# Android shutdown: adb emu kill

# JAVA_HOME:        /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
# ANDROID_HOME:     /opt/homebrew/share/android-commandlinetools
# Evidence root:    /Users/hosanna/TRIOZEN/Frd-app/2/Hello-evidence   (outside the repo)
```

### Run position (update on any pause)

- **Last completed phase:** 4 code-complete (20/25). Phase 3 complete 39/39; Phase 2 37/41; Phase 1 33/37; Phase 0 19/29.
- **Platform reached:** neither booted; both toolchains verified green
- **Typecheck error count vs baseline:** 0 / 0 baseline · lint 0 / 0 · **232 tests pass, 176 snapshots**
- **Component score:** **0** — no bare RN primitives in `src/app/**`
- **Kit built:** 22 atoms · 15 molecules · 3 organisms · 7 templates · 7 hooks · 4 utils
- **Data layer:** 11 services + client · 6 stores · 5 fixture modules · copy · api-contract.md
- **Screens:** 12 routes — 3 auth, 8 onboarding, `+not-found`
- **Design:** R1 closed. Design system adopted; Inter bundled; 3 illustrations shipped.
- **Home design pass applied and verified on device** (`../Hello-evidence/android/phase-5-design/`): location chip, title + subtitle, uniform cards with coloured chips and no bio, full-screen filters with two sub-screens, gender filter, design empty state.
- **Android: VERIFIED through Phase 6.** Deck gestures exercised by hand — stamps, rotation, spring-back, stack depth, buttons.
- **Android: VERIFIED through Phase 5.** Phase 4: 13 captures. Phase 5: 11 captures (tab shell, nearby grid, search, likes, notifications, filters sheet, profile sheet, 3 tab placeholders). All distinct, no blanks.
- **iOS: OUT OF SCOPE** by operator decision (2026-09-19). Blocked by parking #16 and not being pursued.
- **Six bugs found by running it, all fixed:** launch landed on `+not-found`; OTP landed on the 18+ dead end; toggle thumb rendered green; auth back was text not a chevron; avatar initial was clipped; **the age gate could be escaped with hardware back**.
