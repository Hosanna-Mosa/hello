# PLAN.md — Friend-Connection App, MVP

> A platonic friend-finding mobile app. **Frontend first, mock data, no backend.**
> Built strictly component-based per `Mobile-Component-Refactor-Playbook-FULL-AUTONOMOUS.pdf`.

**Stack** — Expo SDK `~57.0.24` · expo-router `~57.0.22` · React Native `0.86.3` · React `19.2.3` · Reanimated `4.5.1` + gesture-handler `~2.32.0` + worklets `0.10.1` · TypeScript `~6.0.3`
**Routes** — `app/src/app/` · **Alias** — `@/*` → `./src/*` · **Experiments** — `typedRoutes`, `reactCompiler` both ON

**Progress: 0 / 414**  ·  414 checkboxes across 11 phases, 43 routes, 18 assumptions and 15 risks

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
| **Delivery** | Live demo **and** installable builds (TestFlight/internal iOS, APK Android). |
| **Backend** | Later. This phase ships `docs/api-contract.md` for it to be built against. |

### Out of scope for v1

Photos · groups · events · video calls · open (non-match-gated) messaging · undo/rewind · superlike · Hinge-style prompts · map view · contacts blocking · incognito · i18n · real ad network · real billing · real call infrastructure · real backend.

### Approved dependencies — this list and nothing else

- [ ] `zustand`
- [ ] `expo-location`
- [ ] `expo-haptics`
- [ ] `react-test-renderer` *(devDependency)*
- [ ] `jest-expo` *(devDependency)*
- [ ] Write this list into `app/AGENTS.md` so it is enforced

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

## Phase 0 — Pre-flight & baseline (0/29)

Nothing else starts until every box here is ticked.

**Operator gates**
- [ ] Ask the operator to run `caffeinate -i -t 300` in its own window — **ask, then wait for confirmation.** Do not start without it.
- [ ] `pmset -g therm` clear
- [ ] `pmset -g batt` above 10% and charging

**Toolchain — iOS**
- [ ] `xcrun simctl list devices available` lists at least one iPhone
- [ ] `xcrun simctl boot "<device>"` boots
- [ ] `xcrun simctl shutdown all` stops it
- [ ] Working iOS commands written into the parking log

**Toolchain — Android** *(the one that is usually not ready)*
- [ ] `adb --version` present
- [ ] `echo $ANDROID_HOME` set and exported in the shell profile
- [ ] `emulator -list-avds` lists at least one device
- [ ] AVD uses an **arm64-v8a** system image (x86 on an ARM Mac runs under emulation — painfully slow)
- [ ] `JAVA_HOME` points at **Java 17**, not whichever JDK is first on `PATH`
- [ ] Emulator boots and `adb emu kill` stops it
- [ ] Working Android commands written into the parking log

**Project baseline**
- [ ] Record the existing typecheck error count — the gate is **"no *new* errors"**, not "zero errors"
- [ ] Record the existing lint warning count
- [ ] Run `npx expo start` once to generate `.expo/types` and `expo-env.d.ts` (typedRoutes)
- [ ] Confirm `.expo/` and `expo-env.d.ts` are git-ignored
- [ ] Install approved deps: `npx expo install expo-location expo-haptics`, `npm i zustand`, `npm i -D react-test-renderer jest-expo`
- [ ] `npx expo install --check` passes — **do not "fix" the Reanimated 4.5.1 / RN 0.86.3 pairing** (see R6)
- [ ] `npx expo-doctor@latest` reviewed, findings parked

**Development builds** *(never both at once)*
- [ ] `npx expo install expo-dev-client`
- [ ] `npx expo run:ios` — **wait for it to finish completely**
- [ ] `npx expo run:android` — only after iOS has finished
- [ ] Confirm the generated `ios/` and `android/` folders are git-ignored (build artefacts)

**Open the run**
- [ ] Save `run-signals.sh` (playbook §13) beside the parking log; `. ./run-signals.sh`
- [ ] Create the parking log with the working commands for both platforms at the top
- [ ] Create `evidence/ios/` and `evidence/android/`
- [ ] Print `started`

---

## Phase 1 — Theme + primitives (0/37)

Tokens and the wrapper set. **Nothing else.** No screens, no features.

