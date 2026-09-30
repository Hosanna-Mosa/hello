/** An endless ribbon of things people do together. Pauses on hover. */

const MOMENTS = [
  "☕ Coffee walks",
  "🎲 Game nights",
  "🥾 Sunrise hikes",
  "📚 Book clubs",
  "🎸 Open mics",
  "🧗 Bouldering",
  "🍜 Food crawls",
  "📷 Photo walks",
  "🏸 Badminton",
  "🎨 Sketch meetups",
  "🎬 Movie marathons",
  "🧘 Park yoga",
];

export function Marquee() {
  return (
    <div className="group relative overflow-hidden border-y border-line bg-surface py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <p className="sr-only">Things people plan together: {MOMENTS.join(", ")}.</p>
      <div aria-hidden="true" className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {[...MOMENTS, ...MOMENTS].map((m, i) => (
          <span
            key={i}
            className="mr-3 rounded-full border border-line bg-canvas px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink transition hover:border-primary hover:bg-primary-soft"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
