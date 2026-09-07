import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "./Icons";

export function ArrowLink({
  href,
  children,
  className = "",
  external = false,
  ...rest
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
} & Omit<React.ComponentProps<typeof Link>, "href" | "children">) {
  const Icon = external ? ArrowUpRight : ArrowRight;
  if (external) {
    return (
      <a href={href} className={`link-arrow ${className}`} target="_blank" rel="noopener noreferrer">
        <span>{children}</span>
        <Icon />
      </a>
    );
  }
  return (
    <Link href={href} className={`link-arrow ${className}`} {...rest}>
      <span>{children}</span>
      <Icon />
    </Link>
  );
}
