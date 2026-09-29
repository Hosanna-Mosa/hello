import appConfig from "../../app.json";

/**
 * Every user-facing string.
 *
 * Two rules hold across this whole file, and both are product decisions rather
 * than style preferences:
 *
 * 1. **No product name.** "Hello" is a placeholder (A1). Nothing here says it,
 *    so renaming the app is `app.json` plus nothing else.
 * 2. **Nothing romantic.** This is a platonic friendship product (PLAN §1). No
 *    "matches" framed as dates, no hearts-as-romance, no "looking for someone
 *    special". Copy is where that positioning leaks first, so it is guarded
 *    here rather than screen by screen.
 *
 * Keeping it in one module means i18n is additive later (A3), not a sweep.
 */

/**
 * The app version, straight from `app.json`.
 *
 * Kept here rather than typed into a string so the Legal screen cannot claim a
 * version the build does not have. `resolveJsonModule` is on by default under
 * `expo/tsconfig.base`, and Metro imports JSON natively.
 */
export const APP_VERSION: string = (appConfig as { expo: { version: string } }).expo.version;

export const copy = {
  common: {
    continue: "Continue",
    back: "Back",
    cancel: "Cancel",
    save: "Save",
    done: "Done",
    skip: "Skip for now",
    notNow: "Not now",
    retry: "Try again",
    settings: "Open Settings",
    delete: "Delete",
    remove: "Remove",
    search: "Search",
    reset: "Reset",
  },

  tabs: {
    home: "Home",
    // PLAN §1 locks this as "Match"; the design system says "Discover".
    match: "Match",
    chat: "Chat",
    profile: "Profile",
  },

  auth: {
    welcomeTitle: "Meet people who actually get you",
    welcomeSubtitle: "Real friendships, near you.",
    welcomeCta: "Continue with phone",
    // Slides 2 and 3 of the value carousel. Platonic throughout — this is the
    // first copy anyone reads, so it sets the positioning.
    welcomeSlide2Title: "Built around what you're into",
    welcomeSlide2Subtitle: "Interests and a few honest lines, not a highlight reel.",
    welcomeSlide3Title: "No photos, no pressure",
    welcomeSlide3Subtitle: "Pick an avatar and let the conversation do the work.",
    legal: "By continuing you agree to our Terms and Privacy Policy.",

    phoneTitle: "What's your number?",
    phoneSubtitle: "We'll text you a code. Standard rates apply.",
    phonePrivacy: "We never show your number to anyone.",
    phoneCta: "Send code",
    phoneInvalid: "Enter a valid phone number",

    otpTitle: "Enter the code",
    otpSubtitle: (number: string) => `Sent to ${number}`,
    otpChange: "Change",
    otpResendIn: (seconds: number) => `Resend code in 0:${String(seconds).padStart(2, "0")}`,
    otpResend: "Resend code",
    otpInvalid: "Enter the 6-digit code",

    emailLink: "Log in with email",
    emailTitle: "Log in with email",
    emailSubtitle: "Use the email and password you were given.",
    emailLabel: "Email",
    passwordLabel: "Password",
    emailCta: "Log in",
    emailInvalid: "That email or password isn't right.",
  },

  onboarding: {
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,

    nameQuestion: "What should we call you?",
    nameHint: "This is how you'll appear to others.",
    namePermanent: "You can't change this later.",

    birthdayQuestion: "When's your birthday?",
    birthdayHint: "You must be 18 or over to use this app.",
    birthdayAge: (age: number) => `You'll be ${age}`,

    // The 18+ dead end. Gentle on purpose — a rejected 17-year-old is a
    // future user, not an adversary.
    restrictedTitle: "We'll see you in a few years",
    restrictedBody: "You need to be 18 or over to use this app. Thanks for your interest.",
    restrictedSupport: "Contact support",

    genderQuestion: "How do you describe yourself?",
    genderWoman: "Woman",
    genderMan: "Man",
    genderNonBinary: "Non-binary",
    genderSelfDescribe: "Let me type it",
    genderPreferNot: "Prefer not to say",
    genderShowToggle: "Show on my profile",
    genderShowHint: "Others will see this.",

    avatarQuestion: "Pick your avatar",
    // Says the quiet part out loud — people expect to upload a photo here.
    avatarHint: "No photos here — just pick one that feels like you.",

    interestsQuestion: "What are you into?",
    interestsHint: "Pick at least 3.",
    interestsRemaining: (n: number) => `Pick ${n} more`,

    bioQuestion: "Tell people a bit about you",
    bioHint: "What would you say to someone new?",
    bioPrompts: ["A perfect Sunday…", "I'm looking for…", "Ask me about…"],

    locationQuestion: "Who's nearby?",
    locationBody:
      "We use your location to show people close to you. We never show your exact position — only rough distance.",
    locationAllow: "Allow location",
    locationManual: "Enter my city instead",
    locationBlocked:
      "Location is turned off for this app. You can turn it back on in Settings, or enter your city instead.",
  },

  home: {
    title: "Nearby",
    subtitle: "Meet amazing people around you",
    /** Shown in the location chip when no city is known. */
    locationUnknown: "Nearby",
    searchPlaceholder: "Search by name",
    emptyTitle: "No people nearby right now",
    emptyBody: "Expand your search or check back later to find new people.",
    emptyCta: "Adjust filters",
    emptyRetry: "Try again",
    searchEmptyTitle: "No one by that name",
    searchEmptyBody: "Check the spelling, or try a shorter search.",
    likesTitle: "Likes you",
    likesEmptyTitle: "No likes yet",
    likesEmptyBody: "Keep your profile fresh and check back soon.",
    likesBlurredCta: "See who likes you",
    notificationsTitle: "Activity",
    notificationsEmptyTitle: "Nothing yet",
    notificationsEmptyBody: "Likes, matches and messages will show up here.",
    notificationsDisabled:
      "Notifications are off, so you won't hear about new matches until you open the app.",
  },

  filters: {
    title: "Filters",
    distance: "Distance",
    distanceValue: (km: number) => `${km} km`,
    age: "Age",
    ageValue: (min: number, max: number) => `${min} – ${max}`,
    interests: "Interests",
    activeRecently: "Online now only",
    location: "Location",
    locationValue: (km: number) => `Within ${km} km`,
    ageAny: "Any",
    show: "Show",
    allGenders: "All genders",
    apply2: "Apply filters",
    interestsAny: "Any",
    premiumTag: "Premium",
    liveCount: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
    apply: (n: number) => `Show ${n} ${n === 1 ? "person" : "people"}`,
  },

  deck: {
    title: "Match",
    like: "Like",
    pass: "Pass",
    note: "Send a note",
    noteTitle: "Say something",
    noteHint: "A note makes it much more likely they'll say yes.",
    notePlaceholder: "What made you stop on their profile?",
    emptyTitle: "You're all caught up",
    emptyBody: "Widen your filters to see more people.",
    emptyCta: "Adjust filters",
    outOfLikesTitle: "You're out of likes for today",
    outOfLikesBody: (time: string) => `You'll get more at ${time}.`,
    // "Connect", not "Match" — the design's word, and a deliberate one:
    // "It's a Match!" reads as a dating app, which this is not.
    matchedTitle: "It's a Connect!",
    /** `name` omitted when the partner cannot be resolved — still reads properly. */
    matchedBody: (name?: string) =>
      name ? `You and ${name} both liked each other.` : "You both liked each other.",
    matchedCta: "Send a message",
    matchedLater: "Keep swiping",
  },

  chat: {
    title: "Chats",
    segmentMessages: "Messages",
    segmentRequests: "Requests",
    newMatches: "New matches",
    composerPlaceholder: "Message",
    // Voice messages.
    voiceRecord: "Record a voice message",
    voiceStopAndSend: "Stop and send voice message",
    voiceRecording: "Recording… please speak",
    voiceTapToSend: "Tap the mic to send",
    voiceCancel: "Discard recording",
    voiceTooShort: "Too short — record for at least a second.",
    voiceMicDenied: "Allow microphone access in Settings to send voice messages.",
    voiceMicFailed: "Couldn't start the microphone. Try again.",
    voicePlay: "Play voice message",
    voicePause: "Pause voice message",
    voiceMessage: "Voice message",
    voiceLabel: (mine: boolean, duration: string) =>
      `${mine ? "Your" : "Their"} voice message, ${duration}`,
    voiceFailed: "Couldn't send that voice message.",
    /** The server's own reason, so a screenshot of the failure says what failed. */
    voiceFailedBecause: (reason: string) => `Couldn't send that voice message. ${reason}`,
    accept: "Accept",
    decline: "Decline",
    emptyThreadsTitle: "No conversations yet",
    emptyThreadsBody: "When you match with someone, you'll find them here.",
    emptyRequestsTitle: "No requests",
    emptyRequestsBody: "Notes people send with a like will show up here.",
    emptyMessagesTitle: "Say something",
    emptyMessagesBody: "You matched — someone has to go first.",
    unmatchedByThem: "This person is no longer available.",
    unmatchTitle: (name: string) => `Unmatch ${name}?`,
    unmatchBody: "This can't be undone. Your conversation will be deleted for both of you.",
    unmatchConfirm: "Unmatch",
    mute: "Mute notifications",
    unmute: "Unmute notifications",
  },

  calls: {
    ringing: "Ringing…",
    connecting: "Connecting…",
    ended: "Call ended",
    /** The detail is the network diagnosis — kept visible while calls are being tested. */
    failed: (detail: string) => `Couldn't connect\n${detail}`,
    incoming: "Incoming call",
    mute: "Mute",
    speaker: "Speaker",
    end: "End",
    accept: "Accept",
    decline: "Decline",
    systemRecord: (duration: string) => `Voice call · ${duration}`,
    /** The strip over every other screen while a call runs. */
    barOngoing: (name: string, status: string) => (name ? `${name} · ${status}` : status),
    barReturn: "Tap to return to call",
  },

  profile: {
    title: "Profile",
    edit: "Edit profile",
    /**
     * Only ever shown on a MATCHED person's profile — messaging is
     * match-gated, so on a stranger's profile this action does not exist.
     */
    message: "Message",
    about: "About me",
    interests: "Interests",
    complete: (percent: number) => `${percent}% complete`,
    premiumBadge: "Premium",
    bioPlaceholder: "Add a few lines about yourself.",
    /*
     * The design's stat row reads "24 Friends · 56 Likes · 8 Connections".
     * Two of those are the same number under different names and none of them
     * is a thing this product counts, so the row shows the two figures that
     * are real. See parking log.
     */
    statMatches: "Matches",
    statLikes: "Likes",
    addBio: "Add a bio",
    addInterests: "Add interests",
    completeHint: "A fuller profile gets more replies.",
    preferences: "Preferences",
    helpAndSupport: "Help & support",
  },

  settings: {
    title: "Settings",
    account: "Account",
    discovery: "Discovery",
    notifications: "Notifications",
    blocked: "Blocked people",
    safety: "Safety",
    help: "Help",
    legal: "Legal",
    subscription: "Subscription",
    showMe: "Show me on app",
    showMeHint: "Turn this off to hide your profile from everyone.",
    logout: "Log out",
    logoutTitle: "Log out?",
    logoutBody: "You'll need your phone number to sign back in.",
    deleteAccount: "Delete account",
    deleteTitle: "Delete your account?",
    deleteBody:
      "This removes your profile, your matches and every conversation. It cannot be undone.",
    deleteConfirmPrompt: "Type DELETE to confirm",
    blockedEmpty: "You haven't blocked anyone.",
    unblock: "Unblock",
    version: (version: string) => `Version ${version}`,

    phone: "Phone number",
    signInMethod: "Sign-in method",
    signInMethodValue: "Phone number",
    memberSince: "Member since",
    accountHint: "Your number is never shown to anyone.",

    distance: "Maximum distance",
    ageRange: "Age range",
    discoveryHint: "These also set the filters on Home and Match.",
    visible: "Visible",
    hidden: "Hidden",

    appearance: "Appearance",
    darkMode: "Dark mode",
    darkModeHint: "On by default. Turn it off for the light theme.",

    notificationsHint: "Choose what's worth interrupting you for.",
    channelNewMatches: "New matches",
    channelMessages: "Messages",
    channelMessageRequests: "Message requests",
    channelLikes: "Likes",
    channelCalls: "Calls",

    helpBrowse: "Browse help topics",
    helpContact: "Contact support",
    helpContactHint: "We usually reply within a day.",

    terms: "Terms of service",
    privacy: "Privacy policy",
    licences: "Open-source licences",

    deleteReasonPrompt: "Why are you leaving?",
    deleteReasons: [
      "I found the people I was looking for",
      "I'm not using it enough",
      "I had a bad experience",
      "Privacy concerns",
      "Something else",
    ],
    deleteConsequences: [
      "Your profile disappears from everyone's app.",
      "Every match and conversation is deleted for both sides.",
      "Nothing can be restored, and the same number starts fresh.",
    ],
    deleteConfirmWord: "DELETE",
    deleteFinal: "Delete my account",
  },

  notifications: {
    primerTitle: "Don't leave them waiting",
    primerBody:
      "We'll let you know when someone replies or a new match comes in. Nothing else.",
    primerAccept: "Turn on notifications",
    primerDecline: "Not now",
    primerHint: "You can change this any time in Settings.",
    unknownActor: "Someone",
  },

  safety: {
    reportTitle: "Report",
    reportHint: "What happened? This is anonymous.",
    reportDetails: "Anything else we should know?",
    reportSubmit: "Submit report",
    reportedTitle: "Thanks for telling us",
    reportedBody: "We'll review this. You won't hear back, but it does get looked at.",
    alsoBlock: "Also block this person",
    blockTitle: (name: string) => `Block ${name}?`,
    blockBody: "They won't be able to find you or message you, and you won't see them again.",
    blockConfirm: "Block",
    title: "Your safety matters",
    acknowledge: "Got it",
    /* The four standards cards from the design. */
    standards: [
      {
        title: "Be kind",
        body: "Kind and genuine conversations only.",
      },
      {
        title: "No fake profiles",
        body: "We remove spam and fake accounts.",
      },
      {
        title: "Report anytime",
        body: "Telling us keeps this place worth being in.",
      },
      {
        title: "Community guidelines",
        body: "Read the full guidelines.",
      },
    ],
    tipsTitle: "Meeting someone new",
    tips: [
      "Meet somewhere public the first time.",
      "Tell a friend where you're going.",
      "Keep chats in the app until you're comfortable.",
      "Nobody should be asking you for money. Report it if they do.",
    ],
  },

  premium: {
    title: "Make more friends",
    subtitle: "A few things that make it easier.",
    benefitNoAds: "No ads",
    benefitLikes: "See who likes you",
    benefitUnlimited: "Unlimited likes",
    benefitFilters: "Advanced filters",
    cta: "Continue",
    restore: "Restore Purchases",
    bestValue: "Best value",
    removeAds: "Remove ads",
    // R13: the real terms line is required before this can ship.
    terms: "Placeholder pricing. No purchase is made in this build.",
    lockedFilter: "Premium",
    freePlan: "Free",
    premiumPlan: "Premium",
    manage: "Manage subscription",
    devToggle: "Premium (demo)",
    devToggleHint: "Flips the tier without a purchase. Dev builds only.",
    likesLeft: (count: number) => `${count} likes left today`,
    unlimitedLikes: "Unlimited likes",
    seeWhoLikesYou: "See who likes you",
    sentNote: "Sent a note",
    blurredHint: (count: number) =>
      count === 1 ? "1 person likes you" : `${count} people like you`,
    unlockCta: "Unlock",
    restoring: "Checking…",
  },

  errors: {
    genericTitle: "Something went wrong",
    genericBody: "Check your connection and try again.",
    networkBody: "You appear to be offline.",
    notFoundTitle: "Not found",
    notFoundBody: "That page doesn't exist.",
    rateLimited: "Slow down a moment, then try again.",
  },

  ads: {
    label: "Ad",
    removeAds: "Remove ads",
  },
} as const;

export type Copy = typeof copy;
