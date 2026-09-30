/**
 * The hero's playable demo: a stack of sample profiles you can drag or tap
 * through, mirroring the app's discovery deck. Saying hello to a "mutual"
 * profile plays the match moment. Loops forever.
 */

import { useCallback, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { MatchOverlay } from "@/features/home/deck/MatchOverlay";
import { PROFILES, type SampleProfile } from "@/features/home/deck/profiles";
import { SwipeCard } from "@/features/home/deck/SwipeCard";
import { useSwipeGesture, type Direction } from "@/features/home/deck/useSwipeGesture";
import { cn } from "@/lib/cn";

const DEPTHS = [2, 1, 0];
// The modulo keeps the index in range, so the lookup always hits.
const at = (i: number): SampleProfile => PROFILES[i % PROFILES.length]!;

export function SwipeDeck() {
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<SampleProfile | null>(null);
  const [touched, setTouched] = useState(false);
  const [hellos, setHellos] = useState(0);

  const decide = useCallback(
    (dir: Direction) => {
      const profile = at(index);
      setIndex((i) => i + 1);
      if (dir === "right") {
        setHellos((n) => n + 1);
        if (profile.mutual) setMatch(profile);
      }
    },
    [index],
  );
  const closeMatch = useCallback(() => setMatch(null), []);
  const { bind, style, dragX, fling } = useSwipeGesture(decide);

  const choose = (dir: Direction) => {
    setTouched(true);
    fling(dir);
  };

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-primary-soft via-canvas to-secondary-soft" />

      <div className={cn("relative h-[26rem]", !touched && "animate-nudge")} onPointerDown={() => setTouched(true)}>
        {DEPTHS.map((depth) => {
          const i = index + depth;
          const top = depth === 0;
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={
                top
                  ? { ...style, zIndex: 3 }
                  : { transform: `translateY(${depth * 16}px) scale(${1 - depth * 0.05})`, transition: "transform 0.4s var(--ease-soft)", zIndex: 3 - depth }
              }
              {...(top ? bind : {})}
              aria-hidden={!top}
            >
              <SwipeCard profile={at(i)} dragX={top ? dragX : 0} />
            </div>
          );
        })}
        {match && <MatchOverlay profile={match} onClose={closeMatch} />}
      </div>

      <div className="mt-10 flex items-center justify-center gap-5">
        <DeckButton label={`Pass on ${at(index).name}`} onClick={() => choose("left")} className="size-14 bg-surface text-danger">
          <Icon name="close" size={24} />
        </DeckButton>
        <DeckButton label={`Say hello to ${at(index).name}`} onClick={() => choose("right")} className="size-18 border-primary bg-primary text-on-primary">
          <Icon name="heart" size={30} className="fill-current" />
        </DeckButton>
        <DeckButton label="Send a note" onClick={() => choose("right")} className="size-14 bg-surface text-secondary-deep">
          <Icon name="message" size={22} />
        </DeckButton>
      </div>
      <p className="mt-4 text-center text-xs text-faint" aria-live="polite">
        {hellos ? `${hellos} hello${hellos > 1 ? "s" : ""} sent · sample profiles` : "Drag the card or tap a button — sample profiles"}
      </p>
    </div>
  );
}

type ButtonProps = { label: string; onClick: () => void; className: string; children: ReactNode };

function DeckButton({ label, onClick, className, children }: ButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-full border border-line shadow-card transition duration-200",
        "hover:-translate-y-1 hover:scale-110 hover:shadow-pop active:scale-95",
        className,
      )}
    >
      {children}
    </button>
  );
}
