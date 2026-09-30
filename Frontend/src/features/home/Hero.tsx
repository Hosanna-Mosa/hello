import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/config/site";
import { SwipeDeck } from "@/features/home/deck/SwipeDeck";
import { FloatingChips, HeroBlobs } from "@/features/home/HeroBackdrop";
import { RotatingWord } from "@/features/home/RotatingWord";

const AVATARS = [
  "bg-secondary-soft text-secondary-deep",
  "bg-primary-soft text-primary-deep",
  "bg-info-soft text-info",
  "bg-warning-soft text-warning",
];

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden">
      <HeroBlobs />
      <Container className="grid items-center gap-16 py-14 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary-soft px-3 py-1 text-sm font-semibold text-secondary-deep">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-secondary" />
                <span className="relative inline-flex size-2 rounded-full bg-secondary" />
              </span>
              Friendship only · {site.minimumAge}+
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Meet people nearby who love <span className="sr-only">what you love.</span>
              <RotatingWord />
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">
              {site.appName} matches you with people close by, based on shared interests — for coffee, hikes, game nights and
              everything in between. No photos, no swiping on looks. Just good company.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={site.playStoreUrl} variant="primary" size="lg" icon={<Icon name="smartphone" size={18} />}>
                Get it on Google Play
              </ButtonLink>
              <ButtonLink to="/safety" size="lg">
                How we keep you safe
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {AVATARS.map((a, i) => (
                  <span
                    key={a}
                    className={`grid size-9 animate-pop-in place-items-center rounded-full border-2 border-canvas text-sm font-bold ${a}`}
                    style={{ animationDelay: `${600 + i * 120}ms` }}
                  >
                    {"AMKZ"[i]}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted">Real people, real plans — matched on interests, not looks.</p>
            </div>
          </Reveal>
        </div>

        <Reveal from="zoom" delay={250} className="relative">
          <FloatingChips />
          <SwipeDeck />
        </Reveal>
      </Container>
    </div>
  );
}
