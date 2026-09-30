import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const WORDS = ["hiking", "board games", "coffee", "live music", "bouldering", "what you love"];
const EVERY_MS = 2200;

/**
 * The headline's last line, cycling through interests. Visual only — the
 * heading carries the full sentence for screen readers.
 */
export function RotatingWord() {
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const word = reduced ? WORDS[WORDS.length - 1] : WORDS[i];

  return (
    <span aria-hidden="true" className="block [perspective:800px]">
      {/* Animate a wrapper: Chrome drops clipped gradient text on the animated element itself. */}
      <span key={word} className="inline-block animate-word-in">
        <span className="bg-gradient-to-r from-primary via-primary-hover to-secondary bg-clip-text pb-2 text-transparent">{word}.</span>
      </span>
    </span>
  );
}
