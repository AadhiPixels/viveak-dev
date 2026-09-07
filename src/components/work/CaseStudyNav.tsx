import Link from "next/link";
import type { CaseStudy } from "@/content/types";
import { ArrowRight } from "@/components/ui/Icons";
import { ArrowLink } from "@/components/ui/ArrowLink";

function Neighbour({
  study,
  direction,
}: {
  study?: CaseStudy;
  direction: "previous" | "next";
}) {
  const isNext = direction === "next";
  if (!study) {
    return <div aria-hidden="true" className="hidden md:block" />;
  }
  return (
    <div className={isNext ? "md:text-right" : ""}>
      <p className="eyebrow">{isNext ? "Next" : "Previous"}</p>
      <Link
        href={`/work/${study.slug}`}
        className={`group mt-4 flex items-start gap-3 text-lumen transition-colors hover:text-signal ${
          isNext ? "md:flex-row-reverse" : ""
        }`}
      >
        <span className="mt-[0.45em] shrink-0 text-silver-2 transition-colors group-hover:text-signal">
          <ArrowRight className={isNext ? "" : "rotate-180"} />
        </span>
        <span className="min-w-0">
          <span className="mono-label block text-silver-2">
            {study.client}
            {study.via ? ` · ${study.via}` : ""}
          </span>
          <span className="t-display-s mt-1.5 block">{study.headline}</span>
        </span>
      </Link>
    </div>
  );
}

/** Previous and next case study, plus the route back to the index. */
export function CaseStudyNav({ previous, next }: { previous?: CaseStudy; next?: CaseStudy }) {
  return (
    <nav aria-label="Other case studies" className="container-x pb-24 md:pb-32">
      <div className="border-t border-line pt-10 md:pt-12">
        <ArrowLink href="/work" className="mono-label uppercase tracking-[0.14em] text-silver-2 hover:text-lumen">
          All work
        </ArrowLink>
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-x-16">
          <Neighbour study={previous} direction="previous" />
          <Neighbour study={next} direction="next" />
        </div>
      </div>
    </nav>
  );
}
