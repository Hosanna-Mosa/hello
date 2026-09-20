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
