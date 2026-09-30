/**
 * Child Safety Standards — the published CSAE policy Google Play requires of
 * social and dating-category apps, with a named point of contact.
 */

import { site } from "@/config/site";
import type { ContentDoc } from "@/types/content";

export const childSafety: ContentDoc = {
  eyebrow: "Safety",
  title: "Child Safety Standards",
  summary: `${site.appName} has zero tolerance for child sexual abuse and exploitation (CSAE). This page sets out our standards, how to report, and how we respond.`,
  sections: [
    {
      id: "zero-tolerance",
      title: "Our standard",
      blocks: [
        {
          type: "p",
          text: `${site.appName} is for adults aged ${site.minimumAge}+ only. We prohibit any content or behaviour that sexualises, grooms, exploits or endangers children, including child sexual abuse material (CSAM), sexual or suggestive content involving anyone under 18, attempts to contact or meet a minor, and sextortion.`,
        },
      ],
    },
    {
      id: "prevention",
      title: "How we keep minors off the app",
      blocks: [
        {
          type: "list",
          items: [
            `Every member must give a birthday at sign-up. Anyone under ${site.minimumAge} is stopped and cannot create an account.`,
            "Discovery filters never show anyone under 18, whatever filters are set.",
            "The app has no photos or image uploads, which removes the most common route for sharing abusive imagery.",
            "Messaging is only possible between people who have matched, which limits unsolicited contact.",
          ],
        },
      ],
    },
    {
      id: "reporting",
      title: "How to report",
      blocks: [
        {
          type: "steps",
          items: [
            "In the app, open the person's profile or your conversation with them and tap Report.",
            "Choose \"They appear to be under 18\" (or the reason that fits), add any details, and submit. You can block them at the same time.",
            `Or email our child-safety contact directly at ${site.safetyEmail} — include the person's name as shown in the app and what happened.`,
          ],
        },
        {
          type: "note",
          tone: "warning",
          text: "If a child is in immediate danger, contact your local police or emergency services first.",
        },
      ],
    },
    {
      id: "response",
      title: "How we respond",
      blocks: [
        {
          type: "list",
          items: [
            "Reports involving minors or CSAE are prioritised above all others.",
            "Accounts found to belong to a minor are removed.",
            "Accounts that engage in CSAE are permanently banned, and we preserve the relevant evidence.",
            "We report apparent child sexual abuse material and exploitation to the relevant national authorities and law enforcement, as required by applicable law, and cooperate fully with their investigations.",
          ],
        },
      ],
    },
    {
      id: "compliance",
      title: "Compliance",
      blocks: [
        {
          type: "p",
          text: "We comply with applicable child-safety laws and regulations in every country where the app is available, and with Google Play's Child Safety Standards policy.",
        },
      ],
    },
    {
      id: "contact",
      title: "Child-safety point of contact",
      blocks: [
        {
          type: "p",
          text: `Our designated point of contact for child-safety matters can be reached at ${site.safetyEmail}. This contact is able to speak to our CSAM prevention practices and compliance.`,
        },
      ],
    },
  ],
};
