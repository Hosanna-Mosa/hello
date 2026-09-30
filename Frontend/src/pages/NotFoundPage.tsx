import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NotFoundPage() {
  usePageTitle("Page not found");

  return (
    <Section>
      <Container width="narrow" className="py-10 text-center">
        <p className="text-6xl font-extrabold text-primary">404</p>
        <h1 className="mt-4 text-3xl font-bold text-ink">This page doesn't exist</h1>
        <p className="mt-3 text-muted">The link may be old, or the address may have a typo.</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink to="/" variant="primary">
            Go home
          </ButtonLink>
          <ButtonLink to="/contact">Get help</ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
