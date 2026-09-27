# UI Design Image-Generation Prompts

Prompt pack for generating UI design direction for the friend-connection app.
Derived from `PLAN.md`. Targets Midjourney / Nano Banana / DALL-E / Firefly.

**Why this exists:** `PLAN.md` R1 — *no designs exist*. These prompts set a
visual direction so Phase 1 tokens have something real to encode.

## How to use

Paste **Style Block** + **one Screen Block** + **Negative Block** as a single
prompt. Generate one screen at a time. Once a direction lands, lock the seed and
regenerate every other screen with it so the set stays coherent.

Run **Screen 10 (design system sheet) first** — a locked palette and type scale
is what `src/theme/tokens.*.ts` actually consumes. The screen mockups are
direction-setting only.

---

## Part 1 - Style Block

Prefix every screen prompt with this.

```text
A single high-fidelity mobile app UI design, portrait phone screen, 1179x2556,
flat 2D UI mockup rendered straight-on with no device bezel, no hand, no desk,
no perspective tilt, no drop shadow around the screen itself.

Product: a platonic friendship app for adults 18+ - people finding friends,
not dates. Warm, sincere, unhurried, slightly playful. Absolutely no romantic
or dating-app visual language.

Art direction: modern iOS-native aesthetic, generous whitespace, 24px side
gutters, 8px spacing rhythm, 16-20px corner radii on cards, hairline 1px
dividers, soft elevation via subtle tinted shadows rather than borders.
Typography is a clean geometric sans (SF Pro / Inter feel): one bold display
heading, comfortable 16px body, 13px muted captions. Strong type hierarchy
carries the screen.

Palette: warm neutral off-white background (#FAF8F5), near-black text
(#1A1815), one friendly accent used sparingly - warm coral-amber (#F2724B) -
plus a secondary calm teal (#2FA89B) for positive states. Muted warm grey for
secondary text. Accent appears on at most two elements per screen.

CRITICAL: there are NO photographs of people anywhere in this product.
Every person is represented by a flat vector illustrated avatar - a friendly
geometric character portrait, circular crop, flat colour blocks, no gradients
on faces, no photorealism, diverse and stylised, each on its own soft pastel
circular background. Interest tags and short bio text carry each card instead
of a photo.

Interest tags render as small pill chips: rounded-full, 13px medium label,
tinted pastel fill, no icons inside. Icons elsewhere are thin-stroke SF
Symbols style, 1.5px stroke, monochrome, never coloured illustrations.

All interactive targets look comfortably large (44x44 minimum). Realistic
plausible UI copy in English - no lorem ipsum, no gibberish text, no product
name or logo anywhere.

Screen to design:
```

---

## Part 2 - Screen Blocks

### 1. Home - Nearby

```text
A "Nearby" browse screen. Top header row: large bold title on the left;
three thin-stroke icon buttons on the right - magnifying glass, heart with a
small numeric badge "12", and a sliders/filter icon. Below, a 2-column grid of
person cards. Each card: large illustrated avatar filling the upper two thirds
on a soft pastel tint, then first name and age "Maya, 27", a small grey line
"2 km away", and two interest chips ("Hiking", "Board games"). Six cards
visible, seventh cut off at the bottom edge. A subtle inline advertisement
placeholder banner sits between grid rows - a plain bordered 320x50 rectangle
labelled "Ad" with a tiny "Remove ads" link. Bottom tab bar with four
thin-stroke icons: house, two-overlapping-circles, speech bubble, person -
first tab active in the accent colour.
```

### 2. Match - swipe deck (hero shot)

```text
A card-swipe discovery screen. One large rounded card centred with two more
cards peeking behind it, slightly scaled down and offset, showing stack depth.
The front card is rotated about 8 degrees to the right mid-drag and shows: a
very large illustrated avatar portrait on a soft pastel background, name and
age "Daniel, 31", "4 km away", a row of four interest chips, and two lines of
bio text. A bold outlined "LIKE" stamp badge in teal, rotated -15 degrees,
overlays the card's upper-left corner at partial opacity. Below the card, three
circular action buttons: grey X, accent-coloured heart, and a small
speech-bubble "note" button. Bottom tab bar visible, second tab active.
```

### 3. Onboarding - interests

```text
A single-question onboarding step. A thin progress bar near the top showing
roughly five of seven steps complete, with a back chevron. Large bold heading
"What are you into?" and a muted subheading "Pick at least 3". Below, interest
chips wrapped across many rows and grouped under small uppercase category
labels - Outdoors, Food, Games, Music, Creative. Four chips are selected,
shown filled in the accent colour with white labels and a small check; the rest
are unselected pastel outlines. A full-width rounded primary button pinned at
the bottom reading "Continue", above the home indicator. No tab bar.
```

### 4. Chat list - Messages / Requests

