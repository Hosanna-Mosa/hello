import { SiteNavLink } from "@/components/layout/SiteNavLink";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { NAV_LINKS, site } from "@/config/site";

/** The same links as the desktop nav, stacked. Only rendered below `md`. */
export function MobileMenu({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  if (!open) return null;

  return (
    <div className="border-t border-line bg-surface md:hidden">
      <Container className="flex flex-col gap-1 py-4">
        <nav aria-label="Mobile" className="flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <SiteNavLink key={l.to} {...l} block onNavigate={onNavigate} />
          ))}
          <SiteNavLink to="/delete-account" label="Delete account" block onNavigate={onNavigate} />
        </nav>
        <ButtonLink href={site.playStoreUrl} variant="primary" className="mt-3 w-full">
          Get the app
        </ButtonLink>
      </Container>
    </div>
  );
}
