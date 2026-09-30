/** Privacy Policy, part 1 — who we are and what we collect. */

import { site } from "@/config/site";
import type { ContentSection } from "@/types/content";

export const privacyCollection: ContentSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    blocks: [
      {
        type: "p",
        text: `${site.appName} is a mobile app for adults to meet people nearby who share their interests — for friendship only. The app is operated by ${site.company} ("we", "us"). This policy explains what personal data the app collects, why, who can see it, how long we keep it, and the choices you have.`,
      },
      {
        type: "p",
        text: `This policy applies to the ${site.appName} Android app (${site.androidPackage}) and to this website. If you have any question about it, contact us at ${site.privacyEmail}.`,
      },
    ],
  },
  {
    id: "what-we-collect",
    title: "Information we collect",
    blocks: [
      { type: "p", text: "We only collect what the app needs to work. Here is everything, grouped by where it comes from." },
      {
        type: "table",
        head: ["Data", "What exactly", "Why"],
        rows: [
          ["Phone number", "The number you sign in with", "To create your account and sign you in with a one-time SMS code. It is never shown to other users."],
          ["Profile", "First name, birthday, gender, chosen avatar, interests, bio", "To build the profile other members see. Others see your age, not your birthday. You can hide your gender."],
          ["Location", "Your device's location while you use the app", "To show people nearby and the approximate distance to them. Your exact location is never shown to anyone."],
          ["Messages", "Text messages, voice messages, emoji reactions, likes and notes", "To deliver your conversations to the people you're talking to."],
          ["Call records", "Who called whom, when, how long, and whether it was answered", "To show call history in a conversation. Call audio is never recorded."],
          ["Safety data", "People you block, reports you file or that are filed about you", "To keep members safe and enforce our Community Guidelines."],
          ["Device & security", "Device type, app version, time zone, a one-way hash of your IP address, sign-in sessions", "To keep your account secure, prevent abuse, and show times in your time zone."],
        ],
      },
      {
        type: "note",
        text: `${site.appName} has no photos anywhere. You choose a preset avatar; we never ask for, upload or store pictures of you, and the app does not use your camera.`,
      },
    ],
  },
  {
    id: "permissions",
    title: "Device permissions",
    blocks: [
      { type: "p", text: "The app asks for a permission only when you use the feature that needs it. You can change any of these in your phone's settings at any time." },
      {
        type: "list",
        items: [
          "Location — to find people near you. Without it, discovery cannot show nearby members.",
          "Microphone — only while you record a voice message or are on a voice call. We never listen in the background.",
          "Notifications — to tell you about new matches, messages and calls. You can choose which ones in Settings → Notifications.",
        ],
      },
    ],
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    blocks: [
      {
        type: "list",
        items: [
          "To create and secure your account, and sign you in.",
          "To show your profile to people nearby and show you theirs, filtered by the distance, age and interests you choose.",
          "To deliver messages, voice messages and calls between people who have matched.",
          "To detect and act on spam, fraud, harassment and other breaches of our rules, including reviewing reports.",
          "To answer you when you contact support.",
          "To meet legal obligations, such as responding to a valid request from law enforcement.",
        ],
      },
      { type: "p", text: "We do not sell your personal data. We do not use it for targeted advertising, and the app contains no third-party advertising or analytics SDKs." },
    ],
  },
  {
    id: "who-can-see",
    title: "What other members can see",
    blocks: [
      {
        type: "list",
        items: [
          "Your first name, age, avatar, interests, bio and — unless you hide it — your gender.",
          "Your approximate distance from them (for example \"3 km away\"), never your exact location.",
          "Whether you were active recently.",
          "Your messages and voice messages, only to the person you sent them to.",
        ],
      },
      { type: "p", text: "Your phone number, birthday and exact location are never shown to other members. You can hide your profile from discovery entirely in Settings → Show me on app." },
    ],
  },
];
