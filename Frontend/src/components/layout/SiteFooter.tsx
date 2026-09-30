import { FooterColumn } from "@/components/layout/FooterColumn";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { LEGAL_LINKS, site } from "@/config/site";

const HELP_LINKS = [
  { to: "/safety", label: "Safety centre" },
  { to: "/contact", label: "Help & support" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Meet people nearby who share your interests. Friendship only — for adults {site.minimumAge}+.
          </p>
          <a href={`mailto:${site.supportEmail}`} className="mt-3 inline-block text-sm font-medium text-primary-deep hover:underline">
            {site.supportEmail}
          </a>
        </div>
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
        <FooterColumn title="Help" links={HELP_LINKS} />
      </Container>
      <Container className="border-t border-line py-6 text-xs text-muted">
        © {new Date().getFullYear()} {site.company}. All rights reserved.
      </Container>
    </footer>
  );
}
