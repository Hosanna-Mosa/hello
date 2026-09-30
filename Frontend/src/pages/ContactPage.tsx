import { PageHero } from "@/components/legal/PageHero";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/config/site";
import { ContactOption } from "@/features/contact/ContactOption";
import { FAQS } from "@/features/contact/contactContent";
import { FaqList } from "@/features/contact/FaqList";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ContactPage() {
  usePageTitle("Help & support");

  return (
    <>
      <PageHero
        eyebrow="Support"
        title="How can we help?"
        summary="Find a quick answer below, or write to us — include the phone number on your account so we can find it."
      />
      <Section>
        <Container className="grid gap-6 md:grid-cols-3">
          <ContactOption icon="help" title="General support" body="Problems signing in, bugs, or questions about how something works." email={site.supportEmail} />
          <ContactOption icon="lock" title="Privacy & your data" body="Access, correct or delete your personal data, or ask about our Privacy Policy." email={site.privacyEmail} />
          <ContactOption icon="shield" title="Safety & child safety" body="Report a safety concern or anything involving a minor. Prioritised above everything else." email={site.safetyEmail} />
        </Container>
      </Section>
      <Section tone="surface">
        <Container width="narrow">
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <FaqList items={FAQS} />
        </Container>
      </Section>
    </>
  );
}
