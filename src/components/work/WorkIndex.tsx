import Link from "next/link";
import type { CaseStudy } from "@/content/types";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { StackLabels } from "./StackLabels";

/**
 * Numbered editorial index of the case studies. One full-width row per
 * programme, separated by hairlines: attribution on the left, the headline,
 * supported outcome, ownership and stack on the right.
 */
export function WorkIndex({ items }: { items: CaseStudy[] }) {
  return (
    <ol className="border-t border-line">
      {items.map((cs, i) => {
        const href = `/work/${cs.slug}`;
        const headingId = `work-${cs.slug}`;
        return (
          <li key={cs.slug} className="border-b border-line">
            <article
              aria-labelledby={headingId}
              className="grid gap-y-7 py-12 md:py-16 lg:grid-cols-12 lg:gap-x-10 lg:py-20"
            >
              <div className="flex gap-5 lg:col-span-3 lg:block">
                <span className="mono-label pt-1 text-silver-2 tabular-nums lg:pt-0" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="lg:mt-6">
                  <p className="text-[1.05rem] font-medium leading-snug text-lumen">
                    {cs.client}
                    {cs.via ? <span className="font-normal text-silver-2"> · {cs.via}</span> : null}
                  </p>
                  <p className="mono-label mt-2 text-silver-2">{cs.role}</p>
                  <p className="mono-label mt-1 text-silver-2">{cs.period}</p>
                </div>
              </div>

              <div className="lg:col-span-8 lg:col-start-5">
                <h2 id={headingId} className="t-display-m text-lumen">
                  <Link href={href} className="transition-colors hover:text-signal">
                    {cs.headline}
                  </Link>
                </h2>
                <dl className="mt-7 grid gap-x-8 gap-y-2 md:grid-cols-[10.5rem_minmax(0,1fr)] md:gap-y-5">
                  <dt className="eyebrow md:pt-[0.45em]">Supported outcome</dt>
                  <dd className="t-lead text-silver">{cs.outcome}</dd>
                  <dt className="eyebrow mt-3 md:mt-0 md:pt-[0.35em]">Ownership</dt>
                  <dd className="t-body max-w-[64ch] text-silver-2">{cs.ownership}</dd>
                </dl>
                <StackLabels items={cs.stack} className="mt-7" />
                <ArrowLink href={href} className="mt-8">
                  Read the case study
                </ArrowLink>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