**Theme (`src/theme/`)**
- [ ] `tokens.light.ts` — colour, spacing, radii, shadow, z-index
- [ ] `tokens.dark.ts` — same keys, dark values
- [ ] `typography.ts` — type scale by role, not by size
- [ ] `index.ts` — semantic token contract, typed so a missing dark value is a compile error
- [ ] `useTheme()` in `components/common/hooks/`
- [ ] Root `_layout.tsx` wires the theme provider and respects `userInterfaceStyle: "automatic"`

**Primitive wrappers (`components/common/atoms/`)** — one thin layer, every prop passed through
- [ ] `Box` ← `View`
- [ ] `Heading` ← `Text`
- [ ] `Body` ← `Text`
- [ ] `Label` ← `Text`
- [ ] `Caption` ← `Text`
- [ ] `Scroller` ← `ScrollView` (keep `contentContainerStyle` passing through)
- [ ] `List` ← `FlatList`, generic over the row type
- [ ] `SectionedList` ← `SectionList`
- [ ] `Tappable` ← `Pressable`
- [ ] `Touchable` ← `TouchableOpacity` *(kept distinct — press feedback differs)*
- [ ] `Picture` ← `expo-image`
- [ ] `Input` ← `TextInput`, styled
- [ ] `BareInput` ← `TextInput`, unstyled
- [ ] `SafeArea` ← `SafeAreaView` *(structural — belongs in a template, never scattered)*
- [ ] `KeyboardAware` ← `KeyboardAvoidingView`
- [ ] `Spinner` ← `ActivityIndicator`

**App atoms**
- [ ] `Icon` — `expo-symbols` wrapper (SF Symbols on iOS, Material on Android)
- [ ] `Avatar`
- [ ] `Chip`
- [ ] `Badge`
- [ ] `Divider`
- [ ] `Stamp` — the LIKE / NOPE deck overlay

**Guards**
- [ ] Lint rule: no bare RN primitives outside `components/common/atoms/`
- [ ] Lint rule: **no text wrapper nested inside another text wrapper** (M2)
- [ ] `components/common/index.ts` barrel

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots captured for every atom
- [ ] iOS: boot → check → capture → **shut down**
- [ ] Android: boot → check → capture → **shut down**
- [ ] Both platforms match their own baselines, 100%
- [ ] `phase_done 1`

---

## Phase 2 — Shared kit (0/41)

**Molecules (`common/molecules/`)**
- [ ] `Button`
- [ ] `Field`
- [ ] `SearchBar`
- [ ] `EmptyState`
- [ ] `ErrorState`
- [ ] `Skeleton`
- [ ] `ListRow`
- [ ] `SettingsRow`
- [ ] `ToggleRow`
- [ ] `SectionHeader`
- [ ] `WizardProgress`
- [ ] `DistanceLabel` — formats as "2 km away", never a point
- [ ] `InterestChips`
- [ ] `CountBadge`
- [ ] `RangeSlider`

**Organisms (`common/organisms/`)** — the cross-screen ones only
- [ ] `ConfirmDialog`
- [ ] `ProfileCard`
- [ ] `AvatarPicker`

**Templates (`common/templates/`)**
- [ ] `ScreenShell` — SafeArea + header + slot
- [ ] `TabScreenShell`
- [ ] `FormShell`
- [ ] `WizardShell`
- [ ] `SheetShell`
- [ ] `ListScreenShell`
- [ ] `CallShell`

**Hooks (`common/hooks/`)**
- [ ] `useSession`
- [ ] `useAsyncStatus` — loading / error / empty / content
- [ ] `useDebouncedValue`
- [ ] `usePermission` — the **ask → refusal → never-ask-again** dance, written once
- [ ] `usePullToRefresh`
- [ ] `useSearchFilter`

**Utils (`common/utils/`)**
- [ ] `formatDistance` (km; miles is a one-line change — A2)
- [ ] `formatRelativeTime`
- [ ] `calculateAge`
- [ ] `profileCompleteness`

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots for every molecule, organism and template
- [ ] iOS: boot → check → capture → **shut down**
- [ ] Android: boot → check → capture → **shut down**
- [ ] Both platforms 100%
- [ ] `phase_done 2`

---

## Phase 3 — Data layer (0/39)

No UI in this phase. Types, services, stores, fixtures, contract.

