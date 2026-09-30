import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { MobileMenu } from "@/components/layout/MobileMenu";
import { SiteNavLink } from "@/components/layout/SiteNavLink";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { NAV_LINKS, site } from "@/config/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4 sm:h-18">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <SiteNavLink key={l.to} {...l} />
          ))}
        </nav>
        <div className="hidden md:block">
          <ButtonLink href={site.playStoreUrl} variant="primary" size="sm">
            Get the app
          </ButtonLink>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          icon={<Icon name={open ? "close" : "menu"} />}
        />
      </Container>
      <MobileMenu open={open} onNavigate={() => setOpen(false)} />
    </header>
  );
}
