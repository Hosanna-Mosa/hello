/** Privacy Policy, part 2 — sharing, retention, security and your rights. */

import { site } from "@/config/site";
import type { ContentSection } from "@/types/content";

export const privacyHandling: ContentSection[] = [
  {
    id: "sharing",
    title: "When we share information",
    blocks: [
      { type: "p", text: "We share personal data only in these cases:" },
      {
        type: "list",
        items: [
          "Service providers who run parts of the service for us under contract — cloud hosting and database providers, and the SMS provider that delivers your sign-in code. They may only use the data to provide that service to us.",
          "Payments — if you buy a subscription, Google Play processes the payment. We never receive your card details.",
          "Legal reasons — when required by law, or when we believe in good faith it is necessary to protect someone's safety, including reporting child sexual abuse material to the relevant authorities.",
          "Business transfer — if the service is sold or merged, your data moves with it under this same policy, and we will tell you first.",
        ],
      },
    ],
  },
  {
    id: "retention",
    title: "How long we keep it",
    blocks: [
      {
        type: "table",
        head: ["Data", "Kept for"],
        rows: [
          ["Account and profile", "Until you delete your account. It is then removed from the app immediately, and a copy is kept in a restricted archive for safety, fraud-prevention and legal purposes"],
          ["Messages and voice messages", "Until the conversation ends (unmatch or block) or your account is erased"],
          ["Call records", "Until the conversation ends or your account is erased"],
          ["Sign-in codes", "5 minutes"],
          ["Sign-in sessions", "Up to 30 days, or until you log out"],
          ["Reports about safety", "As long as needed to protect members and meet legal obligations, even after an account is erased"],
        ],
      },
    ],
  },
  {
    id: "deletion",
    title: "Deleting your account",
    blocks: [
      {
        type: "p",
        text: "You can delete your account at any time — in the app under Profile → Settings → Delete account, or on our Delete Account page. Deletion is immediate: your profile, matches and conversations are removed from the app, you are signed out everywhere, and your account cannot be restored. Your phone number and email are freed, so signing up again creates a completely new account. When an account is deleted, a copy of your account data is kept in a restricted archive for safety, fraud-prevention and legal purposes; it is never shown to other members and cannot be used to sign in.",
      },
    ],
  },
  {
    id: "security",
    title: "How we protect it",
    blocks: [
      {
        type: "list",
        items: [
          "All traffic between the app and our servers is encrypted in transit (HTTPS/TLS).",
          "Phone numbers are looked up by a keyed one-way hash, and IP addresses are stored only as a hash.",
          "Voice call audio travels encrypted between devices and is never recorded or stored.",
          "Access to production data is limited to authorised staff, and protected by individual credentials.",
        ],
      },
      { type: "p", text: "No system is perfectly secure. If we learn of a breach that affects your data, we will tell you and the relevant authorities as the law requires." },
    ],
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    blocks: [
      { type: "p", text: "Depending on where you live, you may have the right to:" },
      {
        type: "list",
        items: [
          "Access the personal data we hold about you and receive a copy.",
          "Correct it — most of your profile can be edited directly in the app.",
          "Delete it — see Deleting your account above.",
          "Object to or restrict some processing, and withdraw consent (for example, by turning off location or notifications).",
          "Complain to your local data-protection authority.",
        ],
      },
      { type: "p", text: `To use any of these rights, email ${site.privacyEmail} from a message that includes the phone number on your account. We may ask you to confirm it is you before acting.` },
    ],
  },
  {
    id: "children",
    title: "Children",
    blocks: [
      {
        type: "p",
        text: `${site.appName} is only for adults aged ${site.minimumAge} or over. We do not knowingly collect data from anyone under ${site.minimumAge}. Sign-up stops anyone who enters a birthday under ${site.minimumAge}. If you believe a minor is using the app, report them in the app or email ${site.safetyEmail} and we will remove the account.`,
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    blocks: [
      { type: "p", text: "If we change this policy, we will update the effective date above. If a change is significant, we will tell you in the app before it takes effect." },
    ],
  },
];