```text
A conversations screen. Bold title "Chats". Directly beneath, a two-option
segmented control: "Messages" selected, "Requests" with a small count badge
"3". Under it, a horizontal carousel of circular illustrated avatars labelled
"New matches", each with a tiny name beneath. Then a vertical list of
conversation rows: circular illustrated avatar, name in semibold, one-line
grey message preview, right-aligned timestamp, and an accent unread dot on two
rows. A plain bordered advertisement placeholder row sits between the fourth
and fifth conversation. Bottom tab bar, third tab active.
```

### 5. Thread - conversation

```text
A one-to-one chat screen. Header: back chevron, small circular illustrated
avatar, name, a green "Active now" caption, and a thin phone-handset call icon
on the right. Message bubbles: received bubbles left-aligned in soft warm grey,
sent bubbles right-aligned in the accent colour with white text, all with large
asymmetric corner radii. A centred small grey day separator reads "Yesterday".
One received bubble carries a small emoji reaction chip overlapping its lower
edge. A centred grey system message reads "Voice call - 2:14". At the bottom
left, an animated three-dot typing indicator bubble. A rounded input composer
bar at the bottom with a placeholder "Message" and a circular accent send
button.
```

### 6. Voice call - connected

```text
A full-screen mocked voice call, no video. Deep warm dark background with a
soft radial glow. Centred: a very large circular illustrated avatar with a
gentle concentric pulse ring, the name below in large light type, and a running
timer "02:14" in muted grey beneath it. Near the bottom, three circular
translucent control buttons in a row - microphone (muted state, with a slash),
speaker, and a red circular end-call button with a handset icon. Nothing else
on screen. No video feed, no picture-in-picture.
```

### 7. Profile - own

```text
A personal profile screen. Centred large illustrated avatar encircled by a thin
circular progress ring at about 70 percent in the accent colour, with a small
"70% complete" caption. Name and age below, a grey location line, and a small
"Edit profile" outline button. Beneath: a section headed "About me" with three
lines of bio text, then a section headed "Interests" with eight pastel chips.
Below that, a grouped settings list with thin-stroke leading icons and chevrons:
Settings, Safety, Help, and a "Go Premium" row highlighted with a subtle accent
tint. Bottom tab bar, fourth tab active.
```

### 8. Filters - bottom sheet

```text
A bottom sheet overlaying a dimmed blurred screen behind it, with a small grey
grabber handle at the top and rounded top corners. Title "Filters" with a
"Reset" text link on the right. Rows: a "Distance" slider with a value label
"25 km" and a live grey caption "412 people"; an "Age" dual-handle range slider
labelled "18 - 45"; an "Interests" row and an "Active recently" toggle row -
both dimmed with a small padlock icon and a tiny accent "Premium" tag. A
full-width rounded primary button at the bottom reads "Show 412 people".
```

### 9. Paywall

```text
A premium upgrade sheet. A bold benefit-led heading "Make more friends" with a
short supporting line. Below, a compact four-row feature list with thin-stroke
check icons: no ads, see who likes you, unlimited likes, advanced filters.
Then three horizontal plan cards side by side - 1 month, 6 months, 12 months -
with placeholder prices, the middle one selected with an accent border and a
small "Best value" ribbon. A full-width rounded accent button reads "Continue",
with tiny grey legal text beneath and a "Restore Purchases" text link. A close
X in the top-left corner.
```

### 10. Design system sheet - run this one first

```text
A design system style tile on a plain neutral background, not a phone screen,
landscape 16:9. Neatly arranged and labelled: a colour palette row of swatches
with hex codes for background, surface, text primary, text secondary, accent,
success, warning, danger; a type scale specimen showing Display, Heading, Body,
Label, Caption; a spacing and corner-radius ruler; buttons in primary,
secondary, ghost and disabled states; an input field in rest, focus and error
states; interest chips selected and unselected; a row of six illustrated
avatars showing the character style; and four thin-stroke tab bar icons.
Clean, labelled, organised in a grid like a Figma style page.
```

---

## Part 2b - Auth and onboarding screen blocks

Covers the remaining 10 routes of the auth and onboarding flow. Screen 3
(interests) above is step 5 of 7 and belongs in this sequence.

Flow order: welcome -> phone -> otp -> name -> birthday -> gender -> avatar ->
interests -> bio -> location. Seven onboarding steps, one question per screen.

Prefix each with the Style Block, and append BOTH the Negative Block and the
auth-specific addendum in Part 3b.

### 11. Welcome - (auth)/index

