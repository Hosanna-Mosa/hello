import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/config/site";

/** Hearts drifting up the band: [left %, delay s, size px]. */
const HEARTS: [number, number, number][] = [
  [6, 0, 18],
  [18, 2.5, 26],
  [31, 5, 14],
  [46, 1.2, 22],
  [60, 3.8, 16],
  [73, 0.6, 28],
  [86, 4.4, 20],
  [94, 2, 14],
];

export function CtaBand() {
  return (
    <Reveal from="zoom">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary via-primary-deep to-secondary-deep bg-[length:200%_200%] px-6 py-16 text-center shadow-pop animate-gradient sm:px-12 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          {HEARTS.map(([left, delay, size]) => (
            <span key={left} className="absolute -bottom-8 animate-rise text-on-primary/35" style={{ left: `${left}%`, animationDelay: `${delay}s` }}>
              <Icon name="heart" size={size} className="fill-current" />
            </span>
          ))}
        </div>
        <h2 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-on-primary sm:text-5xl">
          Your next best friend might be two streets away.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-on-primary/85">
          Download {site.appName}, pick a few interests and say hello. Setting up takes about a minute.
        </p>
        <div className="mt-9 flex justify-center">
          <ButtonLink href={site.playStoreUrl} size="lg" icon={<Icon name="smartphone" size={18} />} className="shadow-pop">
            Get it on Google Play
          </ButtonLink>
        </div>
      </div>
    </Reveal>
  );
}
