import { ContentBlockView } from "@/components/legal/ContentBlockView";
import { Card } from "@/components/ui/Card";
import { IconBadge } from "@/components/ui/IconBadge";
import { site } from "@/config/site";

const STEPS = [
  `Open ${site.appName} and go to the Profile tab.`,
  "Tap the gear icon to open Settings.",
  "Scroll down and tap Delete account.",
  "Tell us why you're leaving (optional), then type DELETE to confirm.",
];

export function InAppSteps() {
  return (
    <Card className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <IconBadge icon="smartphone" />
        <div>
          <h2 className="text-xl font-bold text-ink">Delete in the app</h2>
          <p className="text-sm text-muted">The quickest way, if you still have it installed.</p>
        </div>
      </div>
      <ContentBlockView block={{ type: "steps", items: STEPS }} />
    </Card>
  );
}
