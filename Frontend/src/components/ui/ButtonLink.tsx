/**
 * A link that looks exactly like <Button>. `to` routes inside the site; `href`
 * leaves it (opened safely in a new tab).
 */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/cn";

type Common = { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode; className?: string; children: ReactNode };
type Props = Common & ({ to: string; href?: never } | { href: string; to?: never });

export function ButtonLink({ variant = "secondary", size = "md", icon, className, children, ...target }: Props) {
  const classes = cn(buttonClass(variant, size), className);

  if (target.href !== undefined) {
    const external = /^https?:/.test(target.href);
    return (
      <a href={target.href} className={classes} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <Link to={target.to} className={classes}>
      {icon}
      {children}
    </Link>
  );
}
