import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/config/site";
import { ChatDemo } from "@/features/home/chat/ChatDemo";
import { CtaBand } from "@/features/home/CtaBand";
import { FeatureGrid } from "@/features/home/FeatureGrid";
import { Hero } from "@/features/home/Hero";
import { HOW_IT_WORKS, SAFETY_POINTS } from "@/features/home/homeContent";
import { InterestMatcher } from "@/features/home/matcher/InterestMatcher";
import { Marquee } from "@/features/home/Marquee";
import { PolicyLinks } from "@/features/home/PolicyLinks";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function HomePage() {
  usePageTitle(site.tagline);

  return (
    <>
      <ScrollProgress />
      <Hero />
      <Marquee />
      <Section>
        <Container>
          <SectionHeading eyebrow="How it works" title="From shared interest to real friendship" center />
          <FeatureGrid features={HOW_IT_WORKS} />
        </Container>
      </Section>
      <Section tone="surface" className="overflow-hidden">
        <Container>
          <ChatDemo />
        </Container>
      </Section>
      <Section className="overflow-hidden">
        <Container>
          <InterestMatcher />
        </Container>
      </Section>
      <Section tone="soft">
        <Container>
          <SectionHeading
            eyebrow="Safety first"
            title="Built to feel safe from the first hello"
            description="Friendship only, adults only, and tools that put you in charge of who can reach you."
          />
          <FeatureGrid features={SAFETY_POINTS} />
        </Container>
      </Section>
      <Section>
        <Container>
          <CtaBand />
        </Container>
      </Section>
      <Section tone="surface">
        <Container>
          <SectionHeading eyebrow="Transparency" title="Policies & your data" description="Everything about how the app works, in plain words." />
          <PolicyLinks />
        </Container>
      </Section>
    </>
  );
}
