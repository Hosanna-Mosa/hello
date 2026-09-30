/** Terms & Conditions. */

import { site } from "@/config/site";
import type { ContentDoc } from "@/types/content";

export const terms: ContentDoc = {
  eyebrow: "Legal",
  title: "Terms & Conditions",
  summary: `The agreement between you and ${site.company} when you use ${site.appName}. By creating an account you accept these terms.`,
  sections: [
    {
      id: "eligibility",
      title: "Who can use the app",
      blocks: [
        {
          type: "list",
          items: [
            `You must be at least ${site.minimumAge} years old.`,
            "You must be allowed to use the service under the laws where you live.",
            "You must not have been removed from the app before for breaking these terms.",
            "One person, one account. The account is personal to you and may not be shared, sold or transferred.",
          ],
        },
      ],
    },
    {
      id: "purpose",
      title: "What the app is for",
      blocks: [
        {
          type: "p",
          text: `${site.appName} is for making friends — platonic connections only. It is not a dating service. Romantic or sexual advances are against our Community Guidelines and can be reported.`,
        },
      ],
    },
    {
      id: "account",
      title: "Your account",
      blocks: [
        {
          type: "p",
          text: "You sign in with your phone number and a one-time code. Keep your phone secure: anyone who can receive your codes can sign in as you. Tell us straight away if you think someone else has accessed your account.",
        },
        { type: "p", text: "Everything in your profile must be true and about you. Impersonating someone else is not allowed." },
      ],
    },
    {
      id: "conduct",
      title: "Rules of conduct",
      blocks: [
        { type: "p", text: "You agree not to:" },
        {
          type: "list",
          items: [
            "Harass, threaten, bully, stalk or intimidate anyone.",
            "Post or send sexual content, or make romantic or sexual advances.",
            "Post hate speech or content that promotes violence or discrimination.",
            "Involve, contact or endanger anyone under 18 in any way.",
            "Send spam, advertise, solicit money, or run scams.",
            "Use the app for any illegal purpose, or to sell goods or services.",
            "Scrape, copy, reverse-engineer or disrupt the app or its servers, or create accounts by automated means.",
          ],
        },
        { type: "p", text: "The full rules, with examples, are in our Community Guidelines, which form part of these terms." },
      ],
    },
    {
      id: "content",
      title: "Your content",
      blocks: [
        {
          type: "p",
          text: "You own what you write and record. By posting it you give us a limited, worldwide, non-exclusive licence to host, store and display it only as needed to run the app — for example, to deliver your message to the person you sent it to. The licence ends when the content is deleted.",
        },
        { type: "p", text: "You are responsible for what you post. We may remove content that breaks these terms." },
      ],
    },
    {
      id: "safety",
      title: "Safety, reports and moderation",
      blocks: [
        {
          type: "p",
          text: "You can block or report any member from their profile or your conversation with them. We review reports and may warn, restrict, suspend or permanently remove accounts that break these terms. We may preserve evidence and share it with law enforcement where the law requires or someone's safety is at risk.",
        },
        {
          type: "note",
          tone: "warning",
          text: "Take care when meeting anyone in person: meet in a public place, tell a friend where you are going, and arrange your own transport. We do not run background checks on members.",
        },
      ],
    },
    {
      id: "paid",
      title: "Paid features",
      blocks: [
        {
          type: "p",
          text: "Some features may require a paid subscription. Purchases are made through Google Play and are governed by Google Play's terms, including its refund policy. Subscriptions renew automatically until you cancel them in Google Play. Prices are shown in the app before you buy.",
        },
      ],
    },
    {
      id: "ending",
      title: "Ending your account",
      blocks: [
        {
          type: "p",
          text: `You can stop using the app and delete your account at any time (see our Delete Account page). We may suspend or close your account if you break these terms or if we have to by law. Sections that by their nature should survive — such as content licences already used, disclaimers and limits of liability — survive the end of this agreement.`,
        },
      ],
    },
    {
      id: "disclaimers",
      title: "Disclaimers and liability",
      blocks: [
        {
          type: "p",
          text: "The app is provided \"as is\". We work hard to keep it available and safe, but we cannot promise it will always be uninterrupted or error-free, and we are not responsible for how other members behave, online or offline.",
        },
        {
          type: "p",
          text: "To the fullest extent the law allows, we are not liable for indirect or consequential losses. Nothing in these terms limits liability that cannot be limited by law, and nothing affects your statutory rights as a consumer.",
        },
      ],
    },
    {
      id: "law",
      title: "Governing law and changes",
      blocks: [
        { type: "p", text: `These terms are governed by the laws of ${site.governingLaw}, without affecting any mandatory consumer protection where you live.` },
        { type: "p", text: "We may update these terms. If a change is significant we will tell you in the app before it takes effect; continuing to use the app after that means you accept the new terms." },
      ],
    },
  ],
};