**Entity types (`src/services/types.ts`)**
- [ ] `User` — id, name, birthday, gender, avatarId, bio, interests[], location, lastActiveAt, createdAt. **No photo fields.**
- [ ] `Interest` — id, label, category
- [ ] `Avatar` — id, asset, label
- [ ] `Like` — + optional `note`
- [ ] `MessageRequest` — likeId, fromUserId, toUserId, note, status
- [ ] `Match`
- [ ] `Thread`
- [ ] `Message` — + status, reactions[], optional `system` kind for call records
- [ ] `CallSession` — threadId, direction, startedAt, durationSec, outcome
- [ ] `Entitlements` — isPremium, likesRemaining, likesResetAt
- [ ] `Plan` — id, label, price, period
- [ ] `Block`, `Report`, `Notification`, `Session`

**Mock service layer (`src/services/`)**
- [ ] `client.ts` — 300–800ms latency, injectable failures behind a dev-only switch
- [ ] `auth.service.ts`
- [ ] `me.service.ts`
- [ ] `profiles.service.ts`
- [ ] `likes.service.ts` — includes requests
- [ ] `matches.service.ts`
- [ ] `chat.service.ts`
- [ ] `calls.service.ts`
- [ ] `billing.service.ts`
- [ ] `notifications.service.ts`
- [ ] `safety.service.ts`

**Stores (`src/stores/`)** — Zustand
- [ ] `session.store.ts`
- [ ] `deck.store.ts`
- [ ] `filters.store.ts`
- [ ] `chat.store.ts`
- [ ] `entitlements.store.ts`
- [ ] `ui.store.ts` — theme override, dev failure switch, dev incoming-call trigger

**Fixtures (`src/mocks/`)**
- [ ] `interests.ts` — ~60 tags across ~8 categories (A6)
- [ ] `avatars.ts` — ~30 placeholder avatars (A7)
- [ ] `profiles.ts` — ~40 seeded users (A8)
- [ ] `threads.ts` — ~8 conversations, ~6 inbound likes
- [ ] `replies.ts` — scripted auto-reply scripts

**Contract + copy**
- [ ] `docs/api-contract.md` — routes, request/response shapes, error codes, pagination, auth header
- [ ] `src/copy/` — all user-facing strings, product-name-free (A1, A3)

**Verification**
- [ ] Typecheck: no new errors
- [ ] Unit checks on services: latency, failure injection, request accept/decline, quota decrement
- [ ] `phase_done 3` *(no screens yet — snapshot/screenshot gates resume in Phase 4)*

---

## Phase 4 — Auth + onboarding (0/25)

**Routing skeleton**
- [ ] `src/app/_layout.tsx` — `GestureHandlerRootView` + `SafeAreaProvider` + theme provider + `<Stack>`
- [ ] **`<Stack.Protected guard={…}>`** for `(auth)` / `(onboarding)` / `(tabs)` — NOT effect-based redirects
- [ ] `src/app/+not-found.tsx`
- [ ] Confirm `SafeAreaProvider` is mounted explicitly (expo-router is not documented to mount it)

**`(auth)` group**
- [ ] `_layout.tsx`
- [ ] `index.tsx` — welcome / value carousel
- [ ] `phone.tsx` — country-code picker + number entry
- [ ] `otp.tsx` — 6-box code, resend countdown, SMS-autofill affordance

**`(onboarding)` group** — one question per screen, progress bar
- [ ] `_layout.tsx` — `WizardShell` + progress
- [ ] `name.tsx`
- [ ] `birthday.tsx` — **18+ gate**
- [ ] `age-restricted.tsx` — dead end, no way forward
- [ ] `gender.tsx` — Woman / Man / Non-binary / self-describe / prefer-not-to-say + show-on-profile toggle (A5)
- [ ] `avatar.tsx` — preset picker
- [ ] `interests.tsx` — minimum 3
- [ ] `bio.tsx` — character counter
- [ ] `location.tsx` — **permission primer before the OS dialog**, with "Not now" and a manual-city fallback

**Screen-local components**
- [ ] `components/otp/`, `components/birthday/`, `components/interests/`, `components/avatar/` as each screen needs them — **create the folder only when the first component lands in it**

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots for all 12 auth/onboarding screens
- [ ] iOS: boot → **navigate to every route by hand** → capture → shut down
- [ ] Android: boot → **navigate to every route by hand** → capture → shut down
- [ ] Smallest-capture check passed — no blank screens counted as passes
- [ ] Both platforms 100%
- [ ] `phase_done 4`

---

## Phase 5 — Home (0/23)

**Tab shell**
- [ ] `(tabs)/_layout.tsx` — 4 tabs, icons via `expo-symbols`
- [ ] Home header: search entry + likes entry (heart + unread count) + filter entry