```text
A first-launch welcome screen, value carousel. Upper two thirds: a large flat
vector illustration of three stylised friends of different builds and skin
tones laughing together over coffee, side by side and clearly platonic, drawn
in the same flat geometric avatar style, on a soft pastel backdrop. Below it a
large bold two-line headline "Meet people who actually get you" and one muted
supporting line "Real friendships, near you". Three small dot page indicators
sit beneath, the first one filled in the accent colour. A single full-width
rounded accent primary button reads "Continue with phone". Nothing else - NO
Google, Apple, Facebook or email sign-in buttons, no social login row, no
password field. Tiny grey legal caption at the very bottom reads "By
continuing you agree to our Terms and Privacy Policy" with the two phrases
underlined. A small abstract geometric mark at the top centre, no wordmark and
no brand name.
```

### 12. Phone entry - (auth)/phone

```text
A phone number entry screen. Back chevron top-left. Large bold heading "What's
your number?" and a muted subheading "We'll text you a code. Standard rates
apply." Below, a single input row split into two parts: a small tappable
country-code selector on the left showing a flag glyph, "+91" and a tiny
downward chevron, then a wide number field to its right containing a partially
typed number "98765 43" with a visible text cursor. A hairline underline sits
beneath the whole row in the accent colour to show focus. A small grey caption
underneath reads "We never show your number to anyone". A full-width rounded
primary button reads "Send code", shown in a dimmed disabled state. A system
numeric keypad occupies the lower third of the screen. No tab bar.
```

### 13. OTP verification - (auth)/otp

```text
A verification code screen. Back chevron top-left. Large bold heading "Enter
the code" and a muted subheading "Sent to +91 98765 43210" with a small accent
"Change" text link beside it. Below, a row of six separate square code boxes
with generous spacing and rounded corners: the first four contain single large
digits, the fifth holds a blinking cursor with an accent border, the sixth is
empty. Beneath the boxes a centred grey line reads "Resend code in 0:24" with
the countdown greyed out and not yet tappable. A small iOS SMS-autofill
suggestion bar sits directly above the keyboard showing "From Messages -
482913". A system numeric keypad fills the lower third. No tab bar.
```

### 14. Name - onboarding step 1 of 7

```text
An onboarding wizard step. A thin segmented progress bar near the top showing
one of seven segments filled in the accent colour, with a back chevron to its
left. Large bold heading "What should we call you?" and a muted subheading
"This is how you'll appear to others". Below, a single large borderless text
field containing the partially typed name "Prian" with a visible cursor and a
hairline accent underline. A small grey caption beneath reads "You can't change
this later". Generous empty space fills the middle of the screen. A full-width
rounded accent primary button pinned above the home indicator reads "Continue".
No tab bar.
```

### 15. Birthday - onboarding step 2 of 7

```text
An onboarding wizard step. A segmented progress bar showing two of seven
segments filled, with a back chevron. Large bold heading "When's your
birthday?" and a muted subheading "You must be 18 or over to use this app".
Below, a large iOS-style three-column date picker wheel showing month, day and
year, with the selected row "March 14 1998" highlighted on a soft tinted band
and the rows above and below fading out. Beneath the wheel a small grey
confirmation caption reads "You'll be 27". A full-width rounded accent primary
button reads "Continue". No tab bar.
```

### 16. Age restricted dead end - (onboarding)/age-restricted

```text
A polite dead-end screen with no way forward and no back chevron - a terminal
state. Centred vertically: a large muted flat vector illustration of a small
closed door or a calendar page, drawn in soft desaturated greys with only a
faint hint of the accent colour, deliberately gentle and non-punitive rather
than alarming. Below it a bold centred heading "We'll see you in a few years"
and two lines of muted body copy reading "You need to be 18 or over to use
this app. Thanks for your interest." No primary button anywhere, no continue,
no retry, no progress bar. A single small grey text link at the very bottom
reads "Contact support". Lots of empty space. No tab bar.
```

### 17. Gender - onboarding step 3 of 7

```text
An onboarding wizard step. A segmented progress bar showing three of seven
segments filled, with a back chevron. Large bold heading "How do you
describe yourself?" Below, a vertical list of five full-width selectable rows
with generous height and rounded corners: "Woman", "Man", "Non-binary",
"Let me type it", "Prefer not to say". The third row is selected, filled with
a soft accent tint and a small accent check circle on its right; the others are
plain with hairline borders. Beneath the list, separated by a hairline divider,
a settings-style toggle row reads "Show on my profile" with a small grey
sub-caption "Others will see this" and an iOS toggle switch in the on position
in the accent colour. A full-width rounded accent primary button reads
"Continue". No tab bar.
```

### 18. Avatar picker - onboarding step 4 of 7

```text
An onboarding wizard step. A segmented progress bar showing four of seven
segments filled, with a back chevron. Bold heading "Pick your avatar" and a
muted subheading "No photos here - just pick one that feels like you". Below,
a large circular preview of the currently chosen flat vector illustrated avatar
on a soft pastel circle, centred. Beneath it, a scrollable four-column grid of
about twenty small circular preset illustrated avatars, each a different
stylised geometric character on its own pastel background tint, diverse in skin
tone, hair and accessories, all drawn in one consistent flat vector style. One
grid item is selected, ringed with a 3px accent border and a small check badge.
CRITICAL: there is NO camera tile, NO upload button, NO plus tile, NO photo
library option anywhere in the grid - every option is a preset illustration.
A full-width rounded accent primary button reads "Continue". No tab bar.
```

