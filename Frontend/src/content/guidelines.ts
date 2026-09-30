/** Community Guidelines — the rules, in plain words. Part of the Terms. */

import { site } from "@/config/site";
import type { ContentDoc } from "@/types/content";

export const guidelines: ContentDoc = {
  eyebrow: "Community",
  title: "Community Guidelines",
  summary: `${site.appName} works because people are kind to each other. These rules apply to profiles, messages, voice messages and calls.`,
  sections: [
    {
      id: "friends-only",
      title: "Friendship only",
      blocks: [
        {
          type: "p",
          text: "This is a place to find friends. Flirting, romantic or sexual advances, and requests for dates are not allowed — even if they seem harmless. \"Romantic or flirty advance\" is a report reason of its own.",
        },
      ],
    },
    {
      id: "be-respectful",
      title: "Be respectful",
      blocks: [
        {
          type: "list",
          items: [
            "No harassment, bullying, threats or intimidation.",
            "No hate speech or attacks based on race, ethnicity, religion, disability, gender, sexual orientation or any other identity.",
            "If someone doesn't reply or asks you to stop, stop.",
          ],
        },
      ],
    },
    {
      id: "be-real",
      title: "Be real",
      blocks: [
        {
          type: "list",
          items: [
            "Use your own first name and your real age.",
            "Don't impersonate anyone or create fake or duplicate accounts.",
            `You must be ${site.minimumAge} or over. Report anyone who appears to be younger.`,
          ],
        },
      ],
    },
    {
      id: "keep-it-safe",
      title: "Keep it safe and legal",
      blocks: [
        {
          type: "list",
          items: [
            "No sexual or explicit content of any kind.",
            "No content that sexualises or endangers minors — see our Child Safety Standards.",
            "No promoting violence, self-harm, drugs or illegal activity.",
            "No spam, advertising, selling, asking for money, or scams.",
            "Don't share anyone's personal information without their permission.",
          ],
        },
      ],
    },
    {
      id: "report-block",
      title: "Report and block",
      blocks: [
        {
          type: "steps",
          items: [
            "Open the person's profile or your conversation with them.",
            "Tap Report, choose a reason and add any details that help us understand.",
            "Choose to block them too. Once blocked, neither of you can see or message the other.",
          ],
        },
        { type: "p", text: "Reports are confidential — the person is never told who reported them." },
      ],
    },
    {
      id: "enforcement",
      title: "What happens if rules are broken",
      blocks: [
        {
          type: "p",
          text: "Depending on how serious it is, we may remove content, warn the member, restrict features, or suspend or permanently ban the account. Serious harm, and anything involving minors, can be reported to law enforcement.",
        },
      ],
    },
  ],
};