**Screens**
- [ ] `(tabs)/index.tsx` — nearby **2-column grid** (A9), pull-to-refresh
- [ ] `filters.tsx` — `formSheet`: distance slider with live count, age range, interests, active-recently
- [ ] `search.tsx` — **people by name only**, recent searches
- [ ] `likes.tsx` — inbound likes grid
- [ ] `notifications.tsx` — activity feed grouped by day, deep links
- [ ] `user/[id].tsx` — full profile, `formSheet`

**States — every one of these is a real screen**
- [ ] Nearby: loading skeletons
- [ ] Nearby: empty ("no one nearby" → widen radius CTA)
- [ ] Nearby: error + retry
- [ ] Nearby: location permission denied → explainer + Open Settings + manual city
- [ ] Search: empty query / no results
- [ ] Likes: empty
- [ ] Notifications: empty
- [ ] Notifications-disabled recovery state

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots for every screen **and every state**
- [ ] iOS: boot → navigate every route by hand → capture → shut down
- [ ] Android: boot → navigate every route by hand → capture → shut down
- [ ] Smallest-capture check passed
- [ ] Both platforms 100%
- [ ] `phase_done 5`

---

## Phase 6 — Match deck (0/23)

The largest single change, and the one every gate was built for.

**Deck mechanics**
- [ ] `SwipeCard` organism — avatar, name, age, distance, interest chips, bio excerpt
- [ ] `SwipeDeck` organism — `Gesture.Pan()` + `useSharedValue` + `useAnimatedStyle`
- [ ] **Use `scheduleOnRN`, not `runOnJS`** — Reanimated 4
- [ ] LIKE / NOPE `Stamp` overlays driven by drag distance
- [ ] Haptics on decision (`expo-haptics`)
- [ ] Card-stack depth: 2–3 cards visible with scale/offset
- [ ] Tap buttons mirror the gestures exactly

**Screens**
- [ ] `(tabs)/match.tsx`
- [ ] Expanded profile via `presentation: 'formSheet'` with sticky action bar
- [ ] `like-note/[id].tsx` — note composer, `formSheet`
- [ ] `matched/[id].tsx` — celebration, `transparentModal`, routes straight to chat

**States**
- [ ] Deck loading skeleton
- [ ] Out-of-cards ("you're all caught up" + widen filters)
- [ ] Deck error + retry

**Performance**
- [ ] Prefetch the next N avatars via `expo-image` cache statics
- [ ] Confirm no in-place mutation of the card array (React Compiler breakage)

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots for deck, sheet, note composer, celebration, all states
- [ ] iOS: boot → swipe by hand both directions → capture → shut down
- [ ] Android: boot → swipe by hand both directions → capture → shut down
- [ ] Gesture behaviour exercised by hand on **both** platforms — pictures cannot see behaviour
- [ ] Both platforms 100%
- [ ] `phase_done 6`

---

## Phase 7 — Chat + calls (0/34)

**Conversation list**
- [ ] `(tabs)/chat.tsx` — **Messages | Requests** segmented control
- [ ] New-matches avatar carousel above the thread rows
- [ ] `ThreadRow` — avatar, snippet, time, unread dot
- [ ] `RequestRow` — avatar, note preview, Accept / Decline
- [ ] Accept → creates match + thread **seeded with the note as its first message**
- [ ] Decline → silent discard, sender never told (A18)

**Thread**
- [ ] `thread/[id].tsx`
- [ ] `ChatBubble` — sent / received, day separators, timestamps
- [ ] `ChatComposer` — with `KeyboardAware`
- [ ] `TypingIndicator` — animated, driven by the mock reply script
- [ ] Scripted auto-replies after a short delay
- [ ] `ReactionPicker` — long-press to react
- [ ] Reaction display on bubbles
- [ ] In-chat profile peek from the header
- [ ] Overflow menu: unmatch / block / report / mute
- [ ] Unmatch confirm — destructive guard, "this can't be undone"

**Voice calls — mocked, no audio, no mic permission (A17)**
- [ ] Call button in the thread header
- [ ] `call/[id].tsx` — `fullScreenModal`: ringing → connected
- [ ] `CallControls` — mute, speaker, end
- [ ] `useCallTimer` + connected-state timer display
- [ ] `incoming-call/[id].tsx` — `fullScreenModal`, accept / decline
- [ ] Dev-only trigger to fire an incoming call on demand for the demo
- [ ] `Voice call · 2:14` system message written back into the thread on end

