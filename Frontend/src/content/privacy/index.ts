import { site } from "@/config/site";
import { privacyCollection } from "@/content/privacy/collection";
import { privacyHandling } from "@/content/privacy/handling";
import type { ContentDoc } from "@/types/content";

export const privacyPolicy: ContentDoc = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  summary: `What ${site.appName} collects, why, who can see it, how long we keep it — and how to delete it. Written to be read, not skimmed past.`,
  sections: [...privacyCollection, ...privacyHandling],
};