### 19. Bio - onboarding step 6 of 7

```text
An onboarding wizard step. A segmented progress bar showing six of seven
segments filled, with a back chevron. Large bold heading "Tell people a bit
about you" and a muted subheading "What would you say to someone new?". Below,
a tall rounded multiline text area with a soft tinted fill containing two lines
of plausible written bio text about weekend hiking and bad cooking, with a
visible cursor. A right-aligned small grey character counter beneath it reads
"112/300". Under that, a small grey label "Need a hand?" followed by three
tappable suggestion chips reading "A perfect Sunday...", "I'm looking for...",
"Ask me about...". A full-width rounded accent primary button reads "Continue"
and a small grey "Skip for now" text link sits beneath it. No tab bar.
```

### 20. Location primer - onboarding step 7 of 7

```text
An onboarding wizard step that primes a permission BEFORE any system dialog
appears - this is the app's own screen, not an OS alert. A segmented progress
bar showing seven of seven segments filled, with a back chevron. Centred: a
large flat vector illustration of a stylised map pin over a simple abstract
street grid with two small illustrated avatars nearby, in soft pastels with an
accent-coloured pin. Below it a bold centred heading "Who's nearby?" and two
lines of muted body copy reading "We use your location to show people close to
you. We never show your exact position - only rough distance." A full-width
rounded accent primary button reads "Allow location". Beneath it a full-width
plain secondary button reads "Not now", and below that a small grey text link
reads "Enter my city instead". CRITICAL: no iOS or Android system permission
alert is visible anywhere on this screen.
```

---

## Part 3 - Negative Block

Append to every prompt.

```text
Negative: photographs of people, photorealistic faces, stock photos, dating app
imagery, hearts as romantic symbols, flames, swipe-right romance cues, couples,
roses, pink-and-purple dating gradients, cluttered dense layouts, tiny
unreadable text, gibberish or lorem ipsum text, garbled letterforms, watermarks,
logos, brand names, device bezels, hands holding a phone, mockup shadows,
isometric or angled perspective, 3D renders, skeuomorphism, heavy drop shadows,
neon glow, dark UI (unless requested), video call screens, camera icons, photo
upload buttons, image galleries.
```

---

## Part 3b - Auth and onboarding negative addendum

Append this to the main Negative Block for screens 11 to 20.

```text
Also negative: social login buttons, Continue with Google, Continue with Apple,
Continue with Facebook, sign in with email, password fields, forgot password
links, username fields, captcha, camera icons, photo upload tiles, plus-tile
add-photo buttons, photo library grids, face scan or selfie verification,
profile photo cropping, progress rings around photos, iOS or Android system
permission alert dialogs, keyboard emoji rows, autocomplete dropdowns,
onboarding screens showing more than one question at once.
```

---

## Part 4 - Variants to run

**Dark mode** - swap the Style Block palette line for:

```text
Palette: near-black warm background (#141210), off-white text (#F5F2ED),
elevated surfaces one step lighter (#211E1A), same accent at slightly higher
luminance.
```

Generate screens 2, 5 and 6 at minimum. `PLAN.md` requires both themes from
day one.

**Android parity** - append:

```text
Material 3 rendering: 28px fully-rounded corners, filled tonal buttons,
Material Symbols icons, a Material top app bar and a Material navigation bar.
```

**Palette direction B** - if coral reads too dating-app:

```text
Palette: sage green accent #6B8F71 with warm sand neutrals.
```

Deliberately unromantic; reads as outdoorsy and communal.

**Palette direction C:**

```text
Palette: indigo-blue accent #4F5BD5 with cool paper neutrals.
```

Calmer and more utility; reads as a community app rather than a discovery app.

---

## Constraints carried over from PLAN.md

| Constraint | Why it is in the prompts |
|---|---|
| No photos, anywhere | Illustrated preset avatars only - the defining visual constraint |
| No romance framing | Negative block bans dating-app visual language outright |
| Product name out of copy | Negative block bans logos and brand names (A1) |
| Light and dark from day one | Part 4 dark-mode variant |
| 4 tabs: Home / Match / Chat / Profile | Tab bar described identically in every screen block |
| Ads are inert placeholders | Screens 1 and 4 show bordered "Ad" rectangles, no ad creative |
| Premium gates | Screen 8 padlocks, screen 9 paywall |
| Distance in km (A2) | "2 km away", "25 km" throughout |
| 44x44 minimum targets (A10) | Stated in the Style Block |
