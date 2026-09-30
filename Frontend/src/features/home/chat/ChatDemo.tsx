/** "From hello to plans": a phone playing a scripted chat whenever it's on screen. */

import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ChatBubble, TypingBubble } from "@/features/home/chat/ChatBubble";
import { CHAT } from "@/features/home/chat/chatScript";
import { useScriptPlayer } from "@/features/home/chat/useScriptPlayer";
import { useInView } from "@/hooks/useInView";

const POINTS = [
  { icon: "lock", text: "Match-only messaging — nobody can DM you out of the blue." },
  { icon: "mic", text: "Voice notes and emoji reactions, so it feels like talking." },
  { icon: "phone", text: "Hop on a voice call once you've both matched." },
] as const;

export function ChatDemo() {
  const [ref, inView] = useInView<HTMLDivElement>({ once: false, threshold: 0.35, rootMargin: "0px" });
  const { shown, typing } = useScriptPlayer(CHAT, inView);

  return (
    <div className="grid items-center gap-14 lg:grid-cols-2">
      <div>
        <SectionHeading
          eyebrow="From hello to plans"
          title="Break the ice in seconds"
          description="When it's mutual, the conversation opens up. Most plans start with a single message."
        />
        <div className="space-y-4">
          {POINTS.map((p, i) => (
            <Reveal key={p.text} delay={i * 120} from="left">
              <div className="group flex items-center gap-4 rounded-card border border-line bg-canvas p-4 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-deep transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon name={p.icon} size={18} />
                </span>
                <span className="text-sm font-medium text-ink">{p.text}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal from="right">
        <div ref={ref} className="relative mx-auto w-full max-w-[22rem]">
          <div className="absolute -inset-6 -z-10 animate-blob rounded-full bg-secondary/15 blur-2xl" />
          <div className="overflow-hidden rounded-[2.75rem] border-[10px] border-ink bg-surface shadow-pop">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="relative grid size-10 place-items-center rounded-full bg-info-soft font-bold text-info">
                M
                <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-surface bg-success" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">Meera</p>
                <p className="text-xs text-success">{typing === "them" ? "typing…" : "Online"}</p>
              </div>
              <Icon name="phone" size={18} className="text-muted" />
            </div>

            <div className="flex h-[25rem] flex-col justify-end gap-2.5 overflow-hidden bg-canvas px-3 py-4" aria-live="polite">
              {CHAT.slice(0, shown).map((line, i) => (
                <ChatBubble key={i} line={line} />
              ))}
              {typing && <TypingBubble mine={typing === "me"} />}
            </div>

            <div className="flex items-center gap-2 border-t border-line px-3 py-3">
              <span className="flex h-10 flex-1 items-center rounded-full bg-sunken px-4 text-sm text-faint">Message…</span>
              <span className="grid size-10 place-items-center rounded-full bg-primary text-on-primary">
                <Icon name="mic" size={18} />
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
