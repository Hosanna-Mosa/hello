import { useEffect } from "react";

import { HeartBurst } from "@/components/motion/HeartBurst";
import { buttonClass } from "@/components/ui/buttonStyles";
import { Icon } from "@/components/ui/Icon";
import type { SampleProfile } from "@/features/home/deck/profiles";
import { cn } from "@/lib/cn";

const AUTO_CLOSE_MS = 3600;

/** The "it's a match" moment: two avatars meet, hearts burst. Closes itself. */
export function MatchOverlay({ profile, onClose }: { profile: SampleProfile; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-20 grid animate-pop-in place-items-center overflow-hidden rounded-[2rem] bg-ink/85 p-6 text-center backdrop-blur-sm"
    >
      <HeartBurst />
      <div className="relative">
        <p className="animate-word-in text-4xl font-extrabold tracking-tight text-on-primary">It&apos;s a match!</p>
        <p className="mt-2 text-sm text-on-primary/80">You and {profile.name} both said hello.</p>

        <div className="mt-7 flex justify-center">
          <span className="grid size-20 animate-slide-l place-items-center rounded-full border-4 border-ink bg-primary text-xl font-bold text-on-primary">
            You
          </span>
          <span className="z-10 -mx-3 grid size-9 animate-pop-in place-items-center self-center rounded-full bg-surface text-primary [animation-delay:450ms]">
            <Icon name="heart" size={18} className="fill-current" />
          </span>
          <span className={cn("grid size-20 animate-slide-r place-items-center rounded-full border-4 border-ink text-2xl font-bold", profile.avatar)}>
            {profile.name[0]}
          </span>
        </div>

        <button type="button" onClick={onClose} className={cn(buttonClass("primary", "md"), "mt-8")}>
          <Icon name="message" size={16} /> Send a message
        </button>
      </div>
    </div>
  );
}
