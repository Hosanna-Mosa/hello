import { Link } from "react-router";

import { Reveal } from "@/components/motion/Reveal";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconBadge } from "@/components/ui/IconBadge";

const LINKS: { to: string; title: string; body: string; icon: IconName }[] = [
  { to: "/privacy-policy", title: "Privacy Policy", body: "What we collect, why, and your choices.", icon: "lock" },
  { to: "/terms", title: "Terms & Conditions", body: "The agreement for using the app.", icon: "file" },
  { to: "/community-guidelines", title: "Community Guidelines", body: "The rules that keep it friendly.", icon: "users" },
  { to: "/child-safety", title: "Child Safety Standards", body: "Our zero-tolerance CSAE policy.", icon: "shield" },
  { to: "/delete-account", title: "Delete your account", body: "In the app or on the web.", icon: "trash" },
  { to: "/contact", title: "Help & support", body: "Get in touch with a person.", icon: "help" },
];

/** Every policy page, one tap from the home page. */
export function PolicyLinks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LINKS.map((l, i) => (
        <Reveal key={l.to} delay={(i % 3) * 90} className="h-full">
          <Link to={l.to} className="group block h-full rounded-card">
            <Card className="flex h-full items-center gap-4 transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-pop">
              <IconBadge icon={l.icon} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{l.title}</p>
                <p className="text-sm text-muted">{l.body}</p>
              </div>
              <Icon name="arrowRight" className="shrink-0 text-faint transition duration-300 group-hover:translate-x-1 group-hover:text-primary" />
            </Card>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
