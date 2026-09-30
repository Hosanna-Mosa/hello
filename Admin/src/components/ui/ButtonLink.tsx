/** A router link that looks exactly like <Button>. */

import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/cn";

type Props = LinkProps & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function ButtonLink({ variant = "secondary", size = "md", icon, className, children, ...rest }: Props) {
  return (
    <Link className={cn(buttonClass(variant, size), className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
