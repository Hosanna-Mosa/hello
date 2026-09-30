import { Icon } from "@/components/ui/Icon";
import type { ChatLine } from "@/features/home/chat/chatScript";
import { cn } from "@/lib/cn";

const BARS = [0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8, 1, 0.55, 0.75, 0.45, 0.9, 0.6, 0.35];

export function ChatBubble({ line }: { line: ChatLine }) {
  if (line.kind === "event") {
    return (
      <p className="mx-auto animate-pop-in rounded-full bg-secondary-soft px-3 py-1 text-center text-xs font-semibold text-secondary-deep">
        {line.text}
      </p>
    );
  }

  const mine = line.from === "me";
  return (
    <div className={cn("relative max-w-[80%] animate-bubble-in", mine ? "self-end" : "self-start", "reaction" in line && line.reaction && "mb-3")}>
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-sm leading-snug",
          mine ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md bg-sunken text-ink",
        )}
      >
        {line.kind === "text" ? line.text : <VoiceNote seconds={line.seconds} />}
      </div>
      {"reaction" in line && line.reaction && (
        <span
          className={cn(
            "absolute -bottom-3 grid size-6 animate-pop-in place-items-center rounded-full border border-line bg-surface text-xs shadow-card [animation-delay:700ms]",
            mine ? "left-2" : "right-2",
          )}
        >
          {line.reaction}
        </span>
      )}
    </div>
  );
}

function VoiceNote({ seconds }: { seconds: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-7 place-items-center rounded-full bg-primary text-on-primary">
        <Icon name="play" size={12} className="fill-current" />
      </span>
      <span className="flex h-6 items-center gap-[3px]" aria-label="Voice note">
        {BARS.map((h, i) => (
          <span
            key={i}
            className="w-[3px] animate-wave rounded-full bg-primary-deep/70"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms` }}
          />
        ))}
      </span>
      <span className="text-xs text-muted">0:{String(seconds).padStart(2, "0")}</span>
    </span>
  );
}

export function TypingBubble({ mine }: { mine: boolean }) {
  return (
    <div
      aria-label="Typing"
      className={cn(
        "flex animate-bubble-in gap-1 rounded-2xl px-4 py-3.5",
        mine ? "self-end rounded-br-md bg-primary/80" : "self-start rounded-bl-md bg-sunken",
      )}
    >
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className={cn("size-2 animate-typing rounded-full", mine ? "bg-on-primary" : "bg-muted")}
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}