**States**
- [ ] No matches yet
- [ ] No messages in a thread
- [ ] No pending requests
- [ ] Unmatched-by-them

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots for list, both segments, thread, all call states, all empty states
- [ ] iOS: boot → send a message, react, accept a request, place and receive a call → capture → shut down
- [ ] Android: same, by hand → capture → shut down
- [ ] Keyboard, back-button and call-screen behaviour differ per platform — exercise both
- [ ] Both platforms 100%
- [ ] `phase_done 7`

---

## Phase 8 — Profile, settings, safety (0/27)

**Profile**
- [ ] `(tabs)/profile.tsx` — own profile + completeness ring
- [ ] `edit-profile/index.tsx`
- [ ] `edit-profile/avatar.tsx`
- [ ] `edit-profile/interests.tsx`
- [ ] `edit-profile/bio.tsx`

**Settings tree**
- [ ] `settings/index.tsx` — grouped rows
- [ ] `settings/account.tsx` — phone, sign-in method
- [ ] `settings/discovery.tsx` — distance, age, "show me on app" toggle
- [ ] `settings/notifications.tsx` — per-channel toggles
- [ ] `settings/blocked.tsx` — list + unblock
- [ ] `settings/safety.tsx` — safety tips, meeting-in-person guidance
- [ ] `settings/help.tsx`
- [ ] `settings/legal.tsx` — terms, privacy, licences, app version
- [ ] `settings/delete-account.tsx` — reason → consequences → typed confirm
- [ ] Logout confirm action sheet

**Safety flows**
- [ ] `report/[id].tsx` — reason picker. **Reasons include "romantic or flirty advance"** — this is the positioning, not a nicety
- [ ] Report details + optional context
- [ ] Report submitted confirmation + also-block option
- [ ] Block confirm with consequences
- [ ] Safety entry reachable from profile, thread overflow and settings

**Permissions**
- [ ] Notification permission primer fires **after the first match** (A4)

**Verification**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots for all ~20 screens
- [ ] iOS: boot → navigate every route by hand → capture → shut down
- [ ] Android: boot → navigate every route by hand → capture → shut down
- [ ] Both platforms 100%
- [ ] `phase_done 8`

---

## Phase 9 — Monetisation (0/23)

Deliberately last, as **one coherent change across surfaces** now that they all exist.

**Entitlements**
- [ ] `useEntitlements()` hook — the single source every gated surface reads
- [ ] Dev-only premium toggle for demoing

**Ad placeholders** — inert mock components, no ad SDK (A14)
- [ ] `AdBanner` — Home nearby, standard 320×50 slot
- [ ] `AdCard` — injected into the deck **every 10 profiles**, tunable from one constant
- [ ] `AdRow` — chat conversation list
- [ ] Every slot carries a "Remove ads" CTA into the paywall
- [ ] All slots unmount when premium flips on — **no screen decides for itself**

**Paywall**
- [ ] `paywall.tsx` — `formSheet`: three placeholder plans, feature comparison, benefit-led CTA
- [ ] `settings/subscription.tsx` — current plan, **Restore Purchases**, deep link to store
- [ ] Paywall reachable from: every ad slot, blurred likes, out-of-likes, locked filters, profile

**Gates**
- [ ] Blurred like tiles + count on free; revealed on premium
- [ ] Daily like quota — **15/day**, resets at local midnight (A16)
- [ ] Out-of-likes state with countdown to reset
- [ ] Interests + active-recently filters locked on free, with a lock affordance
- [ ] Premium badge on own profile

**Verification — every affected screen checked TWICE**
- [ ] Typecheck: no new errors
- [ ] Render-tree snapshots, free tier
- [ ] Render-tree snapshots, premium tier
- [ ] iOS: boot → walk every ad surface and gate in **both** entitlement states → capture → shut down
- [ ] Android: same → capture → shut down
- [ ] Confirm zero ad slots render when premium is on
- [ ] Both platforms 100%
- [ ] `phase_done 9`

---

## Phase 10 — Score, de-duplicate, report (0/17)

**Component score**
- [ ] Count bare `View` / `Text` / `Pressable` / `TouchableOpacity` / `Image` / `ScrollView` / `FlatList` / `TextInput` in `src/app/**` — **imports do not count, only usage in the rendered tree**
- [ ] Include platform-suffixed files in the sweep (M4)
- [ ] **Score is zero.** Not "nearly zero"
- [ ] Every route file reads as a list of named things

