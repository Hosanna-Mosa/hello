import { site } from "@/config/site";
import type { Faq } from "@/features/contact/FaqList";

export const FAQS: Faq[] = [
  {
    q: `Is ${site.appName} a dating app?`,
    a: "No. It's for making friends only. Romantic or flirty advances are against our Community Guidelines and can be reported.",
  },
  {
    q: "Why can't I upload photos?",
    a: "By design. Profiles use a chosen avatar, interests and a bio, so people connect over what they enjoy rather than how they look — and it keeps everyone safer.",
  },
  {
    q: "I didn't get my sign-in code.",
    a: "Check the number and country code, wait 30 seconds, then tap resend. Codes expire after 5 minutes. If it still doesn't arrive, email support with your number.",
  },
  {
    q: "Who can see my location?",
    a: "Nobody sees your exact location. Other members see only an approximate distance, like \"3 km away\".",
  },
  {
    q: "How do I hide my profile without deleting my account?",
    a: "Go to Profile → Settings and turn off \"Show me on app\". You'll disappear from discovery until you turn it back on.",
  },
  {
    q: "How do I delete my account?",
    a: `In the app: Profile → Settings → Delete account. Or use our Delete Account page on this website. You have ${site.deletionGraceDays} days to change your mind by signing in again.`,
  },
];
