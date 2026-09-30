import { ContentBlockView } from "@/components/legal/ContentBlockView";
import { PageHero } from "@/components/legal/PageHero";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/config/site";
import { FeatureGrid } from "@/features/home/FeatureGrid";
import { SAFETY_POINTS } from "@/features/home/homeContent";
import { MEETING_TIPS, REPORT_STEPS } from "@/features/safety/safetyContent";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SafetyPage() {
  usePageTitle("Safety centre");

  return (
    <>
      <PageHero
        eyebrow="Safety centre"
        title="Your safety comes first"
        summary={`${site.appName} is friendship-only and adults-only, with reporting and blocking built into every profile and conversation.`}
      />
      <Section>
        <Container>
          <FeatureGrid features={SAFETY_POINTS} />
        </Container>
      </Section>
      <Section tone="surface">
        <Container className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col gap-5 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">How to report or block someone</h2>
            <ContentBlockView block={{ type: "steps", items: REPORT_STEPS }} />
          </Card>
          <Card className="flex flex-col gap-5 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">Meeting in person</h2>
            <ContentBlockView block={{ type: "list", items: MEETING_TIPS }} />
          </Card>
        </Container>
      </Section>
      <Section>
        <Container width="narrow" className="flex flex-col gap-6">
          <SectionHeading title="Read the rules" description="Our Community Guidelines and Child Safety Standards explain exactly what isn't allowed and how we respond." />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/community-guidelines" variant="primary">Community Guidelines</ButtonLink>
            <ButtonLink to="/child-safety">Child Safety Standards</ButtonLink>
          </div>
          <Alert tone="warning" title="In immediate danger?">
            Contact your local police or emergency services first. Then report the person in the app so we can act too.
          </Alert>
        </Container>
      </Section>
    </>
  );
}