**Duplication — three passes, not two**
- [ ] **Structural**: hash windows of consecutive meaningful lines, group by shared files → extract to a component
- [ ] **Style objects**: normalise each entry (sort keys, drop whitespace), then hash → shared constants or theme entries. *A line-based scan misses this entirely, and it is usually the largest count*
- [ ] **Logic**: the same handler/filter/state on two screens → a hook
- [ ] One pattern at a time, verified between each — never six screens in one step
- [ ] Every new hook does **exactly** what its copies did, including the parts you disagree with. Differences are kept and recorded, never quietly "corrected"
- [ ] Every path touched by a new hook exercised **by hand on both platforms**

**Handover**
- [ ] Evidence folders complete and labelled per platform, stored outside the repo
- [ ] Every capture checked for being genuinely rendered rather than blank
- [ ] Every route navigated to by hand on both platforms and confirmed present
- [ ] No new build errors vs the Phase 0 baseline
- [ ] Parking log handed over as **"everything is done except these"**
- [ ] **No version-control command was run** — work left uncommitted for its owner
- [ ] `completed` printed — only at a real 100%

---

## 5. Screen checklist (0/43)

"Route exists and is reachable" is what a green build does **not** prove (M5). Tick only after navigating to it by hand on **both** platforms.

**Auth & onboarding**
- [ ] `(auth)/index` — welcome
- [ ] `(auth)/phone`
- [ ] `(auth)/otp`
- [ ] `(onboarding)/name`
- [ ] `(onboarding)/birthday`
- [ ] `(onboarding)/age-restricted`
- [ ] `(onboarding)/gender`
- [ ] `(onboarding)/avatar`
- [ ] `(onboarding)/interests`
- [ ] `(onboarding)/bio`
- [ ] `(onboarding)/location`

**Tabs**
- [ ] `(tabs)/index` — Home nearby
- [ ] `(tabs)/match` — deck
- [ ] `(tabs)/chat` — Messages segment
- [ ] `(tabs)/chat` — Requests segment
- [ ] `(tabs)/profile`

**Home satellites**
- [ ] `search`
- [ ] `likes`
- [ ] `notifications`
- [ ] `filters`

**Deck & profile**
- [ ] `user/[id]`
- [ ] `like-note/[id]`
- [ ] `matched/[id]`

**Chat & calls**
- [ ] `thread/[id]`
- [ ] `call/[id]`
- [ ] `incoming-call/[id]`

**Safety**
- [ ] `report/[id]`

**Edit profile**
- [ ] `edit-profile/index`
- [ ] `edit-profile/avatar`
- [ ] `edit-profile/interests`
- [ ] `edit-profile/bio`

**Settings**
- [ ] `settings/index`
- [ ] `settings/account`
- [ ] `settings/discovery`
- [ ] `settings/notifications`
- [ ] `settings/blocked`
- [ ] `settings/safety`
- [ ] `settings/help`
- [ ] `settings/legal`
- [ ] `settings/subscription`
- [ ] `settings/delete-account`

**Monetisation & system**
- [ ] `paywall`
- [ ] `+not-found`

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

- [ ] **R1 — No designs exist.** Everything is on a placeholder palette. Tokens absorb colour, type and spacing cheaply; they **cannot** absorb a design implying different *structure*. **The single largest risk in the project.**
- [ ] **R2 — Avatar art is a dependency.** A real set with a different aspect ratio or style may change card layout, not just assets.
- [ ] **R3 — Installable builds need accounts.** iOS TestFlight/internal distribution requires an Apple Developer Program membership and an Expo account. **Not confirmed to exist.** Android APK has no such gate.
- [ ] **R4 — Android simulator readiness unknown.** `ANDROID_HOME`, an arm64 AVD, `emulator` on `PATH`, JDK 17. Phase 0 finds out; if Android can't boot, the core loop is blocked on day one.
- [ ] **R5 — React Compiler is beta** and its interaction with Reanimated worklets is undocumented by both Expo and Software Mansion. Escape hatch: `"use no memo"` per file.
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
| | | | *(empty)* | | |

### Working commands (fill in at Phase 0)

```sh
# iOS device name:
# iOS boot:
# iOS capture:
# iOS shutdown:

# Android AVD name:
# Android boot:
# Android capture:
# Android shutdown:

# JAVA_HOME:
# ANDROID_HOME:
```

### Run position (update on any pause)

- **Last completed phase:** —
- **Platform reached:** —
- **Typecheck error count vs baseline:** —
- **Component score:** —
