import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

/**
 * Opening block of a dedicated page: quiet mono eyebrow, one large headline,
 * an optional lead paragraph and any actions. Sits inside a dark chapter and
 * clears the fixed header.
 */
export function PageHeader({
  eyebrow,
  title,
  titleId = "page-title",
  titleClassName = "max-w-[15ch]",
  lead,
  children,
  className = "",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  titleId?: string;
  /** Measure override for the headline, e.g. a wider `max-w-[18ch]`. */
  titleClassName?: string;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`container-x pt-28 pb-14 md:pt-40 md:pb-20 ${className}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 id={titleId} className={`t-display-l mt-6 text-lumen ${titleClassName}`}>
        {title}
      </h1>
      {lead ? <p className="t-lead mt-8 max-w-[56ch] text-silver">{lead}</p> : null}
      {children}
    </div>
  );
}
