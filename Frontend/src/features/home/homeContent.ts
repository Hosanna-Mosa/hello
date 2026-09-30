import type { Feature } from "@/features/home/FeatureGrid";

export const HOW_IT_WORKS: Feature[] = [
  { icon: "sparkle", title: "Pick your interests", body: "Choose an avatar, your interests and a short bio. That's your whole profile — no photos needed." },
  { icon: "pin", title: "See who's nearby", body: "Browse people close to you who share what you're into, filtered by distance, age and interests." },
  { icon: "heart", title: "Say hello", body: "Like someone, or add a note so they know why. When it's mutual, you match." },
  { icon: "message", title: "Chat and call", body: "Message, send voice notes, react with emoji, or start a voice call once you've matched." },
  { icon: "lock", title: "Match-only messaging", body: "Nobody can message you unless you've matched or you accept their note. Your inbox stays yours." },
  { icon: "eyeOff", title: "You're in control", body: "Hide your gender, hide your profile from discovery, or pause notifications — any time." },
];

export const SAFETY_POINTS: Feature[] = [
  { icon: "shield", title: "Adults only", body: "Every member confirms they're 18 or over at sign-up. Under-18s can't create an account.", tone: "secondary" },
  { icon: "flag", title: "Report in two taps", body: "Report anyone from their profile or your chat. Reports are confidential and reviewed by people.", tone: "secondary" },
  { icon: "ban", title: "Block instantly", body: "Blocked people can't see you or message you, and your conversation with them ends.", tone: "secondary" },
];
